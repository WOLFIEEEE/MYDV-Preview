-- Migration: Add custom_terms table for storing dealer-specific terms and conditions
-- Created: 2024-12-17

CREATE TABLE IF NOT EXISTS "custom_terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" varchar(255) NOT NULL,
	"checklist_terms" text DEFAULT '',
	"basic_terms" text DEFAULT '',
	"in_house_warranty_terms" text DEFAULT '',
	"third_party_terms" text DEFAULT '',
	"created_by" varchar(255) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_dealer_terms" UNIQUE("dealer_id")
);

-- Create index for faster lookups by dealer_id
CREATE INDEX IF NOT EXISTS "custom_terms_dealer_id_idx" ON "custom_terms" ("dealer_id");

-- Add comments for documentation
COMMENT ON TABLE "custom_terms" IS 'Stores custom terms and conditions for each dealer';
COMMENT ON COLUMN "custom_terms"."dealer_id" IS 'Reference to the dealer who owns these terms';
COMMENT ON COLUMN "custom_terms"."checklist_terms" IS 'Terms and conditions related to vehicle inspection checklist';
COMMENT ON COLUMN "custom_terms"."basic_terms" IS 'General terms and conditions for sales and services';
COMMENT ON COLUMN "custom_terms"."in_house_warranty_terms" IS 'Terms for dealership-provided warranty coverage';
COMMENT ON COLUMN "custom_terms"."third_party_terms" IS 'Terms for third-party warranty and extended protection plans';
