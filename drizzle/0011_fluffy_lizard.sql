CREATE TABLE "dvla_vehicle_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"registration_number" varchar(20) NOT NULL,
	"make" varchar(100),
	"colour" varchar(50),
	"fuel_type" varchar(50),
	"year_of_manufacture" integer,
	"engine_capacity" integer,
	"co2_emissions" integer,
	"mot_status" varchar(50),
	"mot_expiry_date" date,
	"tax_status" varchar(50),
	"tax_due_date" date,
	"type_approval" varchar(10),
	"wheelplan" varchar(100),
	"revenue_weight" integer,
	"marked_for_export" boolean DEFAULT false,
	"date_of_last_v5c_issued" date,
	"month_of_first_registration" varchar(10),
	"dvla_last_checked" timestamp DEFAULT now() NOT NULL,
	"dvla_data_raw" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dvla_vehicle_data_registration_number_unique" UNIQUE("registration_number")
);
--> statement-breakpoint
CREATE INDEX "idx_dvla_registration" ON "dvla_vehicle_data" USING btree ("registration_number");--> statement-breakpoint
CREATE INDEX "idx_dvla_mot_status" ON "dvla_vehicle_data" USING btree ("mot_status");--> statement-breakpoint
CREATE INDEX "idx_dvla_mot_expiry" ON "dvla_vehicle_data" USING btree ("mot_expiry_date");--> statement-breakpoint
CREATE INDEX "idx_dvla_last_checked" ON "dvla_vehicle_data" USING btree ("dvla_last_checked");