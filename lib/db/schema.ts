import {
  pgTable,
  pgEnum,
  text,
  uuid,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
};

export const householdRoleEnum = pgEnum("household_role", [
  "owner",
  "admin",
  "member",
]);

export const inventoryItems = pgTable(
  "inventory_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUid: text("owner_uid").notNull(),
    householdId: uuid("household_id"),
    name: text("name").notNull(),
    category: text("category"),
    quantity: numeric("quantity", { precision: 12, scale: 3 })
      .default("0")
      .notNull(),
    unit: text("unit").default("piece").notNull(),
    lowStockThreshold: numeric("low_stock_threshold", {
      precision: 12,
      scale: 3,
    }).default("1").notNull(),
    expiryDate: timestamp("expiry_date", { mode: "date" }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("inventory_owner_idx").on(table.ownerUid),
    index("inventory_household_idx").on(table.householdId),
    check("inventory_quantity_nonnegative", sql`${table.quantity} >= 0`),
    check(
      "inventory_threshold_nonnegative",
      sql`${table.lowStockThreshold} >= 0`,
    ),
  ],
);

export const shoppingPlans = pgTable(
  "shopping_plans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUid: text("owner_uid").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    plannedFor: timestamp("planned_for", { withTimezone: true }),
    status: text("status").default("draft").notNull(),
    ...timestamps,
  },
  (table) => [
    index("shopping_plans_owner_idx").on(table.ownerUid),
    check(
      "shopping_plans_status_valid",
      sql`${table.status} IN ('draft', 'active', 'completed', 'cancelled')`,
    ),
  ],
);

export const shoppingPlanItems = pgTable(
  "shopping_plan_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    planId: uuid("plan_id")
      .notNull()
      .references(() => shoppingPlans.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    productId: text("product_id"),
    quantity: integer("quantity").default(1).notNull(),
    estimatedPrice: numeric("estimated_price", {
      precision: 12,
      scale: 2,
    }),
    completed: boolean("completed").default(false).notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("shopping_plan_items_plan_idx").on(table.planId),
    check("shopping_plan_item_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "shopping_plan_item_price_nonnegative",
      sql`${table.estimatedPrice} IS NULL OR ${table.estimatedPrice} >= 0`,
    ),
  ],
);

export const shoppingCarts = pgTable(
  "shopping_carts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUid: text("owner_uid").notNull(),
    name: text("name").default("Shopping cart").notNull(),
    status: text("status").default("preview").notNull(),
    currency: text("currency").default("INR").notNull(),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("shopping_carts_owner_idx").on(table.ownerUid),
    check(
      "shopping_cart_status_preview_only",
      sql`${table.status} IN ('preview', 'archived')`,
    ),
  ],
);

export const shoppingCartItems = pgTable(
  "shopping_cart_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cartId: uuid("cart_id")
      .notNull()
      .references(() => shoppingCarts.id, { onDelete: "cascade" }),
    productId: text("product_id"),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    source: text("source").default("manual").notNull(),
    ...timestamps,
  },
  (table) => [
    index("shopping_cart_items_cart_idx").on(table.cartId),
    check("shopping_cart_item_quantity_positive", sql`${table.quantity} > 0`),
    check(
      "shopping_cart_item_price_nonnegative",
      sql`${table.unitPrice} IS NULL OR ${table.unitPrice} >= 0`,
    ),
  ],
);

export const households = pgTable(
  "households",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    createdByUid: text("created_by_uid").notNull(),
    ...timestamps,
  },
  (table) => [index("households_creator_idx").on(table.createdByUid)],
);

export const householdMembers = pgTable(
  "household_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    householdId: uuid("household_id")
      .notNull()
      .references(() => households.id, { onDelete: "cascade" }),
    userUid: text("user_uid").notNull(),
    role: householdRoleEnum("role").default("member").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("household_member_unique").on(
      table.householdId,
      table.userUid,
    ),
    index("household_members_user_idx").on(table.userUid),
  ],
);

export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUid: text("owner_uid").notNull(),
    provider: text("provider").notNull(),
    connected: boolean("connected").default(false).notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>()
      .default({})
      .notNull(),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("integrations_owner_provider_unique").on(
      table.ownerUid,
      table.provider,
    ),
    index("integrations_owner_idx").on(table.ownerUid),
  ],
);

// Firebase-authenticated application profiles.
// Firebase remains the source of truth for authentication.
export const users = pgTable(
  "users",
  {
    uid: text("uid").primaryKey(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    photoURL: text("photo_url"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("users_email_unique").on(table.email),
  ],
);

// User-owned grocery purchase and consumption history.
export const groceryEvents = pgTable(
  "grocery_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ownerUid: text("owner_uid").notNull(),
    itemName: text("item_name").notNull(),
    eventType: text("event_type").notNull(),
    quantity: numeric("quantity", { precision: 12, scale: 3 }).notNull(),
    unit: text("unit").notNull(),
    eventDate: timestamp("event_date", { withTimezone: true }).notNull(),
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }),
    notes: text("notes"),
    source: text("source").default("manual").notNull(),
    externalOrderId: text("external_order_id"),
    externalItemKey: text("external_item_key"),
    ...timestamps,
  },
  (table) => [
    index("grocery_events_owner_date_idx").on(
      table.ownerUid,
      table.eventDate,
    ),
    uniqueIndex("grocery_events_owner_order_item_unique").on(
      table.ownerUid,
      table.externalOrderId,
      table.externalItemKey,
    ),
    check(
      "grocery_events_type_valid",
      sql`${table.eventType} IN ('purchased', 'consumed')`,
    ),
    check(
      "grocery_events_quantity_positive",
      sql`${table.quantity} > 0`,
    ),
    check(
      "grocery_events_price_nonnegative",
      sql`${table.unitPrice} IS NULL OR ${table.unitPrice} >= 0`,
    ),
  ],
);


