ALTER TABLE "saved_invoices" ADD COLUMN "invoice_to" varchar(100);--> statement-breakpoint
ALTER TABLE "saved_invoices" ADD COLUMN "remaining_balance" varchar(50) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "saved_invoices" ADD COLUMN "is_paid" boolean DEFAULT false NOT NULL;