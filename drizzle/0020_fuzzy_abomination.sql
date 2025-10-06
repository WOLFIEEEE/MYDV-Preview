CREATE TABLE "custom_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp,
	"invoice_title" varchar(255) DEFAULT 'INVOICE',
	"invoice_type" varchar(50) DEFAULT 'standard' NOT NULL,
	"customer_name" varchar(255),
	"customer_email" varchar(255),
	"customer_phone" varchar(50),
	"customer_address" jsonb,
	"company_info" jsonb,
	"vehicle_info" jsonb,
	"delivery_address" jsonb,
	"items" jsonb DEFAULT '[]' NOT NULL,
	"subtotal" numeric(10, 2) DEFAULT '0',
	"vat_rate" numeric(5, 2) DEFAULT '20.00',
	"vat_amount" numeric(10, 2) DEFAULT '0',
	"total" numeric(10, 2) DEFAULT '0',
	"vat_mode" varchar(20) DEFAULT 'global',
	"discount_mode" varchar(20) DEFAULT 'global',
	"global_discount_type" varchar(20) DEFAULT 'percentage',
	"global_discount_value" numeric(10, 2) DEFAULT '0',
	"global_discount_amount" numeric(10, 2) DEFAULT '0',
	"total_discount" numeric(10, 2) DEFAULT '0',
	"subtotal_after_discount" numeric(10, 2) DEFAULT '0',
	"payment_status" varchar(20) DEFAULT 'unpaid',
	"payments" jsonb DEFAULT '[]',
	"paid_amount" numeric(10, 2) DEFAULT '0',
	"outstanding_balance" numeric(10, 2) DEFAULT '0',
	"notes" text,
	"terms" text,
	"payment_instructions" varchar(1000),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"pdf_generated" boolean DEFAULT false,
	"pdf_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "custom_invoices_dealer_invoice_number_unique" UNIQUE("dealer_id","invoice_number")
);
--> statement-breakpoint
ALTER TABLE "custom_invoices" ADD CONSTRAINT "custom_invoices_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_custom_invoices_dealer_id" ON "custom_invoices" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_custom_invoices_invoice_number" ON "custom_invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "idx_custom_invoices_status" ON "custom_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_custom_invoices_created_by" ON "custom_invoices" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "idx_custom_invoices_payment_status" ON "custom_invoices" USING btree ("payment_status");