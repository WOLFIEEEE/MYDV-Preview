CREATE TABLE "temp_invoice_data" (
	"id" serial PRIMARY KEY NOT NULL,
	"temp_id" varchar(100) NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "temp_invoice_data_temp_id_unique" UNIQUE("temp_id")
);
--> statement-breakpoint
CREATE INDEX "idx_temp_invoice_data_temp_id" ON "temp_invoice_data" USING btree ("temp_id");--> statement-breakpoint
CREATE INDEX "idx_temp_invoice_data_user_id" ON "temp_invoice_data" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_temp_invoice_data_expires_at" ON "temp_invoice_data" USING btree ("expires_at");