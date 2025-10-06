CREATE TABLE "company_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"company_name" varchar(255),
	"business_type" varchar(100),
	"established_year" varchar(4),
	"registration_number" varchar(100),
	"vat_number" varchar(50),
	"company_logo_file_name" varchar(255),
	"company_logo_supabase_file_name" varchar(255),
	"company_logo_public_url" text,
	"company_logo_file_size" integer,
	"company_logo_mime_type" varchar(100),
	"address_street" varchar(255),
	"address_city" varchar(100),
	"address_county" varchar(100),
	"address_post_code" varchar(20),
	"address_country" varchar(100) DEFAULT 'United Kingdom',
	"contact_phone" varchar(50),
	"contact_email" varchar(255),
	"contact_website" varchar(255),
	"contact_fax" varchar(50),
	"description" text,
	"mission" text,
	"vision" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "company_settings_dealer_id_unique" UNIQUE("dealer_id")
);
--> statement-breakpoint
CREATE TABLE "contact_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"company" varchar(255),
	"phone" varchar(50),
	"message" text NOT NULL,
	"inquiry_type" varchar(100) DEFAULT 'general' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"dealer_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"date_of_birth" timestamp,
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"county" varchar(100),
	"postcode" varchar(20),
	"country" varchar(100) DEFAULT 'United Kingdom',
	"marketing_consent" boolean DEFAULT false,
	"sales_consent" boolean DEFAULT false,
	"gdpr_consent" boolean DEFAULT false,
	"consent_date" timestamp,
	"notes" text,
	"customer_source" varchar(100),
	"preferred_contact_method" varchar(50) DEFAULT 'email',
	"status" varchar(50) DEFAULT 'active',
	"tags" jsonb,
	"custom_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dealers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'dealer' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dealers_clerk_user_id_unique" UNIQUE("clerk_user_id"),
	CONSTRAINT "dealers_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "detailed_margins" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"registration" varchar(50),
	"outlay_on_vehicle" numeric(10, 2),
	"vat_on_spend" numeric(10, 2),
	"vat_on_purchase" numeric(10, 2),
	"vat_on_sale_price" numeric(10, 2),
	"vat_to_pay" numeric(10, 2),
	"profit_margin_pre_costs" numeric(10, 2),
	"profit_margin_post_costs" numeric(10, 2),
	"profit_margin_pre_vat" numeric(10, 2),
	"profit_margin_post_vat" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_access_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid,
	"category_name" varchar(100) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"description" text,
	"is_required" boolean DEFAULT false,
	"has_expiry" boolean DEFAULT false,
	"accepts_multiple" boolean DEFAULT true,
	"allowed_mime_types" jsonb,
	"max_file_size_mb" integer DEFAULT 10,
	"is_system" boolean DEFAULT false,
	"is_active" boolean DEFAULT true,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inquiries" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"dealer_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"registration" varchar(50),
	"date_of_purchase" timestamp,
	"cost_of_purchase" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_details_stock_id_unique" UNIQUE("stock_id")
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"stock_reference" varchar(255),
	"registration" varchar(50),
	"invoice_number" varchar(100) NOT NULL,
	"invoice_to" varchar(255),
	"vehicle_registration" varchar(50),
	"make" varchar(100),
	"model" varchar(100),
	"colour" varchar(50),
	"vin" varchar(100),
	"derivative" varchar(255),
	"fuel_type" varchar(50),
	"engine_number" varchar(100),
	"engine_capacity" varchar(50),
	"first_reg_date" timestamp,
	"sale_type" varchar(50),
	"sale_price" numeric(10, 2),
	"date_of_sale" timestamp,
	"month_of_sale" varchar(20),
	"quarter_of_sale" integer,
	"cost_of_purchase" numeric(10, 2),
	"date_of_purchase" timestamp,
	"days_in_stock" integer,
	"customer_title" varchar(20),
	"customer_first_name" varchar(255),
	"customer_middle_name" varchar(255),
	"customer_surname" varchar(255),
	"customer_address" jsonb,
	"customer_contact_number" varchar(50),
	"customer_email_address" varchar(255),
	"finance_company" varchar(255),
	"finance_company_name" varchar(255),
	"finance_address" text,
	"warranty_level" varchar(100),
	"warranty_price" numeric(10, 2),
	"warranty_details" text,
	"addons" jsonb,
	"deposit_amount" numeric(10, 2),
	"delivery_date" timestamp,
	"delivery_location" varchar(255),
	"collection" varchar(50) DEFAULT 'FREE',
	"discounts" jsonb,
	"payments" jsonb,
	"total_balance" numeric(10, 2),
	"outstanding_balance" numeric(10, 2),
	"status" varchar(50) DEFAULT 'draft' NOT NULL,
	"checklist_validated" boolean DEFAULT false,
	"additional_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "join_submissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"dealership_name" varchar(255) NOT NULL,
	"dealership_type" varchar(100) NOT NULL,
	"number_of_vehicles" varchar(50),
	"current_system" varchar(100),
	"inquiry_type" varchar(100) NOT NULL,
	"subject" varchar(255),
	"message" text NOT NULL,
	"preferred_contact" varchar(50) DEFAULT 'email' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"assigned_to" uuid,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_boards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"dealer_id" uuid NOT NULL,
	"created_by" varchar(255) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"color" varchar(50) DEFAULT '#3b82f6',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_columns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"position" integer NOT NULL,
	"color" varchar(50) DEFAULT '#6b7280',
	"limit_wip" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_task_comments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"comment" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanban_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"board_id" uuid NOT NULL,
	"column_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"assigned_to" varchar(255),
	"created_by" varchar(255) NOT NULL,
	"due_date" timestamp,
	"position" integer NOT NULL,
	"tags" text[],
	"checklist" jsonb,
	"attachments" jsonb,
	"stock_id" varchar(255),
	"estimated_hours" integer,
	"actual_hours" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_delivery_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" varchar(20) NOT NULL,
	"status" varchar(20) NOT NULL,
	"provider" varchar(50),
	"provider_id" varchar(255),
	"recipient_address" varchar(255),
	"error_message" text,
	"response_data" jsonb,
	"sent_at" timestamp,
	"delivered_at" timestamp,
	"failed_at" timestamp,
	"retry_count" integer DEFAULT 0,
	"next_retry_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"quiet_hours_start" varchar(5),
	"quiet_hours_end" varchar(5),
	"timezone" varchar(50) DEFAULT 'Europe/London',
	"email_preferences" jsonb DEFAULT '{}',
	"sms_preferences" jsonb DEFAULT '{}',
	"push_preferences" jsonb DEFAULT '{}',
	"in_app_preferences" jsonb DEFAULT '{}',
	"min_priority_email" varchar(20) DEFAULT 'medium',
	"min_priority_sms" varchar(20) DEFAULT 'high',
	"min_priority_push" varchar(20) DEFAULT 'medium',
	"digest_frequency" varchar(20) DEFAULT 'daily',
	"max_notifications_per_hour" integer DEFAULT 10,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid,
	"type" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"title_template" varchar(255) NOT NULL,
	"message_template" text NOT NULL,
	"default_priority" varchar(20) DEFAULT 'medium',
	"default_channels" text[] DEFAULT '{"in_app"}',
	"variables" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_id" uuid NOT NULL,
	"recipient_type" varchar(50) DEFAULT 'user' NOT NULL,
	"sender_id" uuid,
	"type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(255),
	"metadata" jsonb,
	"action_url" varchar(500),
	"action_label" varchar(100),
	"channels" text[] DEFAULT '{"in_app"}' NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"scheduled_for" timestamp,
	"expires_at" timestamp,
	"group_key" varchar(255),
	"batch_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"inquiry_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"assigned_to" uuid,
	"advertisement_id" varchar(255),
	"company_name" varchar(255),
	"key" varchar(255),
	"secret" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "return_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"stock_reference" varchar(255),
	"registration" varchar(50),
	"vatable_costs" jsonb DEFAULT '[]',
	"non_vatable_costs" jsonb DEFAULT '[]',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sale_details" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"registration" varchar(50),
	"sale_date" timestamp NOT NULL,
	"month_of_sale" varchar(20),
	"quarter_of_sale" varchar(10),
	"sale_price" numeric(10, 2),
	"first_name" varchar(255),
	"last_name" varchar(255),
	"email_address" varchar(255),
	"contact_number" varchar(50),
	"address_first_line" varchar(255),
	"address_post_code" varchar(20),
	"payment_method" varchar(50) DEFAULT 'cash' NOT NULL,
	"cash_amount" numeric(10, 2),
	"bacs_amount" numeric(10, 2),
	"finance_amount" numeric(10, 2),
	"deposit_amount" numeric(10, 2),
	"part_ex_amount" numeric(10, 2),
	"warranty_type" varchar(50) DEFAULT 'none' NOT NULL,
	"delivery_date" timestamp,
	"delivery_address" text,
	"documentation_complete" boolean DEFAULT false,
	"key_handed_over" boolean DEFAULT false,
	"customer_satisfied" boolean DEFAULT false,
	"vulnerability_marker" boolean DEFAULT false,
	"deposit_paid" boolean DEFAULT false,
	"vehicle_purchased" boolean DEFAULT false,
	"enquiry" boolean DEFAULT false,
	"gdpr_consent" boolean DEFAULT false,
	"sales_marketing_consent" boolean DEFAULT false,
	"requires_additional_support" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"advertiser_id" varchar(255) NOT NULL,
	"make" varchar(100) NOT NULL,
	"model" varchar(100) NOT NULL,
	"derivative" varchar(255),
	"registration" varchar(20),
	"vin" varchar(50),
	"year_of_manufacture" integer,
	"odometer_reading_miles" integer,
	"fuel_type" varchar(50),
	"body_type" varchar(50),
	"forecourt_price_gbp" numeric(10, 2),
	"total_price_gbp" numeric(10, 2),
	"lifecycle_state" varchar(50),
	"ownership_condition" varchar(50),
	"last_fetched_from_autotrader" timestamp DEFAULT now() NOT NULL,
	"is_stale" boolean DEFAULT false NOT NULL,
	"autotrader_version_number" integer,
	"vehicle_data" jsonb,
	"advertiser_data" jsonb,
	"adverts_data" jsonb,
	"metadata_raw" jsonb,
	"features_data" jsonb,
	"media_data" jsonb,
	"history_data" jsonb,
	"check_data" jsonb,
	"highlights_data" jsonb,
	"valuations_data" jsonb,
	"response_metrics_data" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stock_cache_stock_id_unique" UNIQUE("stock_id")
);
--> statement-breakpoint
CREATE TABLE "stock_cache_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"dealer_id" uuid NOT NULL,
	"advertiser_id" varchar(255) NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"status" varchar(50) DEFAULT 'in_progress' NOT NULL,
	"records_processed" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_created" integer DEFAULT 0,
	"records_deleted" integer DEFAULT 0,
	"error_message" text,
	"autotrader_api_calls" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"file_name" varchar(255) NOT NULL,
	"supabase_file_name" varchar(255) NOT NULL,
	"public_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tags" jsonb,
	"vehicle_type" varchar(100),
	"image_type" varchar(50),
	"is_default" boolean DEFAULT false,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"join_submission_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"clerk_user_id" varchar(255),
	"clerk_invitation_id" varchar(255),
	"store_name" varchar(255) NOT NULL,
	"store_type" varchar(100),
	"invitation_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"advertisement_ids" text,
	"primary_advertisement_id" varchar(255),
	"autotrader_key" varchar(500),
	"autotrader_secret" varchar(500),
	"dvla_api_key" varchar(500),
	"autotrader_integration_id" varchar(255),
	"company_name" varchar(255),
	"company_logo" text,
	"advertisement_id" varchar(255),
	"additional_advertisement_ids" text,
	"company_logo_url" varchar(500),
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_owner_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(50),
	"role" varchar(50) DEFAULT 'employee' NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"clerk_user_id" varchar(255),
	"clerk_invitation_id" varchar(255),
	"invitation_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"specialization" varchar(255),
	"sales_count" integer DEFAULT 0,
	"performance" integer DEFAULT 0,
	"revenue" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(50) NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"supabase_file_name" varchar(255) NOT NULL,
	"public_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_drive_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"vehicle_registration" varchar(20) NOT NULL,
	"vehicle_make" varchar(100) NOT NULL,
	"vehicle_model" varchar(100) NOT NULL,
	"vehicle_year" varchar(4),
	"test_drive_date" timestamp NOT NULL,
	"test_drive_time" varchar(10) NOT NULL,
	"estimated_duration" integer NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"customer_email" varchar(255) NOT NULL,
	"customer_phone" varchar(50),
	"address_same_as_id" varchar(10) NOT NULL,
	"address_line_1" varchar(255),
	"address_line_2" varchar(255),
	"city" varchar(100),
	"county" varchar(100),
	"postcode" varchar(20),
	"country" varchar(100) DEFAULT 'United Kingdom',
	"driving_license_file" varchar(500),
	"status" varchar(50) DEFAULT 'scheduled',
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"join_submission_id" integer NOT NULL,
	"dealer_id" uuid,
	"advertisement_ids" text,
	"primary_advertisement_id" varchar(255),
	"autotrader_key" varchar(500),
	"autotrader_secret" varchar(500),
	"dvla_api_key" varchar(500),
	"autotrader_integration_id" varchar(255),
	"company_name" varchar(255),
	"company_logo" text,
	"assigned_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_checklist" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"registration" varchar(50),
	"user_manual" text,
	"number_of_keys" text,
	"service_book" text,
	"wheel_locking_nut" text,
	"cambelt_chain_confirmation" text,
	"completion_percentage" integer DEFAULT 0,
	"is_complete" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_costs" (
	"id" serial PRIMARY KEY NOT NULL,
	"stock_id" varchar(255) NOT NULL,
	"dealer_id" uuid NOT NULL,
	"registration" varchar(50),
	"transport_in" numeric(10, 2),
	"transport_out" numeric(10, 2),
	"mot" numeric(10, 2),
	"ex_vat_costs" jsonb,
	"inc_vat_costs" jsonb,
	"fixed_costs_total" numeric(10, 2),
	"ex_vat_costs_total" numeric(10, 2),
	"inc_vat_costs_total" numeric(10, 2),
	"grand_total" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dealer_id" uuid NOT NULL,
	"stock_id" varchar(255),
	"registration" varchar(20) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"document_type" varchar(100) NOT NULL,
	"description" text,
	"file_name" varchar(255) NOT NULL,
	"supabase_file_name" varchar(255) NOT NULL,
	"public_url" text NOT NULL,
	"file_size" integer NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"tags" jsonb,
	"is_required" boolean DEFAULT false,
	"is_verified" boolean DEFAULT false,
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"expiry_date" timestamp,
	"document_date" timestamp,
	"uploaded_by" varchar(255) NOT NULL,
	"upload_source" varchar(50) DEFAULT 'manual' NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"visibility" varchar(50) DEFAULT 'internal' NOT NULL,
	"metadata" jsonb,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "detailed_margins" ADD CONSTRAINT "detailed_margins_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_access_log" ADD CONSTRAINT "document_access_log_document_id_vehicle_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."vehicle_documents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_categories" ADD CONSTRAINT "document_categories_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_details" ADD CONSTRAINT "inventory_details_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_boards" ADD CONSTRAINT "kanban_boards_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_columns" ADD CONSTRAINT "kanban_columns_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_task_comments" ADD CONSTRAINT "kanban_task_comments_task_id_kanban_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."kanban_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_board_id_kanban_boards_id_fk" FOREIGN KEY ("board_id") REFERENCES "public"."kanban_boards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanban_tasks" ADD CONSTRAINT "kanban_tasks_column_id_kanban_columns_id_fk" FOREIGN KEY ("column_id") REFERENCES "public"."kanban_columns"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_delivery_log" ADD CONSTRAINT "notification_delivery_log_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_dealers_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_dealers_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_sender_id_dealers_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_assigned_to_dealers_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_costs" ADD CONSTRAINT "return_costs_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_details" ADD CONSTRAINT "sale_details_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_cache" ADD CONSTRAINT "stock_cache_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_cache_sync_log" ADD CONSTRAINT "stock_cache_sync_log_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_images" ADD CONSTRAINT "stock_images_dealer_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_config" ADD CONSTRAINT "store_config_join_submission_id_join_submissions_id_fk" FOREIGN KEY ("join_submission_id") REFERENCES "public"."join_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_config" ADD CONSTRAINT "store_config_assigned_by_dealers_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_store_owner_id_dealers_id_fk" FOREIGN KEY ("store_owner_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "templates" ADD CONSTRAINT "templates_dealer_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_join_submission_id_join_submissions_id_fk" FOREIGN KEY ("join_submission_id") REFERENCES "public"."join_submissions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_assignments" ADD CONSTRAINT "user_assignments_assigned_by_dealers_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checklist" ADD CONSTRAINT "vehicle_checklist_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_costs" ADD CONSTRAINT "vehicle_costs_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_dealer_id_dealers_id_fk" FOREIGN KEY ("dealer_id") REFERENCES "public"."dealers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_company_settings_dealer_id" ON "company_settings" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "customers_dealer_id_idx" ON "customers" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "customers_email_idx" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customers_status_idx" ON "customers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_detailed_margins_stock_id" ON "detailed_margins" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_detailed_margins_dealer_id" ON "detailed_margins" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_document_access_log_document_id" ON "document_access_log" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "idx_document_access_log_user_id" ON "document_access_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_document_access_log_action" ON "document_access_log" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_document_access_log_created_at" ON "document_access_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_document_categories_dealer_id" ON "document_categories" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_document_categories_category_name" ON "document_categories" USING btree ("category_name");--> statement-breakpoint
