ALTER TABLE "stock_cache" ADD COLUMN "mot_status" varchar(50);--> statement-breakpoint
ALTER TABLE "stock_cache" ADD COLUMN "mot_expiry_date" timestamp;--> statement-breakpoint
ALTER TABLE "stock_cache" ADD COLUMN "dvla_last_checked" timestamp;--> statement-breakpoint
ALTER TABLE "stock_cache" ADD COLUMN "dvla_data_raw" jsonb;