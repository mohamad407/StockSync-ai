ALTER TABLE "grocery_events" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "grocery_events" ADD COLUMN "external_order_id" text;--> statement-breakpoint
ALTER TABLE "grocery_events" ADD COLUMN "external_item_key" text;--> statement-breakpoint
CREATE UNIQUE INDEX "grocery_events_owner_order_item_unique" ON "grocery_events" USING btree ("owner_uid","external_order_id","external_item_key");