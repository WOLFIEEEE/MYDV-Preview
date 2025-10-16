ALTER TABLE "sale_details" ADD COLUMN "total_finance_add_on" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "total_customer_add_on" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "sale_details" DROP COLUMN "delivery_discount";