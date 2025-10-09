ALTER TABLE "company_settings" ADD COLUMN "qr_code_file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "qr_code_supabase_file_name" varchar(255);--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "qr_code_public_url" text;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "qr_code_file_size" integer;--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "qr_code_mime_type" varchar(100);