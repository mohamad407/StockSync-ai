CREATE TABLE "grocery_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_uid" text NOT NULL,
	"item_name" text NOT NULL,
	"event_type" text NOT NULL,
	"quantity" numeric(12, 3) NOT NULL,
	"unit" text NOT NULL,
	"event_date" timestamp with time zone NOT NULL,
	"unit_price" numeric(12, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "grocery_events_type_valid" CHECK ("grocery_events"."event_type" IN ('purchased', 'consumed')),
	CONSTRAINT "grocery_events_quantity_positive" CHECK ("grocery_events"."quantity" > 0),
	CONSTRAINT "grocery_events_price_nonnegative" CHECK ("grocery_events"."unit_price" IS NULL OR "grocery_events"."unit_price" >= 0)
);
--> statement-breakpoint
CREATE INDEX "grocery_events_owner_date_idx" ON "grocery_events" USING btree ("owner_uid","event_date");