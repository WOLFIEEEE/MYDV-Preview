ALTER TABLE "sale_details" ADD COLUMN "wheel_nuts" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "tyre_pressures" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "tyre_sensors" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "oil_level" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "coolant_level" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "screen_wash" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "locking_nut_glove_box" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "book_pack_glove_box" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "inflation_kit" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "key_batteries" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "battery_test" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "test_driver" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "adequate_drive_away_fuel" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "additional_text" text;--> statement-breakpoint
ALTER TABLE "sale_details" ADD COLUMN "completion_date" timestamp;