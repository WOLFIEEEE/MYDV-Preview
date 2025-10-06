CREATE TABLE "dealer_logos" (
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
--> statement-breakpoint
ALTER TABLE "dealer_logos" ADD CONSTRAINT "dealer_logos_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealer_logos" ADD CONSTRAINT "dealer_logos_assigned_by_dealers_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_dealer_logos_dealer_id" ON "dealer_logos" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_dealer_logos_active" ON "dealer_logos" USING btree ("dealer_id","is_active");--> statement-breakpoint
CREATE INDEX "team_members_email_idx" ON "team_members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "team_members_store_owner_idx" ON "team_members" USING btree ("store_owner_id");--> statement-breakpoint
CREATE INDEX "team_members_clerk_user_idx" ON "team_members" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "team_members_status_idx" ON "team_members" USING btree ("status");--> statement-breakpoint
CREATE INDEX "team_members_role_idx" ON "team_members" USING btree ("role");--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "unique_email_per_store" UNIQUE("email","store_owner_id");