import { pgTable, uuid, varchar, text, boolean, timestamp, integer, jsonb, foreignKey, serial, unique, index, numeric } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const kanbanBoards = pgTable("kanban_boards", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	dealerId: uuid("dealer_id").notNull(),
	createdBy: varchar("created_by", { length: 255 }).notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
	color: varchar({ length: 50 }).default('#3b82f6'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const kanbanColumns = pgTable("kanban_columns", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	boardId: uuid("board_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	position: integer().notNull(),
	color: varchar({ length: 50 }).default('#6b7280'),
	limitWip: integer("limit_wip"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const kanbanTaskComments = pgTable("kanban_task_comments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	comment: text().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const kanbanTasks = pgTable("kanban_tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	boardId: uuid("board_id").notNull(),
	columnId: uuid("column_id").notNull(),
	title: varchar({ length: 500 }).notNull(),
	description: text(),
	priority: varchar({ length: 20 }).default('medium').notNull(),
	assignedTo: varchar("assigned_to", { length: 255 }),
	createdBy: varchar("created_by", { length: 255 }).notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	position: integer().notNull(),
	tags: text().array(),
	checklist: jsonb(),
	attachments: jsonb(),
	stockId: varchar("stock_id", { length: 255 }),
	estimatedHours: integer("estimated_hours"),
	actualHours: integer("actual_hours"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const requests = pgTable("requests", {
	id: serial().primaryKey().notNull(),
	inquiryId: integer("inquiry_id").notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	assignedTo: uuid("assigned_to"),
	advertisementId: varchar("advertisement_id", { length: 255 }),
	companyName: varchar("company_name", { length: 255 }),
	key: varchar({ length: 255 }),
	secret: varchar({ length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [dealers.id],
			name: "requests_assigned_to_dealers_id_fk"
		}),
	foreignKey({
			columns: [table.inquiryId],
			foreignColumns: [inquiries.id],
			name: "requests_inquiry_id_inquiries_id_fk"
		}),
]);

export const inquiries = pgTable("inquiries", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	dealerId: uuid("dealer_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const storeConfig = pgTable("store_config", {
	id: serial().primaryKey().notNull(),
	joinSubmissionId: integer("join_submission_id").notNull(),
	email: varchar({ length: 255 }).notNull(),
	clerkUserId: varchar("clerk_user_id", { length: 255 }),
	clerkInvitationId: varchar("clerk_invitation_id", { length: 255 }),
	storeName: varchar("store_name", { length: 255 }).notNull(),
	storeType: varchar("store_type", { length: 100 }),
	invitationStatus: varchar("invitation_status", { length: 50 }).default('pending').notNull(),
	advertisementIds: text("advertisement_ids"),
	primaryAdvertisementId: varchar("primary_advertisement_id", { length: 255 }),
	autotraderKey: varchar("autotrader_key", { length: 500 }),
	autotraderSecret: varchar("autotrader_secret", { length: 500 }),
	dvlaApiKey: varchar("dvla_api_key", { length: 500 }),
	autotraderIntegrationId: varchar("autotrader_integration_id", { length: 255 }),
	companyName: varchar("company_name", { length: 255 }),
	companyLogo: text("company_logo"),
	assignedBy: uuid("assigned_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	advertisementId: varchar("advertisement_id", { length: 255 }),
	additionalAdvertisementIds: text("additional_advertisement_ids"),
	companyLogoUrl: varchar("company_logo_url", { length: 500 }),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [dealers.id],
			name: "store_config_assigned_by_dealers_id_fk"
		}),
	foreignKey({
			columns: [table.joinSubmissionId],
			foreignColumns: [joinSubmissions.id],
			name: "store_config_join_submission_id_join_submissions_id_fk"
		}),
]);

export const returnCosts = pgTable("return_costs", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	stockReference: varchar("stock_reference", { length: 255 }),
	registration: varchar({ length: 50 }),
	vatableCosts: jsonb("vatable_costs").default([]),
	nonVatableCosts: jsonb("non_vatable_costs").default([]),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const userAssignments = pgTable("user_assignments", {
	id: serial().primaryKey().notNull(),
	joinSubmissionId: integer("join_submission_id").notNull(),
	dealerId: uuid("dealer_id"),
	advertisementIds: text("advertisement_ids"),
	primaryAdvertisementId: varchar("primary_advertisement_id", { length: 255 }),
	autotraderKey: varchar("autotrader_key", { length: 500 }),
	autotraderSecret: varchar("autotrader_secret", { length: 500 }),
	dvlaApiKey: varchar("dvla_api_key", { length: 500 }),
	autotraderIntegrationId: varchar("autotrader_integration_id", { length: 255 }),
	companyName: varchar("company_name", { length: 255 }),
	companyLogo: text("company_logo"),
	assignedBy: uuid("assigned_by").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assignedBy],
			foreignColumns: [dealers.id],
			name: "user_assignments_assigned_by_dealers_id_fk"
		}),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "user_assignments_dealer_id_dealers_id_fk"
		}),
	foreignKey({
			columns: [table.joinSubmissionId],
			foreignColumns: [joinSubmissions.id],
			name: "user_assignments_join_submission_id_join_submissions_id_fk"
		}),
]);

export const dealers = pgTable("dealers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	role: varchar({ length: 50 }).default('dealer').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	clerkUserId: varchar("clerk_user_id", { length: 255 }).notNull(),
	metadata: jsonb(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("dealers_email_unique").on(table.email),
	unique("dealers_clerk_user_id_unique").on(table.clerkUserId),
]);

export const contactSubmissions = pgTable("contact_submissions", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	company: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	message: text().notNull(),
	inquiryType: varchar("inquiry_type", { length: 100 }).default('general').notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	dealerId: uuid("dealer_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const joinSubmissions = pgTable("join_submissions", {
	id: serial().primaryKey().notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	dealershipName: varchar("dealership_name", { length: 255 }).notNull(),
	dealershipType: varchar("dealership_type", { length: 100 }).notNull(),
	numberOfVehicles: varchar("number_of_vehicles", { length: 50 }),
	currentSystem: varchar("current_system", { length: 100 }),
	inquiryType: varchar("inquiry_type", { length: 100 }).notNull(),
	subject: varchar({ length: 255 }),
	message: text().notNull(),
	preferredContact: varchar("preferred_contact", { length: 50 }).default('email').notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	assignedTo: uuid("assigned_to"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const teamMembers = pgTable("team_members", {
	id: serial().primaryKey().notNull(),
	storeOwnerId: uuid("store_owner_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	role: varchar({ length: 50 }).default('employee').notNull(),
	status: varchar({ length: 50 }).default('pending').notNull(),
	clerkUserId: varchar("clerk_user_id", { length: 255 }),
	clerkInvitationId: varchar("clerk_invitation_id", { length: 255 }),
	invitationStatus: varchar("invitation_status", { length: 50 }).default('pending').notNull(),
	specialization: varchar({ length: 255 }),
	salesCount: integer("sales_count").default(0),
	performance: integer().default(0),
	revenue: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.storeOwnerId],
			foreignColumns: [dealers.id],
			name: "team_members_store_owner_id_dealers_id_fk"
		}),
]);

export const stockCache = pgTable("stock_cache", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	advertiserId: varchar("advertiser_id", { length: 255 }).notNull(),
	make: varchar({ length: 100 }).notNull(),
	model: varchar({ length: 100 }).notNull(),
	derivative: varchar({ length: 255 }),
	registration: varchar({ length: 20 }),
	vin: varchar({ length: 50 }),
	yearOfManufacture: integer("year_of_manufacture"),
	odometerReadingMiles: integer("odometer_reading_miles"),
	fuelType: varchar("fuel_type", { length: 50 }),
	bodyType: varchar("body_type", { length: 50 }),
	forecourtPriceGbp: numeric("forecourt_price_gbp", { precision: 10, scale:  2 }),
	totalPriceGbp: numeric("total_price_gbp", { precision: 10, scale:  2 }),
	lifecycleState: varchar("lifecycle_state", { length: 50 }),
	ownershipCondition: varchar("ownership_condition", { length: 50 }),
	lastFetchedFromAutotrader: timestamp("last_fetched_from_autotrader", { mode: 'string' }).defaultNow().notNull(),
	isStale: boolean("is_stale").default(false).notNull(),
	autotraderVersionNumber: integer("autotrader_version_number"),
	vehicleData: jsonb("vehicle_data"),
	advertiserData: jsonb("advertiser_data"),
	advertsData: jsonb("adverts_data"),
	metadataRaw: jsonb("metadata_raw"),
	featuresData: jsonb("features_data"),
	mediaData: jsonb("media_data"),
	historyData: jsonb("history_data"),
	checkData: jsonb("check_data"),
	highlightsData: jsonb("highlights_data"),
	valuationsData: jsonb("valuations_data"),
	responseMetricsData: jsonb("response_metrics_data"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_stock_cache_advertiser_id").using("btree", table.advertiserId.asc().nullsLast().op("text_ops")),
	index("idx_stock_cache_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_stock_cache_last_fetched").using("btree", table.lastFetchedFromAutotrader.asc().nullsLast().op("timestamp_ops")),
	index("idx_stock_cache_lifecycle_state").using("btree", table.lifecycleState.asc().nullsLast().op("text_ops")),
	index("idx_stock_cache_make_model").using("btree", table.make.asc().nullsLast().op("text_ops"), table.model.asc().nullsLast().op("text_ops")),
	index("idx_stock_cache_price").using("btree", table.forecourtPriceGbp.asc().nullsLast().op("numeric_ops")),
	index("idx_stock_cache_stale").using("btree", table.isStale.asc().nullsLast().op("bool_ops")),
	index("idx_stock_cache_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	index("idx_stock_cache_year_mileage").using("btree", table.yearOfManufacture.asc().nullsLast().op("int4_ops"), table.odometerReadingMiles.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "stock_cache_dealer_id_dealers_id_fk"
		}),
	unique("stock_cache_stock_id_unique").on(table.stockId),
]);

export const stockCacheSyncLog = pgTable("stock_cache_sync_log", {
	id: serial().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	advertiserId: varchar("advertiser_id", { length: 255 }).notNull(),
	syncType: varchar("sync_type", { length: 50 }).notNull(),
	startTime: timestamp("start_time", { mode: 'string' }).defaultNow().notNull(),
	endTime: timestamp("end_time", { mode: 'string' }),
	status: varchar({ length: 50 }).default('in_progress').notNull(),
	recordsProcessed: integer("records_processed").default(0),
	recordsUpdated: integer("records_updated").default(0),
	recordsCreated: integer("records_created").default(0),
	recordsDeleted: integer("records_deleted").default(0),
	errorMessage: text("error_message"),
	autotraderApiCalls: integer("autotrader_api_calls").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_sync_log_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_sync_log_start_time").using("btree", table.startTime.asc().nullsLast().op("timestamp_ops")),
	index("idx_sync_log_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "stock_cache_sync_log_dealer_id_dealers_id_fk"
		}),
]);

export const detailedMargins = pgTable("detailed_margins", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	outlayOnVehicle: numeric("outlay_on_vehicle", { precision: 10, scale:  2 }),
	vatOnSpend: numeric("vat_on_spend", { precision: 10, scale:  2 }),
	vatOnPurchase: numeric("vat_on_purchase", { precision: 10, scale:  2 }),
	vatOnSalePrice: numeric("vat_on_sale_price", { precision: 10, scale:  2 }),
	profitMarginPreCosts: numeric("profit_margin_pre_costs", { precision: 10, scale:  2 }),
	profitMarginPostCosts: numeric("profit_margin_post_costs", { precision: 10, scale:  2 }),
	profitMarginPreVat: numeric("profit_margin_pre_vat", { precision: 10, scale:  2 }),
	profitMarginPostVat: numeric("profit_margin_post_vat", { precision: 10, scale:  2 }),
	totalVat: numeric("total_vat", { precision: 10, scale:  2 }),
	totalProfitMargins: numeric("total_profit_margins", { precision: 10, scale:  2 }),
	netTotal: numeric("net_total", { precision: 10, scale:  2 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	registration: varchar({ length: 50 }),
}, (table) => [
	index("idx_detailed_margins_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_detailed_margins_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "detailed_margins_dealer_id_dealers_id_fk"
		}),
]);

export const inventoryDetails = pgTable("inventory_details", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	dateOfPurchase: timestamp("date_of_purchase", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	registration: varchar({ length: 50 }),
	costOfPurchase: numeric("cost_of_purchase", { precision: 10, scale:  2 }),
}, (table) => [
	index("idx_inventory_details_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_inventory_details_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "inventory_details_dealer_id_dealers_id_fk"
		}),
	unique("inventory_details_stock_id_unique").on(table.stockId),
]);

