ALTER TABLE "sale_details" ADD COLUMN "customer_id" uuid;--> statement-breakpoint
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_sale_details_customer_id" ON "sale_details" USING btree ("customer_id");