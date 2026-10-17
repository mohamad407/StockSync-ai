CREATE TYPE "public"."household_role" AS ENUM('owner', 'admin', 'member');--> statement-breakpoint
CREATE TABLE "household_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"household_id" uuid NOT NULL,
	"user_uid" text NOT NULL,
	"role" "household_role" DEFAULT 'member' NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "households" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"created_by_uid" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_uid" text NOT NULL,
	"provider" text NOT NULL,
	"connected" boolean DEFAULT false NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_uid" text NOT NULL,
	"household_id" uuid,
	"name" text NOT NULL,
	"category" text,
	"quantity" numeric(12, 3) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT 'piece' NOT NULL,
	"low_stock_threshold" numeric(12, 3) DEFAULT '1' NOT NULL,
	"expiry_date" timestamp,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_quantity_nonnegative" CHECK ("inventory_items"."quantity" >= 0),
	CONSTRAINT "inventory_threshold_nonnegative" CHECK ("inventory_items"."low_stock_threshold" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shopping_cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" text,
	"name" text NOT NULL,
	"image_url" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(12, 2),
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_cart_item_quantity_positive" CHECK ("shopping_cart_items"."quantity" > 0),
	CONSTRAINT "shopping_cart_item_price_nonnegative" CHECK ("shopping_cart_items"."unit_price" IS NULL OR "shopping_cart_items"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shopping_carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_uid" text NOT NULL,
	"name" text DEFAULT 'Shopping cart' NOT NULL,
	"status" text DEFAULT 'preview' NOT NULL,
	"currency" text DEFAULT 'INR' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_cart_status_preview_only" CHECK ("shopping_carts"."status" IN ('preview', 'archived'))
);
--> statement-breakpoint
CREATE TABLE "shopping_plan_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"name" text NOT NULL,
	"product_id" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"estimated_price" numeric(12, 2),
	"completed" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_plan_item_quantity_positive" CHECK ("shopping_plan_items"."quantity" > 0),
	CONSTRAINT "shopping_plan_item_price_nonnegative" CHECK ("shopping_plan_items"."estimated_price" IS NULL OR "shopping_plan_items"."estimated_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "shopping_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_uid" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"planned_for" timestamp with time zone,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shopping_plans_status_valid" CHECK ("shopping_plans"."status" IN ('draft', 'active', 'completed', 'cancelled'))
);
--> statement-breakpoint
ALTER TABLE "household_members" ADD CONSTRAINT "household_members_household_id_households_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."households"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_cart_items" ADD CONSTRAINT "shopping_cart_items_cart_id_shopping_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."shopping_carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shopping_plan_items" ADD CONSTRAINT "shopping_plan_items_plan_id_shopping_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."shopping_plans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "household_member_unique" ON "household_members" USING btree ("household_id","user_uid");--> statement-breakpoint
CREATE INDEX "household_members_user_idx" ON "household_members" USING btree ("user_uid");--> statement-breakpoint
CREATE INDEX "households_creator_idx" ON "households" USING btree ("created_by_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_owner_provider_unique" ON "integrations" USING btree ("owner_uid","provider");--> statement-breakpoint
CREATE INDEX "integrations_owner_idx" ON "integrations" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "inventory_owner_idx" ON "inventory_items" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "inventory_household_idx" ON "inventory_items" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "shopping_cart_items_cart_idx" ON "shopping_cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "shopping_carts_owner_idx" ON "shopping_carts" USING btree ("owner_uid");--> statement-breakpoint
CREATE INDEX "shopping_plan_items_plan_idx" ON "shopping_plan_items" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "shopping_plans_owner_idx" ON "shopping_plans" USING btree ("owner_uid");