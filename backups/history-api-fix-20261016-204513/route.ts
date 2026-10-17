import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { groceryEvents } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EventInput = {
  itemName?: unknown;
  eventType?: unknown;
  quantity?: unknown;
  unit?: unknown;
  eventDate?: unknown;
  unitPrice?: unknown;
  notes?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authenticatedUid(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  const match = header?.match(/^Bearer\s+(.+)$/i);

  if (!match) return null;

  const decoded = await adminAuth.verifyIdToken(match[1]);
  return decoded.uid || null;
}

async function readBody(request: Request): Promise<EventInput | null> {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as EventInput;
  } catch {
    return null;
  }
}

function optionalText(
  value: unknown,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const result = value.trim();
  if (result.length > maxLength) return undefined;

  return result || null;
}

function positiveNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0 &&
    value <= 1_000_000_000
  );
}

function validEventDate(value: unknown): Date | null {
  if (typeof value !== "string" || value.length === 0) {
    return new Date();
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date(NaN);
  }

  // Prevent accidentally recording events far into the future.
  if (date.getTime() > Date.now() + 5 * 60 * 1000) {
    return new Date(NaN);
  }

  return date;
}

export async function GET(request: Request) {
  let uid: string | null;

  try {
    uid = await authenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired authentication token.", 401);
  }

  if (!uid) {
    return jsonError("Authentication required.", 401);
  }

  try {
    const events = await db
      .select()
      .from(groceryEvents)
      .where(eq(groceryEvents.ownerUid, uid))
      .orderBy(desc(groceryEvents.eventDate))
      .limit(500);

    return NextResponse.json({ events });
  } catch {
    return jsonError(
      "Unable to retrieve grocery history. Confirm that the database migration has been applied.",
      500,
    );
  }
}

export async function POST(request: Request) {
  let uid: string | null;

  try {
    uid = await authenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired authentication token.", 401);
  }

  if (!uid) {
    return jsonError("Authentication required.", 401);
  }

  const body = await readBody(request);

  if (!body) {
    return jsonError("Request body must be a valid JSON object.", 400);
  }

  const itemName = optionalText(body.itemName, 120);
  const unit = optionalText(body.unit, 30);
  const notes = optionalText(body.notes, 1000);
  const eventDate = validEventDate(body.eventDate);

  if (typeof itemName !== "string" || itemName.length === 0) {
    return jsonError("A valid item name is required.", 400);
  }

  if (
    typeof unit !== "string" ||
    unit.length === 0 ||
    (body.notes !== undefined && notes === undefined)
  ) {
    return jsonError("Unit or notes are invalid.", 400);
  }

  if (
    body.eventType !== "purchased" &&
    body.eventType !== "consumed"
  ) {
    return jsonError("Event type must be purchased or consumed.", 400);
  }

  if (!positiveNumber(body.quantity)) {
    return jsonError("Quantity must be a positive number.", 400);
  }

  if (Number.isNaN(eventDate.getTime())) {
    return jsonError("Event date is invalid or in the future.", 400);
  }

  let unitPrice: number | null = null;

  if (body.unitPrice !== undefined && body.unitPrice !== null && body.unitPrice !== "") {
    if (
      typeof body.unitPrice !== "number" ||
      !Number.isFinite(body.unitPrice) ||
      body.unitPrice < 0 ||
      body.unitPrice > 1_000_000_000
    ) {
      return jsonError("Unit price must be a non-negative number.", 400);
    }

    if (body.eventType === "consumed") {
      return jsonError("Unit price can only be recorded for purchases.", 400);
    }

    unitPrice = body.unitPrice;
  }

  try {
    const [event] = await db
      .insert(groceryEvents)
      .values({
        ownerUid: uid,
        itemName,
        eventType: body.eventType,
        quantity: String(body.quantity),
        unit,
        eventDate,
        unitPrice: unitPrice === null ? null : String(unitPrice),
        notes: notes ?? null,
      })
      .returning();

    return NextResponse.json({ event }, { status: 201 });
  } catch {
    return jsonError(
      "Unable to save grocery history. Confirm that the database migration has been applied.",
      500,
    );
  }
}
