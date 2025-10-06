-- Add dealer logos table for admin-managed dealer branding
CREATE TABLE IF NOT EXISTS "dealer_logos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"logo_file_name" varchar(255),
	"logo_supabase_file_name" varchar(255),
	"logo_public_url" text,
	"logo_file_size" integer,
	"logo_mime_type" varchar(100),
	"assigned_by" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);

-- Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "dealer_logos" ADD CONSTRAINT "dealer_logos_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "dealers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "dealer_logos" ADD CONSTRAINT "dealer_logos_assigned_by_dealers_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "dealers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS "idx_dealer_logos_dealer_id" ON "dealer_logos" ("dealer_id");
CREATE INDEX IF NOT EXISTS "idx_dealer_logos_active" ON "dealer_logos" ("dealer_id","is_active");
