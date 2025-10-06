CREATE TABLE "service_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"stock_reference" varchar(255),
	"registration" varchar(50),
	"service_history" varchar(20) NOT NULL,
	"number_of_services" integer,
	"last_service_date" date,
	"major_service_work" varchar(300),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_details" ADD CONSTRAINT "service_details_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_service_details_stock_id" ON "service_details" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_service_details_dealer_id" ON "service_details" USING btree ("dealer_id");