export const vehicleCosts = pgTable("vehicle_costs", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	transportIn: numeric("transport_in", { precision: 10, scale:  2 }),
	transportOut: numeric("transport_out", { precision: 10, scale:  2 }),
	mot: numeric({ precision: 10, scale:  2 }),
	exVatCosts: jsonb("ex_vat_costs"),
	incVatCosts: jsonb("inc_vat_costs"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	registration: varchar({ length: 50 }),
	fixedCostsTotal: numeric("fixed_costs_total", { precision: 10, scale:  2 }),
	exVatCostsTotal: numeric("ex_vat_costs_total", { precision: 10, scale:  2 }),
	incVatCostsTotal: numeric("inc_vat_costs_total", { precision: 10, scale:  2 }),
	grandTotal: numeric("grand_total", { precision: 10, scale:  2 }),
}, (table) => [
	index("idx_vehicle_costs_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_vehicle_costs_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "vehicle_costs_dealer_id_dealers_id_fk"
		}),
]);

export const vehicleChecklist = pgTable("vehicle_checklist", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	userManual: text("user_manual"),
	numberOfKeys: text("number_of_keys"),
	serviceBook: text("service_book"),
	wheelLockingNut: text("wheel_locking_nut"),
	cambeltChainConfirmation: text("cambelt_chain_confirmation"),
	completionPercentage: integer("completion_percentage").default(0),
	isComplete: boolean("is_complete").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	registration: varchar({ length: 50 }),
	metadata: jsonb(),
}, (table) => [
	index("idx_vehicle_checklist_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_vehicle_checklist_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "vehicle_checklist_dealer_id_dealers_id_fk"
		}),
]);

