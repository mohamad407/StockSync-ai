import { NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";
import { desc, eq } from "drizzle-orm";
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
  applyToInventory?: unknown;
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
  if (value === undefined || value === null || value === "") {
    return new Date();
  }

  if (typeof value !== "string") return null;

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime()) ||
    date.getTime() > Date.now() + 5 * 60 * 1000
  ) {
    return null;
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
    return jsonError("Unable to retrieve grocery history.", 500);
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
    return jsonError(
      "Event type must be purchased or consumed.",
      400,
    );
  }

  if (!positiveNumber(body.quantity)) {
    return jsonError("Quantity must be a positive number.", 400);
  }

  if (!eventDate) {
    return jsonError("Event date is invalid or in the future.", 400);
  }

  let unitPrice: number | null = null;

  if (
    body.unitPrice !== undefined &&
    body.unitPrice !== null &&
    body.unitPrice !== ""
  ) {
    if (
      typeof body.unitPrice !== "number" ||
      !Number.isFinite(body.unitPrice) ||
      body.unitPrice < 0 ||
      body.unitPrice > 1_000_000_000
    ) {
      return jsonError(
        "Unit price must be a non-negative number.",
        400,
      );
    }

    if (body.eventType === "consumed") {
      return jsonError(
        "Unit price can only be recorded for purchases.",
        400,
      );
    }

    unitPrice = body.unitPrice;
  }

  let applyToInventory: boolean;

  if (body.applyToInventory === undefined) {
    // Compatibility with older clients: only reconcile events dated today.
    applyToInventory =
      eventDate.toISOString().slice(0, 10) ===
      new Date().toISOString().slice(0, 10);
  } else if (typeof body.applyToInventory === "boolean") {
    applyToInventory = body.applyToInventory;
  } else {
    return jsonError("Inventory update preference is invalid.", 400);
  }

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    return jsonError("Database configuration is missing.", 500);
  }

  try {
    const sql = neon(connectionString);

    const [savedEvent] = await sql`
      WITH input AS MATERIALIZED (
        SELECT
          ${uid}::text AS owner_uid,
          ${itemName}::text AS item_name,
          ${body.eventType}::text AS event_type,
          ${String(body.quantity)}::numeric AS quantity,
          ${unit}::text AS unit,
          ${eventDate}::timestamptz AS event_date,
          ${unitPrice === null ? null : String(unitPrice)}::numeric AS unit_price,
          ${notes ?? null}::text AS notes,
          ${applyToInventory}::boolean AS apply_to_inventory
      ),
      target AS MATERIALIZED (
        SELECT i.id, i.quantity
        FROM inventory_items AS i
        CROSS JOIN input AS x
        WHERE
          x.apply_to_inventory
          AND i.owner_uid = x.owner_uid
          AND lower(btrim(i.name)) = lower(btrim(x.item_name))
          AND lower(btrim(i.unit)) = lower(btrim(x.unit))
        ORDER BY i.updated_at DESC, i.id
        LIMIT 1
        FOR UPDATE OF i
      ),
      inserted AS (
        INSERT INTO grocery_events (
          owner_uid,
          item_name,
          event_type,
          quantity,
          unit,
          event_date,
          unit_price,
          notes
        )
        SELECT
          x.owner_uid,
          x.item_name,
          x.event_type,
          x.quantity,
          x.unit,
          x.event_date,
          x.unit_price,
          x.notes
        FROM input AS x
        RETURNING
          id,
          owner_uid,
          item_name,
          event_type,
          quantity,
          unit,
          event_date,
          unit_price,
          notes,
          created_at,
          updated_at
      ),
      updated_inventory AS (
        UPDATE inventory_items AS i
        SET
          quantity = CASE
            WHEN x.event_type = 'purchased'
              THEN i.quantity + x.quantity
            ELSE GREATEST(i.quantity - x.quantity, 0)
          END,
          updated_at = NOW()
        FROM target AS t
        CROSS JOIN input AS x
        CROSS JOIN inserted AS e
        WHERE
          x.apply_to_inventory
          AND i.id = t.id
        RETURNING i.id
      ),
      created_inventory AS (
        INSERT INTO inventory_items (
          owner_uid,
          household_id,
          name,
          category,
          quantity,
          unit,
          low_stock_threshold,
          expiry_date,
          notes
        )
        SELECT
          x.owner_uid,
          NULL,
          x.item_name,
          NULL,
          x.quantity,
          x.unit,
          1,
          NULL,
          NULL
        FROM input AS x
        CROSS JOIN inserted AS e
        WHERE
          x.apply_to_inventory
          AND x.event_type = 'purchased'
          AND NOT EXISTS (SELECT 1 FROM target)
        RETURNING id
      )
      SELECT
        e.id::text AS id,
        e.owner_uid AS "ownerUid",
        e.item_name AS "itemName",
        e.event_type AS "eventType",
        e.quantity::text AS quantity,
        e.unit AS unit,
        e.event_date AS "eventDate",
        e.unit_price::text AS "unitPrice",
        e.notes AS notes,
        e.created_at AS "createdAt",
        e.updated_at AS "updatedAt",
        x.apply_to_inventory AS "inventoryReconciled",
        (
          x.apply_to_inventory
          AND (
            EXISTS (SELECT 1 FROM updated_inventory)
            OR EXISTS (SELECT 1 FROM created_inventory)
          )
        ) AS "inventoryAdjusted",
        (
          x.apply_to_inventory
          AND x.event_type = 'consumed'
          AND (
            NOT EXISTS (SELECT 1 FROM target)
            OR COALESCE(
              (SELECT t.quantity FROM target AS t),
              0
            ) < x.quantity
          )
        ) AS "stockShortfall"
      FROM input AS x
      CROSS JOIN inserted AS e
    `;

    if (!savedEvent) {
      return jsonError("The grocery event was not saved.", 500);
    }

    return NextResponse.json(
      { event: savedEvent },
      { status: 201 },
    );
  } catch {
    return jsonError(
      "Unable to save grocery history and update inventory.",
      500,
    );
  }
}
