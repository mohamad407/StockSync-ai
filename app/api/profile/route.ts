import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const authorization = request.headers.get("authorization");
    const match = authorization?.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      );
    }

    const decoded = await adminAuth.verifyIdToken(match[1]);

    if (!decoded.uid || !decoded.email) {
      return NextResponse.json(
        { error: "A verified account email is required." },
        { status: 403 },
      );
    }

    const displayName =
      typeof decoded.name === "string" ? decoded.name : null;

    const photoURL =
      typeof decoded.picture === "string" ? decoded.picture : null;

    await db
      .insert(users)
      .values({
        uid: decoded.uid,
        email: decoded.email,
        displayName,
        photoURL,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: decoded.email,
          displayName,
          photoURL,
          updatedAt: new Date(),
        },
      });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Unable to verify your session or synchronize your profile." },
      { status: 401 },
    );
  }
}