export const saleDetails = pgTable("sale_details", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	saleDate: timestamp("sale_date", { mode: 'string' }).defaultNow().notNull(),
	salePrice: numeric("sale_price", { precision: 10, scale:  2 }),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	emailAddress: varchar("email_address", { length: 255 }),
	contactNumber: varchar("contact_number", { length: 50 }),
	addressFirstLine: varchar("address_first_line", { length: 255 }),
	addressPostCode: varchar("address_post_code", { length: 20 }),
	paymentMethod: varchar("payment_method", { length: 50 }).default('cash').notNull(),
	cashAmount: numeric("cash_amount", { precision: 10, scale:  2 }),
	bacsAmount: numeric("bacs_amount", { precision: 10, scale:  2 }),
	financeAmount: numeric("finance_amount", { precision: 10, scale:  2 }),
	partExAmount: numeric("part_ex_amount", { precision: 10, scale:  2 }),
	warrantyType: varchar("warranty_type", { length: 50 }).default('none').notNull(),
	deliveryDate: timestamp("delivery_date", { mode: 'string' }),
	deliveryAddress: text("delivery_address"),
	documentationComplete: boolean("documentation_complete").default(false),
	keyHandedOver: boolean("key_handed_over").default(false),
	customerSatisfied: boolean("customer_satisfied").default(false),
	vulnerabilityMarker: boolean("vulnerability_marker").default(false),
	depositPaid: boolean("deposit_paid").default(false),
	vehiclePurchased: boolean("vehicle_purchased").default(false),
	enquiry: boolean().default(false),
	gdprConsent: boolean("gdpr_consent").default(false),
	salesMarketingConsent: boolean("sales_marketing_consent").default(false),
	requiresAdditionalSupport: boolean("requires_additional_support").default(false),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	depositAmount: numeric("deposit_amount", { precision: 10, scale:  2 }),
	registration: varchar({ length: 50 }),
	monthOfSale: varchar("month_of_sale", { length: 20 }),
	quarterOfSale: varchar("quarter_of_sale", { length: 10 }),
}, (table) => [
	index("idx_sale_details_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_sale_details_sale_date").using("btree", table.saleDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_sale_details_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "sale_details_dealer_id_dealers_id_fk"
		}),
]);

