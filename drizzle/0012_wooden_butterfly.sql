CREATE TABLE "businesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"vat_number" varchar(50),
	"company_number" varchar(50),
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"county" varchar(100),
	"postcode" varchar(20),
	"country" varchar(100) DEFAULT 'United Kingdom',
	"notes" text,
	"business_source" varchar(100),
	"preferred_contact_method" varchar(50) DEFAULT 'email',
	"status" varchar(50) DEFAULT 'active',
	"tags" jsonb,
	"custom_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "business_id" uuid;--> statement-breakpoint
CREATE INDEX "businesses_dealer_id_idx" ON "businesses" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "businesses_email_idx" ON "businesses" USING btree ("email");--> statement-breakpoint
CREATE INDEX "businesses_status_idx" ON "businesses" USING btree ("status");--> statement-breakpoint
CREATE INDEX "businesses_business_name_idx" ON "businesses" USING btree ("business_name");--> statement-breakpoint
CREATE INDEX "businesses_company_number_idx" ON "businesses" USING btree ("company_number");--> statement-breakpoint
CREATE INDEX "businesses_vat_number_idx" ON "businesses" USING btree ("vat_number");--> statement-breakpoint
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;