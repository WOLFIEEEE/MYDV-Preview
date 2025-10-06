-- Add new fields to saved_invoices table
ALTER TABLE saved_invoices 
ADD COLUMN IF NOT EXISTS invoice_to VARCHAR(100),
ADD COLUMN IF NOT EXISTS remaining_balance VARCHAR(50) DEFAULT '0',
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE NOT NULL;