export const templates = pgTable("templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	category: varchar({ length: 50 }).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	supabaseFileName: varchar("supabase_file_name", { length: 255 }).notNull(),
	publicUrl: text("public_url").notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	tags: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const invoices = pgTable("invoices", {
	id: serial().primaryKey().notNull(),
	stockId: varchar("stock_id", { length: 255 }).notNull(),
	dealerId: uuid("dealer_id").notNull(),
	invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
	invoiceType: varchar("invoice_type", { length: 50 }).default('retail').notNull(),
	invoiceDate: timestamp("invoice_date", { mode: 'string' }).notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	customerName: varchar("customer_name", { length: 255 }),
	customerEmail: varchar("customer_email", { length: 255 }),
	customerAddress: text("customer_address"),
	customerPhone: varchar("customer_phone", { length: 50 }),
	companyName: varchar("company_name", { length: 255 }),
	companyAddress: text("company_address"),
	vatNumber: varchar("vat_number", { length: 50 }),
	vehiclePrice: numeric("vehicle_price", { precision: 10, scale:  2 }),
	vatRate: numeric("vat_rate", { precision: 5, scale:  2 }).default('20.00'),
	discount: numeric({ precision: 10, scale:  2 }),
	tradeInValue: numeric("trade_in_value", { precision: 10, scale:  2 }),
	warrantyPrice: numeric("warranty_price", { precision: 10, scale:  2 }),
	deliveryCharge: numeric("delivery_charge", { precision: 10, scale:  2 }),
	additionalItems: jsonb("additional_items"),
	paymentTerms: varchar("payment_terms", { length: 50 }).default('immediate').notNull(),
	includeWarranty: boolean("include_warranty").default(false),
	includeDelivery: boolean("include_delivery").default(false),
	subtotal: numeric({ precision: 10, scale:  2 }),
	totalVat: numeric("total_vat", { precision: 10, scale:  2 }),
	totalAmount: numeric("total_amount", { precision: 10, scale:  2 }),
	status: varchar({ length: 50 }).default('draft').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	collection: varchar({ length: 50 }).default('FREE'),
}, (table) => [
	index("idx_invoices_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_invoices_invoice_number").using("btree", table.invoiceNumber.asc().nullsLast().op("text_ops")),
	index("idx_invoices_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_invoices_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "invoices_dealer_id_dealers_id_fk"
		}),
	unique("invoices_invoice_number_unique").on(table.invoiceNumber),
]);

