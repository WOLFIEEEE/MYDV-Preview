ALTER TABLE "company_settings" ADD COLUMN "bank_name" varchar(255);--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "bank_sort_code" varchar(20);--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "bank_account_number" varchar(50);--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "bank_account_name" varchar(255);--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "bank_iban" varchar(50);--> statement-breakpoint
ALTER TABLE "company_settings" ADD COLUMN "bank_swift_code" varchar(20);