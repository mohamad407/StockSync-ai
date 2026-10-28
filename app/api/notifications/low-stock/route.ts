import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";
import { sendBrevoEmail } from "@/lib/email/brevo";
import { buildLowStockEmail } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Emails the signed-in customer a summary of their low-stock items.
 * The recipient is always the verified email from the caller's own token,
 * so this route cannot be used to email anyone else.
 */
export async function POST(request: Request) {
  const match = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let decoded: Awaited<ReturnType<typeof adminAuth.verifyIdToken>>;

  try {
    decoded = await adminAuth.verifyIdToken(match[1]);
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired authentication token." },
      { status: 401 },
    );
  }

  if (!decoded.email) {
    return NextResponse.json(
      { error: "An email address is required to send this summary." },
      { status: 403 },
    );
  }

  let lowStock: {
    name: string;
    quantity: string;
    unit: string;
    lowStockThreshold: string;
  }[];

  try {
    const rows = await db
      .select({
        name: inventoryItems.name,
        quantity: inventoryItems.quantity,
        unit: inventoryItems.unit,
        lowStockThreshold: inventoryItems.lowStockThreshold,
      })
      .from(inventoryItems)
      .where(eq(inventoryItems.ownerUid, decoded.uid));

    lowStock = rows.filter((row) => {
      const quantity = Number(row.quantity);
      const threshold = Number(row.lowStockThreshold);
      return (
        Number.isFinite(quantity) &&
        Number.isFinite(threshold) &&
        quantity <= threshold
      );
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to read your inventory right now." },
      { status: 500 },
    );
  }

  if (lowStock.length === 0) {
    return NextResponse.json({
      ok: true,
      sent: false,
      message: "Nothing is running low right now, so no email was sent.",
    });
  }

  const recipientName = typeof decoded.name === "string" ? decoded.name : null;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || null;

  const content = buildLowStockEmail({
    recipientName,
    items: lowStock,
    appUrl,
  });

  try {
    const { messageId } = await sendBrevoEmail({
      to: { email: decoded.email, name: recipientName },
      subject: content.subject,
      html: content.html,
      text: content.text,
      tags: ["low-stock"],
    });

    return NextResponse.json({
      ok: true,
      sent: true,
      to: decoded.email,
      messageId,
    });
  } catch (error) {
    // Log only the status and a short reason; never log keys or the full payload.
    console.error(
      "Low-stock email failed:",
      error instanceof Error ? error.message : "unknown error",
    );

    return NextResponse.json(
      { error: "We couldn't send the email right now. Please try again shortly." },
      { status: 502 },
    );
  }
}