export const stockImages = pgTable("stock_images", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	supabaseFileName: varchar("supabase_file_name", { length: 255 }).notNull(),
	publicUrl: text("public_url").notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	tags: jsonb(),
	vehicleType: varchar("vehicle_type", { length: 100 }),
	imageType: varchar("image_type", { length: 50 }),
	isDefault: boolean("is_default").default(false),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	firstName: varchar("first_name", { length: 255 }).notNull(),
	lastName: varchar("last_name", { length: 255 }).notNull(),
	email: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 50 }),
	dateOfBirth: timestamp("date_of_birth", { mode: 'string' }),
	addressLine1: varchar("address_line_1", { length: 255 }),
	addressLine2: varchar("address_line_2", { length: 255 }),
	city: varchar({ length: 100 }),
	county: varchar({ length: 100 }),
	postcode: varchar({ length: 20 }),
	country: varchar({ length: 100 }).default('United Kingdom'),
	marketingConsent: boolean("marketing_consent").default(false),
	salesConsent: boolean("sales_consent").default(false),
	gdprConsent: boolean("gdpr_consent").default(false),
	consentDate: timestamp("consent_date", { mode: 'string' }),
	notes: text(),
	customerSource: varchar("customer_source", { length: 100 }),
	preferredContactMethod: varchar("preferred_contact_method", { length: 50 }).default('email'),
	status: varchar({ length: 50 }).default('active'),
	tags: jsonb(),
	customFields: jsonb("custom_fields"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("customers_dealer_id_idx").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("customers_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
	index("customers_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	recipientId: uuid("recipient_id").notNull(),
	recipientType: varchar("recipient_type", { length: 50 }).default('user').notNull(),
	senderId: uuid("sender_id"),
	type: varchar({ length: 100 }).notNull(),
	title: varchar({ length: 255 }).notNull(),
	message: text().notNull(),
	priority: varchar({ length: 20 }).default('medium').notNull(),
	entityType: varchar("entity_type", { length: 50 }),
	entityId: varchar("entity_id", { length: 255 }),
	metadata: jsonb(),
	actionUrl: varchar("action_url", { length: 500 }),
	actionLabel: varchar("action_label", { length: 100 }),
	channels: text().array().default(["in_app"]).notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	scheduledFor: timestamp("scheduled_for", { mode: 'string' }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	groupKey: varchar("group_key", { length: 255 }),
	batchId: uuid("batch_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notifications_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_notifications_entity").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("text_ops")),
	index("idx_notifications_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_notifications_group_key").using("btree", table.groupKey.asc().nullsLast().op("text_ops")),
	index("idx_notifications_is_read").using("btree", table.isRead.asc().nullsLast().op("bool_ops")),
	index("idx_notifications_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_notifications_recipient").using("btree", table.recipientId.asc().nullsLast().op("uuid_ops")),
	index("idx_notifications_scheduled_for").using("btree", table.scheduledFor.asc().nullsLast().op("timestamp_ops")),
	index("idx_notifications_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.recipientId],
			foreignColumns: [dealers.id],
			name: "notifications_recipient_id_dealers_id_fk"
		}),
	foreignKey({
			columns: [table.senderId],
			foreignColumns: [dealers.id],
			name: "notifications_sender_id_dealers_id_fk"
		}),
]);