CREATE INDEX "idx_document_categories_is_active" ON "document_categories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_inventory_details_stock_id" ON "inventory_details" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_details_dealer_id" ON "inventory_details" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_stock_id" ON "invoices" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_dealer_id" ON "invoices" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_invoice_number" ON "invoices" USING btree ("invoice_number");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_delivery_log_notification" ON "notification_delivery_log" USING btree ("notification_id");--> statement-breakpoint
CREATE INDEX "idx_delivery_log_status" ON "notification_delivery_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_delivery_log_channel" ON "notification_delivery_log" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "idx_delivery_log_sent_at" ON "notification_delivery_log" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX "idx_delivery_log_next_retry" ON "notification_delivery_log" USING btree ("next_retry_at");--> statement-breakpoint
CREATE INDEX "idx_notification_preferences_user" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_dealer" ON "notification_templates" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_type" ON "notification_templates" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_is_active" ON "notification_templates" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_notifications_recipient" ON "notifications" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_type" ON "notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_notifications_priority" ON "notifications" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_created_at" ON "notifications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_scheduled_for" ON "notifications" USING btree ("scheduled_for");--> statement-breakpoint
CREATE INDEX "idx_notifications_expires_at" ON "notifications" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_notifications_group_key" ON "notifications" USING btree ("group_key");--> statement-breakpoint
CREATE INDEX "idx_notifications_entity" ON "notifications" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_return_costs_stock_id" ON "return_costs" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_return_costs_dealer_id" ON "return_costs" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_sale_details_stock_id" ON "sale_details" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_sale_details_dealer_id" ON "sale_details" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_sale_details_sale_date" ON "sale_details" USING btree ("sale_date");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_stock_id" ON "stock_cache" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_dealer_id" ON "stock_cache" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_advertiser_id" ON "stock_cache" USING btree ("advertiser_id");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_make_model" ON "stock_cache" USING btree ("make","model");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_last_fetched" ON "stock_cache" USING btree ("last_fetched_from_autotrader");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_lifecycle_state" ON "stock_cache" USING btree ("lifecycle_state");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_price" ON "stock_cache" USING btree ("forecourt_price_gbp");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_year_mileage" ON "stock_cache" USING btree ("year_of_manufacture","odometer_reading_miles");--> statement-breakpoint
CREATE INDEX "idx_stock_cache_stale" ON "stock_cache" USING btree ("is_stale");--> statement-breakpoint
CREATE INDEX "idx_sync_log_dealer_id" ON "stock_cache_sync_log" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_sync_log_status" ON "stock_cache_sync_log" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sync_log_start_time" ON "stock_cache_sync_log" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "stock_images_dealer_idx" ON "stock_images" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "stock_images_vehicle_type_idx" ON "stock_images" USING btree ("vehicle_type");--> statement-breakpoint
CREATE INDEX "stock_images_image_type_idx" ON "stock_images" USING btree ("image_type");--> statement-breakpoint
CREATE INDEX "stock_images_default_idx" ON "stock_images" USING btree ("is_default");--> statement-breakpoint
CREATE INDEX "templates_dealer_idx" ON "templates" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "templates_category_idx" ON "templates" USING btree ("category");--> statement-breakpoint
CREATE INDEX "test_drive_entries_dealer_id_idx" ON "test_drive_entries" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "test_drive_entries_status_idx" ON "test_drive_entries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "test_drive_entries_date_idx" ON "test_drive_entries" USING btree ("test_drive_date");--> statement-breakpoint
CREATE INDEX "test_drive_entries_customer_email_idx" ON "test_drive_entries" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "idx_vehicle_checklist_stock_id" ON "vehicle_checklist" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_checklist_dealer_id" ON "vehicle_checklist" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_costs_stock_id" ON "vehicle_costs" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_costs_dealer_id" ON "vehicle_costs" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_dealer_id" ON "vehicle_documents" USING btree ("dealer_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_registration" ON "vehicle_documents" USING btree ("registration");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_stock_id" ON "vehicle_documents" USING btree ("stock_id");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_document_type" ON "vehicle_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_status" ON "vehicle_documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_uploaded_by" ON "vehicle_documents" USING btree ("uploaded_by");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_expiry_date" ON "vehicle_documents" USING btree ("expiry_date");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_created_at" ON "vehicle_documents" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_vehicle_documents_reg_dealer" ON "vehicle_documents" USING btree ("registration","dealer_id");