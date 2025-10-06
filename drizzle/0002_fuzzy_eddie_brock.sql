CREATE TABLE "fund_sources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"fund_name" varchar(255) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"address" text,
	"contact_person_name" varchar(255),
	"mobile_number" varchar(50),
	"contact_email" varchar(255),
	"description" text,
	"interest_rate" numeric(5, 2),
	"repayment_terms" text,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "unique_dealer_fund_name" UNIQUE("dealer_id","fund_name")
);
--> statement-breakpoint
CREATE TABLE "fund_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"fund_source_id" uuid NOT NULL,
	"transaction_type" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text,
	"reference_number" varchar(100),
	"vehicle_stock_id" uuid,
	"transaction_date" timestamp DEFAULT now() NOT NULL,
	"due_date" timestamp,
	"status" varchar(50) DEFAULT 'completed' NOT NULL,
	"notes" text,
	"attachments" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fund_sources" ADD CONSTRAINT "fund_sources_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_fund_source_id_fund_sources_id_fk" FOREIGN KEY ("fund_source_id") REFERENCES "public"."fund_sources"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fund_transactions" ADD CONSTRAINT "fund_transactions_vehicle_stock_id_stock_cache_stock_id_fk" FOREIGN KEY ("vehicle_stock_id") REFERENCES "public"."stock_cache"("stock_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fund_sources_dealer_id" ON "fund_sources" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_fund_sources_status" ON "fund_sources" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_fund_transactions_dealer_id" ON "fund_transactions" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_fund_transactions_fund_source_id" ON "fund_transactions" USING btree ("fund_source_id");--> statement-breakpoint
CREATE INDEX "idx_fund_transactions_type" ON "fund_transactions" USING btree ("transaction_type");--> statement-breakpoint
CREATE INDEX "idx_fund_transactions_date" ON "fund_transactions" USING btree ("transaction_date");--> statement-breakpoint
CREATE INDEX "idx_fund_transactions_status" ON "fund_transactions" USING btree ("status");