export const notificationDeliveryLog = pgTable("notification_delivery_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	notificationId: uuid("notification_id").notNull(),
	channel: varchar({ length: 20 }).notNull(),
	status: varchar({ length: 20 }).notNull(),
	provider: varchar({ length: 50 }),
	providerId: varchar("provider_id", { length: 255 }),
	recipientAddress: varchar("recipient_address", { length: 255 }),
	errorMessage: text("error_message"),
	responseData: jsonb("response_data"),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
	failedAt: timestamp("failed_at", { mode: 'string' }),
	retryCount: integer("retry_count").default(0),
	nextRetryAt: timestamp("next_retry_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_delivery_log_channel").using("btree", table.channel.asc().nullsLast().op("text_ops")),
	index("idx_delivery_log_next_retry").using("btree", table.nextRetryAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_delivery_log_notification").using("btree", table.notificationId.asc().nullsLast().op("uuid_ops")),
	index("idx_delivery_log_sent_at").using("btree", table.sentAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_delivery_log_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.notificationId],
			foreignColumns: [notifications.id],
			name: "notification_delivery_log_notification_id_notifications_id_fk"
		}),
]);

export const notificationPreferences = pgTable("notification_preferences", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	isEnabled: boolean("is_enabled").default(true).notNull(),
	quietHoursStart: varchar("quiet_hours_start", { length: 5 }),
	quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),
	timezone: varchar({ length: 50 }).default('Europe/London'),
	emailPreferences: jsonb("email_preferences").default({}),
	smsPreferences: jsonb("sms_preferences").default({}),
	pushPreferences: jsonb("push_preferences").default({}),
	inAppPreferences: jsonb("in_app_preferences").default({}),
	minPriorityEmail: varchar("min_priority_email", { length: 20 }).default('medium'),
	minPrioritySms: varchar("min_priority_sms", { length: 20 }).default('high'),
	minPriorityPush: varchar("min_priority_push", { length: 20 }).default('medium'),
	digestFrequency: varchar("digest_frequency", { length: 20 }).default('daily'),
	maxNotificationsPerHour: integer("max_notifications_per_hour").default(10),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notification_preferences_user").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [dealers.id],
			name: "notification_preferences_user_id_dealers_id_fk"
		}),
]);

export const notificationTemplates = pgTable("notification_templates", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id"),
	type: varchar({ length: 100 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	titleTemplate: varchar("title_template", { length: 255 }).notNull(),
	messageTemplate: text("message_template").notNull(),
	defaultPriority: varchar("default_priority", { length: 20 }).default('medium'),
	defaultChannels: text("default_channels").array().default(["in_app"]),
	variables: jsonb(),
	isActive: boolean("is_active").default(true).notNull(),
	isSystem: boolean("is_system").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notification_templates_dealer").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_notification_templates_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	index("idx_notification_templates_type").using("btree", table.type.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "notification_templates_dealer_id_dealers_id_fk"
		}),
]);

export const testDriveEntries = pgTable("test_drive_entries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	vehicleRegistration: varchar("vehicle_registration", { length: 20 }).notNull(),
	vehicleMake: varchar("vehicle_make", { length: 100 }).notNull(),
	vehicleModel: varchar("vehicle_model", { length: 100 }).notNull(),
	vehicleYear: varchar("vehicle_year", { length: 4 }),
	drivingLicenseFile: varchar("driving_license_file", { length: 500 }),
	status: varchar({ length: 50 }).default('scheduled'),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	testDriveDate: timestamp("test_drive_date", { mode: 'string' }).notNull(),
	testDriveTime: varchar("test_drive_time", { length: 10 }).notNull(),
	estimatedDuration: integer("estimated_duration").notNull(),
	customerName: varchar("customer_name", { length: 255 }).notNull(),
	customerEmail: varchar("customer_email", { length: 255 }).notNull(),
	customerPhone: varchar("customer_phone", { length: 50 }),
	addressSameAsId: varchar("address_same_as_id", { length: 10 }).notNull(),
	addressLine1: varchar("address_line_1", { length: 255 }),
	addressLine2: varchar("address_line_2", { length: 255 }),
	city: varchar({ length: 100 }),
	county: varchar({ length: 100 }),
	postcode: varchar({ length: 20 }),
	country: varchar({ length: 100 }).default('United Kingdom'),
}, (table) => [
	index("test_drive_entries_customer_email_idx").using("btree", table.customerEmail.asc().nullsLast().op("text_ops")),
	index("test_drive_entries_date_idx").using("btree", table.testDriveDate.asc().nullsLast().op("timestamp_ops")),
	index("test_drive_entries_dealer_id_idx").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("test_drive_entries_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
]);

