import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { inventoryItems } from "@/lib/db/schema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type InventoryInput = {
  name?: unknown;
  category?: unknown;
  quantity?: unknown;
  unit?: unknown;
  lowStockThreshold?: unknown;
  expiryDate?: unknown;
  notes?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function getAuthenticatedUid(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  const decoded = await adminAuth.verifyIdToken(match[1]);
  return decoded.uid || null;
}

function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim();
  if (trimmed.length > maxLength) return undefined;

  return trimmed || null;
}

function validNumber(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1_000_000_000
  );
}

function validDate(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  // Accept a calendar date in YYYY-MM-DD form.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return undefined;
  }

  return date;
}

async function readJson(request: Request): Promise<InventoryInput | null> {
  try {
    const body: unknown = await request.json();

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return null;
    }

    return body as InventoryInput;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  let uid: string | null;

  try {
    uid = await getAuthenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired authentication token.", 401);
  }

  if (!uid) {
    return jsonError("Authentication required.", 401);
  }

  try {
    const items = await db
      .select()
      .from(inventoryItems)
      .where(eq(inventoryItems.ownerUid, uid))
      .orderBy(desc(inventoryItems.updatedAt));

    return NextResponse.json({ items });
  } catch {
    return jsonError("Unable to retrieve inventory.", 500);
  }
}

export async function POST(request: Request) {
  let uid: string | null;

  try {
    uid = await getAuthenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired authentication token.", 401);
  }

  if (!uid) {
    return jsonError("Authentication required.", 401);
  }

  const body = await readJson(request);

  if (!body) {
    return jsonError("Request body must be a valid JSON object.", 400);
  }

  const name = optionalText(body.name, 120);
  const category = optionalText(body.category, 80);
  const unit = optionalText(body.unit, 30);
  const notes = optionalText(body.notes, 1000);
  const expiryDate = validDate(body.expiryDate);

  if (typeof name !== "string" || name.length === 0) {
    return jsonError("A valid item name is required.", 400);
  }

  if (
    (body.category !== undefined && category === undefined) ||
    (body.unit !== undefined && (typeof unit !== "string" || unit.length === 0)) ||
    (body.notes !== undefined && notes === undefined) ||
    expiryDate === undefined
  ) {
    return jsonError("One or more text fields or the expiry date are invalid.", 400);
  }

  const quantity = body.quantity === undefined ? 0 : body.quantity;
  const threshold =
    body.lowStockThreshold === undefined ? 1 : body.lowStockThreshold;

  if (!validNumber(quantity) || !validNumber(threshold)) {
    return jsonError(
      "Quantity and low-stock threshold must be non-negative numbers.",
      400,
    );
  }

  try {
    const [item] = await db
      .insert(inventoryItems)
      .values({
        ownerUid: uid,
        householdId: null,
        name,
        category: category ?? null,
        quantity: String(quantity),
        unit: unit ?? "piece",
        lowStockThreshold: String(threshold),
        expiryDate: expiryDate ?? null,
        notes: notes ?? null,
      })
      .returning();

    return NextResponse.json({ item }, { status: 201 });
  } catch {
    return jsonError("Unable to save the inventory item.", 500);
  }
}

export async function PATCH(request: Request) {
  let uid: string | null;

  try {
    uid = await getAuthenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired authentication token.", 401);
  }

  if (!uid) {
    return jsonError("Authentication required.", 401);
  }

  const body = await readJson(request);

  if (!body) {
    return jsonError("Request body must be a valid JSON object.", 400);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return jsonError("A valid inventory item ID is required.", 400);
  }

  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    const value = optionalText(body.name, 120);
    if (typeof value !== "string" || value.length === 0) {
      return jsonError("Item name is invalid.", 400);
    }
    updates.name = value;
  }

  if (body.category !== undefined) {
    const value = optionalText(body.category, 80);
    if (value === undefined) return jsonError("Category is invalid.", 400);
    updates.category = value;
  }

  if (body.unit !== undefined) {
    const value = optionalText(body.unit, 30);
    if (typeof value !== "string" || value.length === 0) {
      return jsonError("Unit is invalid.", 400);
    }
    updates.unit = value;
  }

  if (body.notes !== undefined) {
    const value = optionalText(body.notes, 1000);
    if (value === undefined) return jsonError("Notes are invalid.", 400);
    updates.notes = value;
  }

  if (body.quantity !== undefined) {
    if (!validNumber(body.quantity)) {
      return jsonError("Quantity must be a non-negative number.", 400);
    }
    updates.quantity = String(body.quantity);
  }

  if (body.lowStockThreshold !== undefined) {
    if (!validNumber(body.lowStockThreshold)) {
      return jsonError("Low-stock threshold must be a non-negative number.", 400);
    }
    updates.lowStockThreshold = String(body.lowStockThreshold);
  }

  if (body.expiryDate !== undefined) {
    const value = validDate(body.expiryDate);
    if (value === undefined) {
      return jsonError("Expiry date must be a valid YYYY-MM-DD date or null.", 400);
    }
    updates.expiryDate = value;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("Provide at least one valid field to update.", 400);
  }

  try {
    const [item] = await db
      .update(inventoryItems)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.ownerUid, uid),
        ),
      )
      .returning();

    if (!item) {
      return jsonError("Inventory item not found.", 404);
    }

    return NextResponse.json({ item });
  } catch {
    return jsonError("Unable to update the inventory item.", 500);
  }
}

export async function DELETE(request: Request) {
  let uid: string | null;

  try {
    uid = await getAuthenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired authentication token.", 401);
  }

  if (!uid) {
    return jsonError("Authentication required.", 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return jsonError("A valid inventory item ID is required.", 400);
  }

  try {
    const [deleted] = await db
      .delete(inventoryItems)
      .where(
        and(
          eq(inventoryItems.id, id),
          eq(inventoryItems.ownerUid, uid),
        ),
      )
      .returning({ id: inventoryItems.id });

    if (!deleted) {
      return jsonError("Inventory item not found.", 404);
    }

    return NextResponse.json({ ok: true, id: deleted.id });
  } catch {
    return jsonError("Unable to delete the inventory item.", 500);
  }
}
