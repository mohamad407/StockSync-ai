import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { adminAuth } from "@/lib/firebase/admin";
import { db } from "@/lib/db";
import { groceryEvents } from "@/lib/db/schema";
import { getSwiggyOrders } from "@/lib/swiggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dict = Record<string, unknown>;

function asDict(value: unknown): Dict | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  return value as Dict;
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

async function authenticatedUid(request: NextRequest): Promise<string | null> {
  const match = request.headers
    .get("authorization")
    ?.match(/^Bearer\s+(.+)$/i);

  if (!match) return null;

  const decoded = await adminAuth.verifyIdToken(match[1]);
  return decoded.uid || null;
}

function decodeToolResult(raw: unknown): Dict {
  const root = asDict(raw);

  if (!root) {
    throw new Error("Unexpected Swiggy response.");
  }

  if (root.isError === true) {
    throw new Error("Swiggy returned a tool error.");
  }

  const structured = asDict(root.structuredContent);
  if (structured) return structured;

  // MCP servers can return structured JSON inside a text content block.
  if (Array.isArray(root.content)) {
    for (const part of root.content) {
      const text = asDict(part)?.text;

      if (typeof text !== "string") continue;

      try {
        const parsed = asDict(JSON.parse(text));
        if (parsed) return parsed;
      } catch {
        // Try another content block, if present.
      }
    }
  }

  return root;
}

function isCompletedOrder(order: Dict): boolean {
  const status = [
    order.status,
    order.currentStatus,
    order.historyStatus,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  if (/cancel|refund|fail|reject|pending|processing|progress|placed|payment/.test(status)) {
    return false;
  }

  return /deliver|complete|success/.test(status);
}

export async function POST(request: NextRequest) {
  // This version is deliberately local-development only. The current
  // Swiggy token store is process-local, not a secure per-user store.
  if (process.env.NODE_ENV !== "development") {
    return jsonError(
      "Instamart order sync is available only in local development until per-user secure token storage is implemented.",
      403,
    );
  }

  let ownerUid: string | null;

  try {
    ownerUid = await authenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired StockSync authentication.", 401);
  }

  if (!ownerUid) {
    return jsonError("Please sign in to StockSync AI first.", 401);
  }

  let orders: Dict[];

  try {
    const raw = await getSwiggyOrders(20);
    const payload = decodeToolResult(raw);

    if (payload.success === false) {
      return jsonError("Swiggy did not return order history successfully.", 502);
    }

    const data = asDict(payload.data) ?? payload;

    if (!Array.isArray(data.orders)) {
      return jsonError(
        "The Swiggy response did not contain an orders list. Check integration access and the tool response.",
        502,
      );
    }

    orders = data.orders
      .map(asDict)
      .filter((order): order is Dict => order !== null);
  } catch {
    return jsonError(
      "Unable to fetch Instamart orders. Make sure Swiggy is connected and your account has access to get_orders.",
      502,
    );
  }

  let completedOrders = 0;
  let importedEvents = 0;
  let duplicateEvents = 0;
  let skippedItems = 0;
  const ordersImported = new Set<string>();

  for (const order of orders) {
    if (!isCompletedOrder(order)) continue;

    const orderId =
      typeof order.orderId === "string" ? order.orderId.trim() : "";

    const createdAt =
      typeof order.createdAt === "string" ? new Date(order.createdAt) : null;

    if (
      !orderId ||
      orderId.length > 200 ||
      !createdAt ||
      Number.isNaN(createdAt.getTime()) ||
      createdAt.getTime() > Date.now() + 5 * 60 * 1000
    ) {
      skippedItems++;
      continue;
    }

    if (!Array.isArray(order.items)) {
      skippedItems++;
      continue;
    }

    completedOrders++;

    for (let index = 0; index < order.items.length; index++) {
      const item = asDict(order.items[index]);

      if (!item) {
        skippedItems++;
        continue;
      }

      const itemName =
        typeof item.name === "string" ? item.name.trim() : "";

      const quantity = Number(item.quantity);

      if (
        !itemName ||
        itemName.length > 120 ||
        !Number.isFinite(quantity) ||
        quantity <= 0 ||
        quantity > 1_000_000_000
      ) {
        skippedItems++;
        continue;
      }

      const externalItemKey = `${orderId}:${index}`;

      try {
        const inserted = await db
          .insert(groceryEvents)
          .values({
            ownerUid,
            itemName,
            eventType: "purchased",
            quantity: String(quantity),
            // get_orders documents a quantity, but not a normalized unit.
            unit: "item",
            eventDate: createdAt,
            unitPrice: null,
            notes: null,
            source: "instamart",
            externalOrderId: orderId,
            externalItemKey,
          })
          .onConflictDoNothing({
            target: [
              groceryEvents.ownerUid,
              groceryEvents.externalOrderId,
              groceryEvents.externalItemKey,
            ],
          })
          .returning({ id: groceryEvents.id });

        if (inserted.length > 0) {
          importedEvents++;
          ordersImported.add(orderId);
        } else {
          duplicateEvents++;
        }
      } catch {
        return jsonError(
          "The order list was retrieved, but an item could not be saved. Check that the Instamart import migration has been applied.",
          500,
        );
      }
    }
  }

  return NextResponse.json({
    ok: true,
    fetchedOrders: orders.length,
    completedOrders,
    importedOrders: ordersImported.size,
    importedEvents,
    duplicateEvents,
    skippedItems,
    note:
      "Imported completed order lines are saved to grocery history only. Their unit is recorded as item because get_orders does not provide a normalized unit. Current inventory quantities are not changed by historical imports.",
  });
}

// Helpful for a signed-in developer checking the latest imported records.
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") {
    return jsonError("Development endpoint only.", 403);
  }

  let ownerUid: string | null;

  try {
    ownerUid = await authenticatedUid(request);
  } catch {
    return jsonError("Invalid or expired StockSync authentication.", 401);
  }

  if (!ownerUid) {
    return jsonError("Authentication required.", 401);
  }

  try {
    const imports = await db
      .select()
      .from(groceryEvents)
      .where(eq(groceryEvents.ownerUid, ownerUid))
      .orderBy(desc(groceryEvents.eventDate))
      .limit(100);

    return NextResponse.json({
      imports: imports.filter((event) => event.source === "instamart"),
    });
  } catch {
    return jsonError("Unable to retrieve imported orders.", 500);
  }
}
