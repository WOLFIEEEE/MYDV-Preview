CREATE TABLE "external_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"enquiry_type" varchar(50) NOT NULL,
	"personal_title" varchar(20),
	"personal_first_name" varchar(255),
	"personal_last_name" varchar(255),
	"personal_email" varchar(255),
	"personal_phone_number" varchar(50),
	"personal_gender" varchar(20),
	"personal_country_of_origin" varchar(100),
	"personal_date_of_birth" varchar(20),
	"personal_marital_status" varchar(50),
	"personal_dependents" integer,
	"personal_address" text,
	"vehicle_stock_id" varchar(255),
	"vehicle_make" varchar(100),
	"vehicle_model" varchar(100),
	"vehicle_registration" varchar(50),
	"vehicle_mileage" varchar(50),
	"vehicle_year" varchar(10),
	"vehicle_recent_valuations" text,
	"vehicle_price" numeric(10, 2),
	"vehicle_initial_deposit" numeric(10, 2),
	"vehicle_loan_term" integer,
	"vehicle_apr" numeric(5, 2),
	"vehicle_amount_to_finance" numeric(10, 2),
	"vehicle_monthly_payment" numeric(10, 2),
	"user_vehicle_make" varchar(100),
	"user_vehicle_model" varchar(100),
	"user_vehicle_registration" varchar(50),
	"user_vehicle_mileage" varchar(50),
	"user_vehicle_year" varchar(10),
	"user_vehicle_recent_valuations" text,
	"find_your_next_car_enquiry_type" varchar(50),
	"find_your_next_car_vehicle_preferences" text,
	"test_drive_is_test_drive" boolean,
	"test_drive_date" varchar(20),
	"test_drive_time" varchar(20),
	"test_drive_additional_requirements" text,
	"employment_status" varchar(50),
	"employment_annual_income" numeric(12, 2),
	"employment_employer_name" varchar(255),
	"employment_time_in_employment" varchar(100),
	"employment_gross_annual_income" numeric(12, 2),
	"finance_monthly_expenses" numeric(10, 2),
	"finance_existence_credit_commitments" numeric(10, 2),
	"bank_account_holder_name" varchar(255),
	"bank_name" varchar(255),
	"bank_sort_code" varchar(20),
	"bank_account_number" varchar(50),
	"bank_time_with_bank" varchar(100),
	"reservation_amount" numeric(10, 2),
	"notes" text,
	"status" varchar(50) DEFAULT 'new' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"assigned_to" uuid,
	"source_website" varchar(255),
	"source_ip" varchar(45),
	"user_agent" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"responded_at" timestamp,
	"last_contacted_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_notifications" ADD CONSTRAINT "external_notifications_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "external_notifications" ADD CONSTRAINT "external_notifications_assigned_to_dealers_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_external_notifications_dealer" ON "external_notifications" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_enquiry_type" ON "external_notifications" USING btree ("enquiry_type");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_status" ON "external_notifications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_priority" ON "external_notifications" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_assigned_to" ON "external_notifications" USING btree ("assigned_to");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_is_read" ON "external_notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_created_at" ON "external_notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_email" ON "external_notifications" USING btree ("personal_email");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_phone" ON "external_notifications" USING btree ("personal_phone_number");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_vehicle_stock" ON "external_notifications" USING btree ("vehicle_stock_id");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_source_website" ON "external_notifications" USING btree ("source_website");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_dealer_status" ON "external_notifications" USING btree ("dealer_id","status");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_dealer_type" ON "external_notifications" USING btree ("dealer_id","enquiry_type");--> statement-breakpoint
CREATE INDEX "idx_external_notifications_status_priority" ON "external_notifications" USING btree ("status","priority");