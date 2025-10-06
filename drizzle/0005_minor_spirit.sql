ALTER TABLE "inventory_details" ADD COLUMN "funding_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_details" ADD COLUMN "funding_source_id" uuid;--> statement-breakpoint
ALTER TABLE "inventory_details" ADD COLUMN "business_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "inventory_details" ADD CONSTRAINT "inventory_details_funding_source_id_fund_sources_id_fk" FOREIGN KEY ("funding_source_id") REFERENCES "public"."fund_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_inventory_details_funding_source_id" ON "inventory_details" USING btree ("funding_source_id");