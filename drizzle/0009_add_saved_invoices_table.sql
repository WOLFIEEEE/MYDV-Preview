-- Create saved_invoices table
CREATE TABLE IF NOT EXISTS "saved_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invoice_number" varchar(255) NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"invoice_data" json NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"vehicle_registration" varchar(50) NOT NULL,
	"sale_type" varchar(50) NOT NULL,
	"invoice_type" varchar(100) NOT NULL,
	"total_amount" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"last_accessed_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_saved_invoices_user_id ON saved_invoices(user_id);
CREATE INDEX idx_saved_invoices_invoice_number ON saved_invoices(invoice_number);
CREATE INDEX idx_saved_invoices_stock_id ON saved_invoices(stock_id);
CREATE INDEX idx_saved_invoices_updated_at ON saved_invoices(updated_at DESC);