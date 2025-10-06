ALTER TABLE "sale_details" ADD COLUMN "delivery_type" varchar(20) DEFAULT 'collection';--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "delivery_price" numeric(10, 2);