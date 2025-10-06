CREATE TABLE "cost_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"dealer_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"color" varchar(7) DEFAULT '#6B7280',
	"icon" varchar(50),
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_dealer_category_name" UNIQUE("dealer_id","name")
);
--> statement-breakpoint
CREATE TABLE "dealership_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"dealer_id" uuid NOT NULL,
	"description" varchar(500) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"has_vat" boolean DEFAULT false NOT NULL,
	"vat_amount" numeric(10, 2),
	"total_amount" numeric(10, 2) NOT NULL,
	"cost_type" varchar(50) NOT NULL,
	"frequency" varchar(20),
	"category" varchar(100) NOT NULL,
	"start_date" date,
	"end_date" date,
	"due_date" date,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"notes" text,
	"is_paid" boolean DEFAULT false NOT NULL,
	"paid_date" date,
	"payment_method" varchar(50),
	"created_by" varchar(255) NOT NULL,
	"updated_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cost_categories" ADD CONSTRAINT "cost_categories_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dealership_costs" ADD CONSTRAINT "dealership_costs_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cost_categories_dealer_id" ON "cost_categories" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_dealership_costs_dealer_id" ON "dealership_costs" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_dealership_costs_category" ON "dealership_costs" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_dealership_costs_status" ON "dealership_costs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dealership_costs_due_date" ON "dealership_costs" USING btree ("due_date");