export const vehicleDocuments = pgTable("vehicle_documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	stockId: varchar("stock_id", { length: 255 }),
	registration: varchar({ length: 20 }).notNull(),
	documentName: varchar("document_name", { length: 255 }).notNull(),
	documentType: varchar("document_type", { length: 100 }).notNull(),
	description: text(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	supabaseFileName: varchar("supabase_file_name", { length: 255 }).notNull(),
	publicUrl: text("public_url").notNull(),
	fileSize: integer("file_size").notNull(),
	mimeType: varchar("mime_type", { length: 100 }).notNull(),
	tags: jsonb(),
	isRequired: boolean("is_required").default(false),
	isVerified: boolean("is_verified").default(false),
	verifiedBy: varchar("verified_by", { length: 255 }),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	expiryDate: timestamp("expiry_date", { mode: 'string' }),
	documentDate: timestamp("document_date", { mode: 'string' }),
	uploadedBy: varchar("uploaded_by", { length: 255 }).notNull(),
	uploadSource: varchar("upload_source", { length: 50 }).default('manual').notNull(),
	status: varchar({ length: 50 }).default('active').notNull(),
	visibility: varchar({ length: 50 }).default('internal').notNull(),
	metadata: jsonb(),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_vehicle_documents_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_vehicle_documents_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_vehicle_documents_document_type").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
	index("idx_vehicle_documents_expiry_date").using("btree", table.expiryDate.asc().nullsLast().op("timestamp_ops")),
	index("idx_vehicle_documents_reg_dealer").using("btree", table.registration.asc().nullsLast().op("uuid_ops"), table.dealerId.asc().nullsLast().op("text_ops")),
	index("idx_vehicle_documents_registration").using("btree", table.registration.asc().nullsLast().op("text_ops")),
	index("idx_vehicle_documents_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_vehicle_documents_stock_id").using("btree", table.stockId.asc().nullsLast().op("text_ops")),
	index("idx_vehicle_documents_uploaded_by").using("btree", table.uploadedBy.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "vehicle_documents_dealer_id_dealers_id_fk"
		}),
]);

export const documentAccessLog = pgTable("document_access_log", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	documentId: uuid("document_id").notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	action: varchar({ length: 50 }).notNull(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_document_access_log_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_document_access_log_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_document_access_log_document_id").using("btree", table.documentId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_access_log_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.documentId],
			foreignColumns: [vehicleDocuments.id],
			name: "document_access_log_document_id_vehicle_documents_id_fk"
		}),
]);

export const documentCategories = pgTable("document_categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id"),
	categoryName: varchar("category_name", { length: 100 }).notNull(),
	displayName: varchar("display_name", { length: 255 }).notNull(),
	description: text(),
	isRequired: boolean("is_required").default(false),
	hasExpiry: boolean("has_expiry").default(false),
	acceptsMultiple: boolean("accepts_multiple").default(true),
	allowedMimeTypes: jsonb("allowed_mime_types"),
	maxFileSizeMb: integer("max_file_size_mb").default(10),
	isSystem: boolean("is_system").default(false),
	isActive: boolean("is_active").default(true),
	sortOrder: integer("sort_order").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_document_categories_category_name").using("btree", table.categoryName.asc().nullsLast().op("text_ops")),
	index("idx_document_categories_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_document_categories_is_active").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
	foreignKey({
			columns: [table.dealerId],
			foreignColumns: [dealers.id],
			name: "document_categories_dealer_id_dealers_id_fk"
		}),
]);

