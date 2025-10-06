CREATE TABLE "vehicle_job_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"registration" varchar(50) NOT NULL,
	"job_type" varchar(500) NOT NULL,
	"garage_details" text,
	"job_category" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'todo' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"estimated_hours" integer,
	"actual_hours" integer,
	"started_at" timestamp,
	"completed_at" timestamp,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"cost_description" text,
	"costs_submitted" boolean DEFAULT false,
	"costs_submitted_at" timestamp,
	"assigned_to" varchar(255),
	"created_by" varchar(255) NOT NULL,
	"notes" text,
	"customer_notes" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_job_cards" ADD CONSTRAINT "vehicle_job_cards_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_job_cards" ADD CONSTRAINT "vehicle_job_cards_stock_id_stock_cache_stock_id_fk" FOREIGN KEY ("stock_id") REFERENCES "public"."stock_cache"("stock_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_dealer_id" ON "vehicle_job_cards" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_stock_id" ON "vehicle_job_cards" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_registration" ON "vehicle_job_cards" USING btree ("registration");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_status" ON "vehicle_job_cards" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_assigned_to" ON "vehicle_job_cards" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_created_at" ON "vehicle_job_cards" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_job_category" ON "vehicle_job_cards" USING btree ("job_category");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_dealer_status" ON "vehicle_job_cards" USING btree ("dealer_id","status");--> statement-breakpoint
CREATE INDEX "idx_vehicle_job_cards_dealer_registration" ON "vehicle_job_cards" USING btree ("dealer_id","registration");