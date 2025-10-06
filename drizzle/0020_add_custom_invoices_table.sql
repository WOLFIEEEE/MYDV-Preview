-- Create custom_invoices table for user-generated invoices
CREATE TABLE IF NOT EXISTS "custom_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"invoice_number" varchar(100) NOT NULL,
	"invoice_date" timestamp NOT NULL,
	"due_date" timestamp,
	"invoice_title" varchar(255) DEFAULT 'INVOICE',
	"invoice_type" varchar(50) DEFAULT 'standard' NOT NULL,
	
	-- Customer Information
	"customer_name" varchar(255),
	"customer_email" varchar(255),
	"customer_phone" varchar(50),
	"customer_address" jsonb,
	
	-- Company Information (can override default)
	"company_info" jsonb,
	
	-- Vehicle Information (optional)
	"vehicle_info" jsonb,
	
	-- Delivery Address (for purchase invoices)
	"delivery_address" jsonb,
	
	-- Invoice Items
	"items" jsonb NOT NULL DEFAULT '[]'::jsonb,
	
	-- Financial Information
	"subtotal" numeric(10, 2) DEFAULT 0,
	"vat_rate" numeric(5, 2) DEFAULT 20.00,
	"vat_amount" numeric(10, 2) DEFAULT 0,
	"total" numeric(10, 2) DEFAULT 0,
	"vat_mode" varchar(20) DEFAULT 'global',
	"discount_mode" varchar(20) DEFAULT 'global',
	"global_discount_type" varchar(20) DEFAULT 'percentage',
	"global_discount_value" numeric(10, 2) DEFAULT 0,
	"global_discount_amount" numeric(10, 2) DEFAULT 0,
	"total_discount" numeric(10, 2) DEFAULT 0,
	"subtotal_after_discount" numeric(10, 2) DEFAULT 0,
	
	-- Payment Information
	"payment_status" varchar(20) DEFAULT 'unpaid',
	"payments" jsonb DEFAULT '[]'::jsonb,
	"paid_amount" numeric(10, 2) DEFAULT 0,
	"outstanding_balance" numeric(10, 2) DEFAULT 0,
	
	-- Additional Information
	"notes" text,
	"terms" text,
	"payment_instructions" text,
	
	-- Status and Metadata
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"pdf_generated" boolean DEFAULT false,
	"pdf_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "idx_custom_invoices_dealer_id" ON "custom_invoices" USING btree ("dealer_id");
CREATE INDEX IF NOT EXISTS "idx_custom_invoices_invoice_number" ON "custom_invoices" USING btree ("invoice_number");
CREATE INDEX IF NOT EXISTS "idx_custom_invoices_status" ON "custom_invoices" USING btree ("status");
CREATE INDEX IF NOT EXISTS "idx_custom_invoices_created_by" ON "custom_invoices" USING btree ("created_by");
CREATE INDEX IF NOT EXISTS "idx_custom_invoices_payment_status" ON "custom_invoices" USING btree ("payment_status");

-- Create unique constraint for invoice number per dealer
CREATE UNIQUE INDEX IF NOT EXISTS "custom_invoices_dealer_invoice_number_unique" ON "custom_invoices" ("dealer_id", "invoice_number");

-- Add foreign key constraint
ALTER TABLE "custom_invoices" ADD CONSTRAINT "custom_invoices_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE no action ON UPDATE no action;