export const companySettings = pgTable("company_settings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	companyName: varchar("company_name", { length: 255 }),
	businessType: varchar("business_type", { length: 100 }),
	establishedYear: varchar("established_year", { length: 4 }),
	registrationNumber: varchar("registration_number", { length: 100 }),
	vatNumber: varchar("vat_number", { length: 50 }),
	addressStreet: varchar("address_street", { length: 255 }),
	addressCity: varchar("address_city", { length: 100 }),
	addressCounty: varchar("address_county", { length: 100 }),
	addressPostCode: varchar("address_post_code", { length: 20 }),
	addressCountry: varchar("address_country", { length: 100 }).default('United Kingdom'),
	contactPhone: varchar("contact_phone", { length: 50 }),
	contactEmail: varchar("contact_email", { length: 255 }),
	contactWebsite: varchar("contact_website", { length: 255 }),
	contactFax: varchar("contact_fax", { length: 50 }),
	description: text(),
	mission: text(),
	vision: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	companyLogoMimeType: varchar("company_logo_mime_type", { length: 100 }),
	companyLogoFileName: varchar("company_logo_file_name", { length: 255 }),
	companyLogoSupabaseFileName: varchar("company_logo_supabase_file_name", { length: 255 }),
	companyLogoPublicUrl: text("company_logo_public_url"),
	companyLogoFileSize: integer("company_logo_file_size"),
}, (table) => [
	unique("company_settings_dealer_id_unique").on(table.dealerId),
]);

export const customInvoices = pgTable("custom_invoices", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	dealerId: uuid("dealer_id").notNull(),
	createdBy: varchar("created_by", { length: 255 }).notNull(),
	invoiceNumber: varchar("invoice_number", { length: 100 }).notNull(),
	invoiceDate: timestamp("invoice_date", { mode: 'string' }).notNull(),
	dueDate: timestamp("due_date", { mode: 'string' }),
	invoiceTitle: varchar("invoice_title", { length: 255 }).default('INVOICE'),
	invoiceType: varchar("invoice_type", { length: 50 }).default('standard').notNull(),
	
	// Customer Information
	customerName: varchar("customer_name", { length: 255 }),
	customerEmail: varchar("customer_email", { length: 255 }),
	customerPhone: varchar("customer_phone", { length: 50 }),
	customerAddress: jsonb("customer_address"),
	
	// Company Information (can override default)
	companyInfo: jsonb("company_info"),
	
	// Vehicle Information (optional)
	vehicleInfo: jsonb("vehicle_info"),
	
	// Delivery Address (for purchase invoices)
	deliveryAddress: jsonb("delivery_address"),
	
	// Invoice Items
	items: jsonb().notNull().default('[]'),
	
	// Financial Information
	subtotal: numeric({ precision: 10, scale: 2 }).default('0'),
	vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).default('20.00'),
	vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }).default('0'),
	total: numeric({ precision: 10, scale: 2 }).default('0'),
	vatMode: varchar("vat_mode", { length: 20 }).default('global'),
	discountMode: varchar("discount_mode", { length: 20 }).default('global'),
	globalDiscountType: varchar("global_discount_type", { length: 20 }).default('percentage'),
	globalDiscountValue: numeric("global_discount_value", { precision: 10, scale: 2 }).default('0'),
	globalDiscountAmount: numeric("global_discount_amount", { precision: 10, scale: 2 }).default('0'),
	totalDiscount: numeric("total_discount", { precision: 10, scale: 2 }).default('0'),
	subtotalAfterDiscount: numeric("subtotal_after_discount", { precision: 10, scale: 2 }).default('0'),
	
	// Payment Information
	paymentStatus: varchar("payment_status", { length: 20 }).default('unpaid'),
	payments: jsonb().default('[]'),
	paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).default('0'),
	outstandingBalance: numeric("outstanding_balance", { precision: 10, scale: 2 }).default('0'),
	
	// Additional Information
	notes: text(),
	terms: text(),
	paymentInstructions: varchar("payment_instructions", { length: 1000 }),
	
	// Status and Metadata
	status: varchar({ length: 50 }).default('draft').notNull(),
	pdfGenerated: boolean("pdf_generated").default(false),
	pdfUrl: text("pdf_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_custom_invoices_dealer_id").using("btree", table.dealerId.asc().nullsLast().op("uuid_ops")),
	index("idx_custom_invoices_invoice_number").using("btree", table.invoiceNumber.asc().nullsLast().op("text_ops")),
	index("idx_custom_invoices_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_custom_invoices_created_by").using("btree", table.createdBy.asc().nullsLast().op("text_ops")),
	index("idx_custom_invoices_payment_status").using("btree", table.paymentStatus.asc().nullsLast().op("text_ops")),
	foreignKey({
		columns: [table.dealerId],
		foreignColumns: [dealers.id],
		name: "custom_invoices_dealer_id_dealers_id_fk"
	}),
	unique("custom_invoices_dealer_invoice_number_unique").on(table.dealerId, table.invoiceNumber),
]);
