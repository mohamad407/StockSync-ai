import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db, integrations, groceryEvents } from "@/lib/db";
import { authenticatedUid } from "@/lib/swiggy/auth";
import { getSwiggyOrders } from "@/lib/swiggy/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dict = Record<string, unknown>;
function asDict(value: unknown): Dict | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Dict : null;
}
function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: { "Cache-Control": "no-store" } });
}
function decodeToolResult(raw: unknown): Dict {
  const root = asDict(raw);
  if (!root) throw new Error("Unexpected Swiggy response.");
  if (root.isError === true) throw new Error("Swiggy returned a tool error.");
  const structured = asDict(root.structuredContent);
  if (structured) return structured;
  if (Array.isArray(root.content)) {
    for (const part of root.content) {
      const text = asDict(part)?.text;
      if (typeof text !== "string") continue;
      try {
        const parsed = asDict(JSON.parse(text));
        if (parsed) return parsed;
      } catch {
        // Try another MCP content block.
      }
    }
  }
  return root;
}
function isCompletedOrder(order: Dict): boolean {
  const status = [order.status, order.currentStatus, order.historyStatus]
    .filter((value): value is string => typeof value === "string")
    .join(" ").toLowerCase();
  if (/cancel|refund|fail|reject|pending|processing|progress|placed|payment/.test(status)) return false;
  return /deliver|complete|success/.test(status);
}

export async function POST(request: NextRequest) {
  const ownerUid = await authenticatedUid(request);
  if (!ownerUid) return jsonError("Sign in to StockSync AI before syncing orders.", 401);

  let orders: Dict[];
  try {
    const raw = await getSwiggyOrders(ownerUid, 20);
    const payload = decodeToolResult(raw);
    if (payload.success === false) return jsonError("Swiggy did not return order history successfully.", 502);
    const data = asDict(payload.data) ?? payload;
    if (!Array.isArray(data.orders)) return jsonError("Swiggy response did not contain an orders list. Verify MCP access and response format.", 502);
    orders = data.orders.map(asDict).filter((order): order is Dict => order !== null);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/not connected|reconnect|session could not be refreshed|authorization expired/i.test(message)) {
      return jsonError(message || "Reconnect your Swiggy account.", 401);
    }
    return jsonError("Unable to fetch Instamart orders. Verify that the connected Swiggy account can use get_orders.", 502);
  }

  let completedOrders = 0;
  let importedEvents = 0;
  let duplicateEvents = 0;
  let skippedItems = 0;
  const ordersImported = new Set<string>();

  for (const order of orders) {
    if (!isCompletedOrder(order)) continue;
    const orderId = typeof order.orderId === "string" ? order.orderId.trim() : "";
    const createdAt = typeof order.createdAt === "string" ? new Date(order.createdAt) : null;

    if (!orderId || orderId.length > 200 || !createdAt || Number.isNaN(createdAt.getTime()) || createdAt.getTime() > Date.now() + 5 * 60 * 1000) {
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
      const itemName = typeof item.name === "string" ? item.name.trim() : "";
      const quantity = Number(item.quantity);
      if (!itemName || itemName.length > 120 || !Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000_000) {
        skippedItems++;
        continue;
      }

      const externalItemKey = `${orderId}:${index}`;
      try {
        const inserted = await db.insert(groceryEvents).values({
          ownerUid,
          itemName,
          eventType: "purchased",
          quantity: String(quantity),
          unit: "item",
          eventDate: createdAt,
          unitPrice: null,
          notes: null,
          source: "instamart",
          externalOrderId: orderId,
          externalItemKey,
        }).onConflictDoNothing({
          target: [groceryEvents.ownerUid, groceryEvents.externalOrderId, groceryEvents.externalItemKey],
        }).returning({ id: groceryEvents.id });

        if (inserted.length) {
          importedEvents++;
          ordersImported.add(orderId);
        } else {
          duplicateEvents++;
        }
      } catch {
        return jsonError("Orders were retrieved, but an item could not be saved. Confirm the Instamart import migration is applied.", 500);
      }
    }
  }

  await db.update(integrations)
    .set({ lastSyncedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(integrations.ownerUid, ownerUid), eq(integrations.provider, "swiggy-instamart")))
    .catch(() => undefined);

  return NextResponse.json({
    ok: true,
    fetchedOrders: orders.length,
    completedOrders,
    importedOrders: ordersImported.size,
    importedEvents,
    duplicateEvents,
    skippedItems,
    note: "Imported completed order lines are saved to grocery history. Units are recorded as item because the order history response may not provide normalized units. Historical imports do not change current inventory quantities.",
  }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: NextRequest) {
  const ownerUid = await authenticatedUid(request);
  if (!ownerUid) return jsonError("Authentication required.", 401);

  try {
    const imports = await db.select().from(groceryEvents)
      .where(eq(groceryEvents.ownerUid, ownerUid))
      .orderBy(desc(groceryEvents.eventDate)).limit(100);
    return NextResponse.json({ imports: imports.filter((event) => event.source === "instamart") }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return jsonError("Unable to retrieve imported orders.", 500);
  }
}
