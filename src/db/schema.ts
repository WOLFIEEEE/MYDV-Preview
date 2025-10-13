import { pgTable, uuid, varchar, timestamp, text, serial, integer, foreignKey, decimal, boolean, jsonb, index, date, unique } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Dealers table - stores Clerk users who sign up
export const dealers = pgTable('dealers', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkUserId: varchar('clerk_user_id', { length: 255 }).notNull().unique(), // Link to Clerk user
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('dealer'), // 'dealer' or 'admin'
  metadata: jsonb('metadata'), // Store custom settings and configurations
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Custom Terms and Conditions table
export const customTerms = pgTable('custom_terms', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: varchar('dealer_id', { length: 255 }).notNull(),
  checklistTerms: text('checklist_terms').default(''),
  basicTerms: text('basic_terms').default(''),
  inHouseWarrantyTerms: text('in_house_warranty_terms').default(''),
  thirdPartyTerms: text('third_party_terms').default(''),
  tradeTerms: text('trade_terms').default(''),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerIdIdx: index('custom_terms_dealer_id_idx').on(table.dealerId),
  uniqueDealerTerms: unique('unique_dealer_terms').on(table.dealerId),
}))

// Contact form submissions
export const contactSubmissions = pgTable('contact_submissions', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  company: varchar('company', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  message: text('message').notNull(),
  inquiryType: varchar('inquiry_type', { length: 100 }).notNull().default('general'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, contacted, resolved
  dealerId: uuid('dealer_id'), // Can be null for unassigned inquiries
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Join/dealership application submissions
export const joinSubmissions = pgTable('join_submissions', {
  id: serial('id').primaryKey(),
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  dealershipName: varchar('dealership_name', { length: 255 }).notNull(),
  dealershipType: varchar('dealership_type', { length: 100 }).notNull(),
  numberOfVehicles: varchar('number_of_vehicles', { length: 50 }),
  currentSystem: varchar('current_system', { length: 100 }),
  inquiryType: varchar('inquiry_type', { length: 100 }).notNull(),
  subject: varchar('subject', { length: 255 }),
  message: text('message').notNull(),
  preferredContact: varchar('preferred_contact', { length: 50 }).notNull().default('email'),
  status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, reviewing, approved, rejected, contacted
  assignedTo: uuid('assigned_to'), // dealer/admin who is handling this application
  notes: text('notes'), // Internal notes about the application
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

// Customer management table
export const customers = pgTable('customers', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(), // Link to dealer who owns this customer
  
  // Personal Information
  firstName: varchar('first_name', { length: 255 }).notNull(),
  lastName: varchar('last_name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  dateOfBirth: timestamp('date_of_birth'),
  
  // Address Information
  addressLine1: varchar('address_line_1', { length: 255 }),
  addressLine2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  county: varchar('county', { length: 100 }),
  postcode: varchar('postcode', { length: 20 }),
  country: varchar('country', { length: 100 }).default('United Kingdom'),
  
  // Marketing and GDPR
  marketingConsent: boolean('marketing_consent').default(false),
  salesConsent: boolean('sales_consent').default(false),
  gdprConsent: boolean('gdpr_consent').default(false),
  consentDate: timestamp('consent_date'),
  
  // Additional Information
  notes: text('notes'),
  customerSource: varchar('customer_source', { length: 100 }), // walk-in, referral, online, etc.
  preferredContactMethod: varchar('preferred_contact_method', { length: 50 }).default('email'), // email, phone, sms
  enquiryType: varchar('enquiry_type', { length: 100 }), // Customer enquiry type
  
  // Status and Metadata
  status: varchar('status', { length: 50 }).default('active'), // active, inactive, prospect
  tags: jsonb('tags'), // Array of tags for categorization
  customFields: jsonb('custom_fields'), // Additional custom data
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerIdIdx: index('customers_dealer_id_idx').on(table.dealerId),
  emailIdx: index('customers_email_idx').on(table.email),
  statusIdx: index('customers_status_idx').on(table.status),
}))

// Store config table - stores information about invited store owners
export const storeConfig = pgTable('store_config', {
  id: serial('id').primaryKey(),
  joinSubmissionId: integer('join_submission_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(), // Email for Clerk invitation
  clerkUserId: varchar('clerk_user_id', { length: 255 }), // Will be populated when user signs up
  clerkInvitationId: varchar('clerk_invitation_id', { length: 255 }), // Clerk invitation ID
  
  // Store/Company Details
  storeName: varchar('store_name', { length: 255 }).notNull(),
  storeType: varchar('store_type', { length: 100 }),
  
  // Status tracking
  invitationStatus: varchar('invitation_status', { length: 50 }).notNull().default('pending'), // pending, invited, accepted, failed
  
  // API Keys and Configuration (Legacy columns)
  advertisementIds: text('advertisement_ids'), // JSON array of ad IDs
  primaryAdvertisementId: varchar('primary_advertisement_id', { length: 255 }),
  autotraderKey: varchar('autotrader_key', { length: 500 }),
  autotraderSecret: varchar('autotrader_secret', { length: 500 }),
  dvlaApiKey: varchar('dvla_api_key', { length: 500 }),
  autotraderIntegrationId: varchar('autotrader_integration_id', { length: 255 }),
  
  // Company Details (Legacy)
  companyName: varchar('company_name', { length: 255 }),
  companyLogo: text('company_logo'), // URL or base64 string
  
  // New Enhanced Assignment Columns
  advertisementId: varchar('advertisement_id', { length: 255 }), // Single primary advertisement ID
  additionalAdvertisementIds: text('additional_advertisement_ids'), // JSON array of additional advertisement IDs
  companyLogoUrl: varchar('company_logo_url', { length: 500 }), // Company logo URL
  assignedAt: timestamp('assigned_at').defaultNow(), // When the assignment was made
  
  // Metadata
  assignedBy: uuid('assigned_by').notNull(), // Admin who made the assignment
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  joinSubmissionFk: foreignKey({
    columns: [table.joinSubmissionId],
    foreignColumns: [joinSubmissions.id],
  }),
  assignedByFk: foreignKey({
    columns: [table.assignedBy],
    foreignColumns: [dealers.id],
  }),
}))

// User assignments table - stores API keys and company details assigned by admin to approved users
export const userAssignments = pgTable('user_assignments', {
  id: serial('id').primaryKey(),
  joinSubmissionId: integer('join_submission_id').notNull(),
  dealerId: uuid('dealer_id'), // Created dealer record for this user
  
  // Advertisement IDs (can have multiple, one marked as primary)
  advertisementIds: text('advertisement_ids'), // JSON array of ad IDs
  primaryAdvertisementId: varchar('primary_advertisement_id', { length: 255 }),
  
  // API Keys
  autotraderKey: varchar('autotrader_key', { length: 500 }),
  autotraderSecret: varchar('autotrader_secret', { length: 500 }),
  dvlaApiKey: varchar('dvla_api_key', { length: 500 }),
  autotraderIntegrationId: varchar('autotrader_integration_id', { length: 255 }),
  
  // Company Details
  companyName: varchar('company_name', { length: 255 }),
  companyLogo: text('company_logo'), // URL or base64 string
  
  // Metadata
  assignedBy: uuid('assigned_by').notNull(), // Admin who made the assignment
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  joinSubmissionFk: foreignKey({
    columns: [table.joinSubmissionId],
    foreignColumns: [joinSubmissions.id],
  }),
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  assignedByFk: foreignKey({
    columns: [table.assignedBy],
    foreignColumns: [dealers.id],
  }),
}))

// Legacy inquiries table - stores form submissions from visitors (keeping for backward compatibility)
export const inquiries = pgTable('inquiries', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  message: text('message').notNull(),
  dealerId: uuid('dealer_id'), // Can be null for unassigned inquiries
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

// Requests table - tracks inquiry requests and their assignment status
export const requests = pgTable('requests', {
  id: serial('id').primaryKey(),
  inquiryId: integer('inquiry_id').notNull(),
  status: varchar('status', { length: 50 }).notNull().default('pending'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  assignedTo: uuid('assigned_to'), // dealer id who is assigned this request
  advertisementId: varchar('advertisement_id', { length: 255 }),
  companyName: varchar('company_name', { length: 255 }),
  key: varchar('key', { length: 255 }),
  secret: varchar('secret', { length: 255 }),
}, (table) => ({
  inquiryFk: foreignKey({
    columns: [table.inquiryId],
    foreignColumns: [inquiries.id],
  }),
  assignedToFk: foreignKey({
    columns: [table.assignedTo],
    foreignColumns: [dealers.id],
  }),
}))

// Define relationships
export const dealersRelations = relations(dealers, ({ many }) => ({
  inquiries: many(inquiries),
  contactSubmissions: many(contactSubmissions),
  assignedJoinSubmissions: many(joinSubmissions, { relationName: 'assignedDealer' }),
  assignedRequests: many(requests, { relationName: 'assignedDealer' }),
  assignedUserAssignments: many(userAssignments, { relationName: 'assignedByDealer' }),
  dealerUserAssignments: many(userAssignments, { relationName: 'dealerAssignments' }),
  assignedStoreConfigs: many(storeConfig, { relationName: 'assignedByDealer' }),
  customers: many(customers),
  testDriveEntries: many(testDriveEntries),
}))

export const contactSubmissionsRelations = relations(contactSubmissions, ({ one }) => ({
  dealer: one(dealers, {
    fields: [contactSubmissions.dealerId],
    references: [dealers.id],
  }),
}))

export const joinSubmissionsRelations = relations(joinSubmissions, ({ one, many }) => ({
  assignedDealer: one(dealers, {
    fields: [joinSubmissions.assignedTo],
    references: [dealers.id],
    relationName: 'assignedDealer',
  }),
  userAssignments: many(userAssignments),
  storeConfigs: many(storeConfig),
}))

// Test drive entries table
export const testDriveEntries = pgTable('test_drive_entries', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(), // Link to dealer who owns this test drive
  
  // Vehicle Information
  vehicleRegistration: varchar('vehicle_registration', { length: 20 }).notNull(),
  vehicleMake: varchar('vehicle_make', { length: 100 }).notNull(),
  vehicleModel: varchar('vehicle_model', { length: 100 }).notNull(),
  vehicleYear: varchar('vehicle_year', { length: 4 }),
  
  // Test Drive Details
  testDriveDate: timestamp('test_drive_date').notNull(),
  testDriveTime: varchar('test_drive_time', { length: 10 }).notNull(), // HH:MM format
  estimatedDuration: integer('estimated_duration').notNull(), // in minutes
  
  // Customer Information
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }).notNull(),
  customerPhone: varchar('customer_phone', { length: 50 }),
  
  // Address Information
  addressSameAsId: varchar('address_same_as_id', { length: 10 }).notNull(), // 'yes' or 'no'
  addressLine1: varchar('address_line_1', { length: 255 }),
  addressLine2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  county: varchar('county', { length: 100 }),
  postcode: varchar('postcode', { length: 20 }),
  country: varchar('country', { length: 100 }).default('United Kingdom'),
  
  // ID Upload (store file path/URL)
  drivingLicenseFile: varchar('driving_license_file', { length: 500 }), // File path or URL
  
  // Status and Metadata
  status: varchar('status', { length: 50 }).default('scheduled'), // scheduled, completed, cancelled, in-progress
  notes: text('notes'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerIdIdx: index('test_drive_entries_dealer_id_idx').on(table.dealerId),
  statusIdx: index('test_drive_entries_status_idx').on(table.status),
  testDriveDateIdx: index('test_drive_entries_date_idx').on(table.testDriveDate),
  customerEmailIdx: index('test_drive_entries_customer_email_idx').on(table.customerEmail),
}))

// Customer relations
export const customersRelations = relations(customers, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [customers.dealerId],
    references: [dealers.id],
  }),
  saleDetails: many(saleDetails),
}))

// Test drive entries relations
export const testDriveEntriesRelations = relations(testDriveEntries, ({ one }) => ({
  dealer: one(dealers, {
    fields: [testDriveEntries.dealerId],
    references: [dealers.id],
  }),
}))

export const inquiriesRelations = relations(inquiries, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [inquiries.dealerId],
    references: [dealers.id],
  }),
  requests: many(requests),
}))

export const requestsRelations = relations(requests, ({ one }) => ({
  inquiry: one(inquiries, {
    fields: [requests.inquiryId],
    references: [inquiries.id],
  }),
  assignedDealer: one(dealers, {
    fields: [requests.assignedTo],
    references: [dealers.id],
    relationName: 'assignedDealer',
  }),
}))

export const userAssignmentsRelations = relations(userAssignments, ({ one }) => ({
  joinSubmission: one(joinSubmissions, {
    fields: [userAssignments.joinSubmissionId],
    references: [joinSubmissions.id],
  }),
  dealer: one(dealers, {
    fields: [userAssignments.dealerId],
    references: [dealers.id],
    relationName: 'dealerAssignments',
  }),
  assignedBy: one(dealers, {
    fields: [userAssignments.assignedBy],
    references: [dealers.id],
    relationName: 'assignedByDealer',
  }),
}))

export const storeConfigRelations = relations(storeConfig, ({ one }) => ({
  joinSubmission: one(joinSubmissions, {
    fields: [storeConfig.joinSubmissionId],
    references: [joinSubmissions.id],
  }),
  assignedBy: one(dealers, {
    fields: [storeConfig.assignedBy],
    references: [dealers.id],
    relationName: 'assignedByDealer',
  }),
}))

// Export types for use in the application
export type Dealer = typeof dealers.$inferSelect
export type NewDealer = typeof dealers.$inferInsert

export type ContactSubmission = typeof contactSubmissions.$inferSelect
export type NewContactSubmission = typeof contactSubmissions.$inferInsert

export type JoinSubmission = typeof joinSubmissions.$inferSelect
export type NewJoinSubmission = typeof joinSubmissions.$inferInsert

export type UserAssignment = typeof userAssignments.$inferSelect
export type NewUserAssignment = typeof userAssignments.$inferInsert

export type Inquiry = typeof inquiries.$inferSelect
export type NewInquiry = typeof inquiries.$inferInsert

export type Request = typeof requests.$inferSelect
export type NewRequest = typeof requests.$inferInsert 

export type StoreConfig = typeof storeConfig.$inferSelect
export type NewStoreConfig = typeof storeConfig.$inferInsert 

// Team members table - stores team members invited by store owners
export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  storeOwnerId: uuid('store_owner_id').notNull(), // Reference to store owner (dealer)
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 50 }),
  role: varchar('role', { length: 50 }).notNull().default('employee'), // 'employee', 'sales', 'store_owner_admin'
  status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'active', 'inactive'
  
  // Clerk integration
  clerkUserId: varchar('clerk_user_id', { length: 255 }), // Will be populated when user signs up
  clerkInvitationId: varchar('clerk_invitation_id', { length: 255 }), // Clerk invitation ID
  invitationStatus: varchar('invitation_status', { length: 50 }).notNull().default('pending'), // pending, invited, accepted, failed, expired
  
  // Additional info
  specialization: varchar('specialization', { length: 255 }),
  salesCount: integer('sales_count').default(0),
  performance: integer('performance').default(0), // Performance percentage
  revenue: integer('revenue').default(0), // Revenue in pence (GBP)
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Foreign key constraint
  storeOwnerFk: foreignKey({
    columns: [table.storeOwnerId],
    foreignColumns: [dealers.id],
  }),
  // Indexes for performance
  emailIdx: index('team_members_email_idx').on(table.email),
  storeOwnerIdx: index('team_members_store_owner_idx').on(table.storeOwnerId),
  clerkUserIdx: index('team_members_clerk_user_idx').on(table.clerkUserId),
  statusIdx: index('team_members_status_idx').on(table.status),
  roleIdx: index('team_members_role_idx').on(table.role),
}))

// Team member relations
export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  storeOwner: one(dealers, {
    fields: [teamMembers.storeOwnerId],
    references: [dealers.id],
  }),
}))

// Add team members relation to dealers
export const dealersRelationsUpdated = relations(dealers, ({ many }) => ({
  inquiries: many(inquiries),
  contactSubmissions: many(contactSubmissions),
  assignedJoinSubmissions: many(joinSubmissions, { relationName: 'assignedDealer' }),
  assignedRequests: many(requests, { relationName: 'assignedDealer' }),
  assignedUserAssignments: many(userAssignments, { relationName: 'assignedByDealer' }),
  dealerUserAssignments: many(userAssignments, { relationName: 'dealerAssignments' }),
  assignedStoreConfigs: many(storeConfig, { relationName: 'assignedByDealer' }),
  teamMembers: many(teamMembers), // Add team members relation
  stockCacheEntries: many(stockCache), // Add stock cache relation
}))

export type TeamMember = typeof teamMembers.$inferSelect
export type NewTeamMember = typeof teamMembers.$inferInsert

// Stock Cache Table - Main table for cached stock data
export const stockCache = pgTable('stock_cache', {
  // Primary identification
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull().unique(), // AutoTrader stock ID
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer who owns this stock
  advertiserId: varchar('advertiser_id', { length: 255 }).notNull(), // AutoTrader advertiser ID
  
  // Core Vehicle Information (9-10 most important searchable columns)
  make: varchar('make', { length: 100 }).notNull(), // e.g., BMW, Mercedes, etc.
  model: varchar('model', { length: 100 }).notNull(), // e.g., X5, C-Class, etc.
  derivative: varchar('derivative', { length: 255 }), // Full derivative name
  registration: varchar('registration', { length: 20 }), // Registration number
  vin: varchar('vin', { length: 50 }), // Vehicle Identification Number
  yearOfManufacture: integer('year_of_manufacture'), // Manufacturing year
  odometerReadingMiles: integer('odometer_reading_miles'), // Mileage
  fuelType: varchar('fuel_type', { length: 50 }), // Petrol, Diesel, Electric, etc.
  bodyType: varchar('body_type', { length: 50 }), // Hatchback, SUV, Saloon, etc.
  
  // Pricing Information (most accessed for listings)
  forecourtPriceGBP: decimal('forecourt_price_gbp', { precision: 10, scale: 2 }), // Main price
  totalPriceGBP: decimal('total_price_gbp', { precision: 10, scale: 2 }), // Retail price including fees
  
  // Status and Lifecycle
  lifecycleState: varchar('lifecycle_state', { length: 50 }), // Available, Sold, Reserved, etc.
  ownershipCondition: varchar('ownership_condition', { length: 50 }), // New, Used, Nearly New
  
  // Cache Management
  lastFetchedFromAutoTrader: timestamp('last_fetched_from_autotrader').notNull().defaultNow(),
  isStale: boolean('is_stale').notNull().default(false), // Flag to mark if data needs refresh
  autoTraderVersionNumber: integer('autotrader_version_number'), // To track if AutoTrader data changed
  
  // JSON Fields for Extended Data (all other AutoTrader fields)
  vehicleData: jsonb('vehicle_data'), // Complete vehicle object from AutoTrader
  advertiserData: jsonb('advertiser_data'), // Advertiser information
  advertsData: jsonb('adverts_data'), // Pricing and advert details
  metadataRaw: jsonb('metadata_raw'), // AutoTrader metadata
  featuresData: jsonb('features_data'), // Vehicle features array
  mediaData: jsonb('media_data'), // Images, videos, 360 spins
  historyData: jsonb('history_data'), // Vehicle history information
  checkData: jsonb('check_data'), // HPI/vehicle checks
  highlightsData: jsonb('highlights_data'), // AutoTrader highlights
  valuationsData: jsonb('valuations_data'), // Vehicle valuations
  responseMetricsData: jsonb('response_metrics_data'), // Performance metrics
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Foreign key relationship
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  
  // Indexes for performance
  stockIdIdx: index('idx_stock_cache_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_stock_cache_dealer_id').on(table.dealerId),
  advertiserIdIdx: index('idx_stock_cache_advertiser_id').on(table.advertiserId),
  makeModelIdx: index('idx_stock_cache_make_model').on(table.make, table.model),
  lastFetchedIdx: index('idx_stock_cache_last_fetched').on(table.lastFetchedFromAutoTrader),
  lifecycleStateIdx: index('idx_stock_cache_lifecycle_state').on(table.lifecycleState),
  priceIdx: index('idx_stock_cache_price').on(table.forecourtPriceGBP),
  yearMileageIdx: index('idx_stock_cache_year_mileage').on(table.yearOfManufacture, table.odometerReadingMiles),
  staleIdx: index('idx_stock_cache_stale').on(table.isStale),
}))
// Temporary Invoice Data Storage - For handling form data between pages
export const tempInvoiceData = pgTable('temp_invoice_data', {
  id: serial('id').primaryKey(),
  tempId: varchar('temp_id', { length: 100 }).notNull().unique(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  data: jsonb('data').notNull(), // Store the complete invoice form data
  createdAt: timestamp('created_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(), // Auto-cleanup after 24 hours
}, (table) => ({
  tempIdIdx: index('idx_temp_invoice_data_temp_id').on(table.tempId),
  userIdIdx: index('idx_temp_invoice_data_user_id').on(table.userId),
  expiresAtIdx: index('idx_temp_invoice_data_expires_at').on(table.expiresAt),
}))

// Stock Cache Sync Log - Track synchronization operations
export const stockCacheSyncLog = pgTable('stock_cache_sync_log', {
  id: serial('id').primaryKey(),
  dealerId: uuid('dealer_id').notNull(),
  advertiserId: varchar('advertiser_id', { length: 255 }).notNull(),
  syncType: varchar('sync_type', { length: 50 }).notNull(), // 'full_sync', 'partial_sync', 'single_stock'
  startTime: timestamp('start_time').notNull().defaultNow(),
  endTime: timestamp('end_time'),
  status: varchar('status', { length: 50 }).notNull().default('in_progress'), // 'in_progress', 'completed', 'failed'
  recordsProcessed: integer('records_processed').default(0),
  recordsUpdated: integer('records_updated').default(0),
  recordsCreated: integer('records_created').default(0),
  recordsDeleted: integer('records_deleted').default(0),
  errorMessage: text('error_message'),
  autoTraderApiCalls: integer('autotrader_api_calls').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdIdx: index('idx_sync_log_dealer_id').on(table.dealerId),
  statusIdx: index('idx_sync_log_status').on(table.status),
  startTimeIdx: index('idx_sync_log_start_time').on(table.startTime),
}))

// Relations for stock cache
export const stockCacheRelations = relations(stockCache, ({ one }) => ({
  dealer: one(dealers, {
    fields: [stockCache.dealerId],
    references: [dealers.id],
  }),
}))

export const stockCacheSyncLogRelations = relations(stockCacheSyncLog, ({ one }) => ({
  dealer: one(dealers, {
    fields: [stockCacheSyncLog.dealerId],
    references: [dealers.id],
  }),
}))

// Types for stock cache
export type StockCache = typeof stockCache.$inferSelect
export type NewStockCache = typeof stockCache.$inferInsert
export type StockCacheSyncLog = typeof stockCacheSyncLog.$inferSelect
export type NewStockCacheSyncLog = typeof stockCacheSyncLog.$inferInsert 

// ================================
// STOCK ACTION FORMS SCHEMA
// ================================

// Sale Details Form - Records vehicle sales information
export const saleDetails = pgTable('sale_details', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  customerId: uuid('customer_id'), // Reference to customer (optional for backward compatibility)
  
  // Stock identification fields (added)
  registration: varchar('registration', { length: 50 }),
  
  // Basic Sale Information
  saleDate: timestamp('sale_date').notNull(),
  monthOfSale: varchar('month_of_sale', { length: 20 }), // Added: e.g., "January 2024"
  quarterOfSale: varchar('quarter_of_sale', { length: 10 }), // Added: e.g., "Q1 2024"
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
  
  // Customer Information
  firstName: varchar('first_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  emailAddress: varchar('email_address', { length: 255 }),
  contactNumber: varchar('contact_number', { length: 50 }),
  addressFirstLine: varchar('address_first_line', { length: 255 }),
  addressPostCode: varchar('address_post_code', { length: 20 }),
  
  // Sales Person Information
  
  // Payment Information
  paymentMethod: varchar('payment_method', { length: 50 }).notNull().default('cash'),
  
  // Payment Breakdown
  cashAmount: decimal('cash_amount', { precision: 10, scale: 2 }),
  bacsAmount: decimal('bacs_amount', { precision: 10, scale: 2 }),
  financeAmount: decimal('finance_amount', { precision: 10, scale: 2 }),
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }),
  depositDate: timestamp('deposit_date'),
  partExAmount: decimal('part_ex_amount', { precision: 10, scale: 2 }),
  cardAmount: decimal('card_amount', { precision: 10, scale: 2 }),
  requiredAmount: decimal('required_amount', { precision: 10, scale: 2 }),
  
  // Warranty Information
  warrantyType: varchar('warranty_type', { length: 50 }).notNull().default('none'),
  
  // Delivery Information
  deliveryType: varchar('delivery_type', { length: 20 }).default('collection'), // 'delivery' or 'collection'
  deliveryPrice: decimal('delivery_price', { precision: 10, scale: 2 }),
  deliveryDate: timestamp('delivery_date'),
  deliveryAddress: text('delivery_address'),
  
  // Status Flags
  documentationComplete: boolean('documentation_complete').default(false),
  keyHandedOver: boolean('key_handed_over').default(false),
  customerSatisfied: boolean('customer_satisfied').default(false),
  vulnerabilityMarker: boolean('vulnerability_marker').default(false),
  depositPaid: boolean('deposit_paid').default(false),
  vehiclePurchased: boolean('vehicle_purchased').default(false),
  enquiry: boolean('enquiry').default(false),
  gdprConsent: boolean('gdpr_consent').default(false),
  salesMarketingConsent: boolean('sales_marketing_consent').default(false),
  
  // Vulnerability Support
  requiresAdditionalSupport: boolean('requires_additional_support').default(false),
  
  // New Completion Checklist Fields
  wheelNuts: boolean('wheel_nuts').default(false),
  tyrePressures: boolean('tyre_pressures').default(false),
  tyreSensors: boolean('tyre_sensors').default(false),
  oilLevel: boolean('oil_level').default(false),
  coolantLevel: boolean('coolant_level').default(false),
  screenWash: boolean('screen_wash').default(false),
  lockingNutGloveBox: boolean('locking_nut_glove_box').default(false),
  bookPackGloveBox: boolean('book_pack_glove_box').default(false),
  inflationKit: boolean('inflation_kit').default(false),
  keyBatteries: boolean('key_batteries').default(false),
  batteryTest: boolean('battery_test').default(false),
  testDriver: boolean('test_driver').default(false),
  adequateDriveAwayFuel: boolean('adequate_drive_away_fuel').default(false),
  washerJets: boolean('washer_jets').default(false),
  wipers: boolean('wipers').default(false),
  bulbs: boolean('bulbs').default(false),
  additionalText: text('additional_text'),
  completionDate: timestamp('completion_date'),
  
  // Additional Notes
  notes: text('notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  customerFk: foreignKey({
    columns: [table.customerId],
    foreignColumns: [customers.id],
  }),
  stockIdIdx: index('idx_sale_details_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_sale_details_dealer_id').on(table.dealerId),
  customerIdIdx: index('idx_sale_details_customer_id').on(table.customerId),
  saleDateIdx: index('idx_sale_details_sale_date').on(table.saleDate),
}))

// Service Details Form - Records service history and maintenance information
export const serviceDetails = pgTable('service_details', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Stock identification fields
  stockReference: varchar('stock_reference', { length: 255 }),
  registration: varchar('registration', { length: 50 }),
  
  // Service Information
  serviceHistory: varchar('service_history', { length: 20 }).notNull(), // 'full', 'part', 'limited'
  numberOfServices: integer('number_of_services'),
  lastServiceDate: date('last_service_date'),
  majorServiceWork: varchar('major_service_work', { length: 300 }),
  notes: text('notes'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  stockIdIdx: index('idx_service_details_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_service_details_dealer_id').on(table.dealerId),
}))

// Detailed Margins Form - Calculates profit margins and VAT
export const detailedMargins = pgTable('detailed_margins', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Stock identification fields (added)
  registration: varchar('registration', { length: 50 }),
  
  // VAT Fields
  outlayOnVehicle: decimal('outlay_on_vehicle', { precision: 10, scale: 2 }),
  vatOnSpend: decimal('vat_on_spend', { precision: 10, scale: 2 }),
  vatOnPurchase: decimal('vat_on_purchase', { precision: 10, scale: 2 }),
  vatOnSalePrice: decimal('vat_on_sale_price', { precision: 10, scale: 2 }),
  vatToPay: decimal('vat_to_pay', { precision: 10, scale: 2 }), // Added field
  
  // Profit Margin Fields
  profitMarginPreCosts: decimal('profit_margin_pre_costs', { precision: 10, scale: 2 }),
  profitMarginPostCosts: decimal('profit_margin_post_costs', { precision: 10, scale: 2 }),
  profitMarginPreVat: decimal('profit_margin_pre_vat', { precision: 10, scale: 2 }),
  profitMarginPostVat: decimal('profit_margin_post_vat', { precision: 10, scale: 2 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  stockIdIdx: index('idx_detailed_margins_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_detailed_margins_dealer_id').on(table.dealerId),
}))

// Return Costs Form - Records return and refund costs
export const returnCosts = pgTable('return_costs', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Stock identification fields
  stockReference: varchar('stock_reference', { length: 255 }),
  registration: varchar('registration', { length: 50 }),
  
  // Dynamic cost entries stored as JSON
  vatableCosts: jsonb('vatable_costs').default('[]'), // Array of {id, description, price}
  nonVatableCosts: jsonb('non_vatable_costs').default('[]'), // Array of {id, description, price}
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  stockIdIdx: index('idx_return_costs_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_return_costs_dealer_id').on(table.dealerId),
}))

// Generate Invoice Form - Creates invoices for sales
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Stock identification fields (added)
  stockReference: varchar('stock_reference', { length: 255 }),
  registration: varchar('registration', { length: 50 }),
  
  // Invoice Identification
  invoiceNumber: varchar('invoice_number', { length: 100 }).notNull().unique(),
  invoiceTo: varchar('invoice_to', { length: 255 }),
  
  // Vehicle Information
  vehicleRegistration: varchar('vehicle_registration', { length: 50 }),
  make: varchar('make', { length: 100 }),
  model: varchar('model', { length: 100 }),
  colour: varchar('colour', { length: 50 }),
  vin: varchar('vin', { length: 100 }),
  derivative: varchar('derivative', { length: 255 }),
  fuelType: varchar('fuel_type', { length: 50 }),
  engineNumber: varchar('engine_number', { length: 100 }),
  engineCapacity: varchar('engine_capacity', { length: 50 }),
  firstRegDate: timestamp('first_reg_date'),
  
  // Sale Information
  saleType: varchar('sale_type', { length: 50 }),
  salePrice: decimal('sale_price', { precision: 10, scale: 2 }),
  dateOfSale: timestamp('date_of_sale'),
  monthOfSale: varchar('month_of_sale', { length: 20 }),
  quarterOfSale: integer('quarter_of_sale'),
  costOfPurchase: decimal('cost_of_purchase', { precision: 10, scale: 2 }),
  dateOfPurchase: timestamp('date_of_purchase'),
  daysInStock: integer('days_in_stock'),
  
  // Customer Information
  customerTitle: varchar('customer_title', { length: 20 }),
  customerFirstName: varchar('customer_first_name', { length: 255 }),
  customerMiddleName: varchar('customer_middle_name', { length: 255 }),
  customerSurname: varchar('customer_surname', { length: 255 }),
  customerAddress: jsonb('customer_address'), // {street, address2, city, county, postCode, country}
  customerContactNumber: varchar('customer_contact_number', { length: 50 }),
  customerEmailAddress: varchar('customer_email_address', { length: 255 }),
  
  // Finance Information
  financeCompany: varchar('finance_company', { length: 255 }),
  financeCompanyName: varchar('finance_company_name', { length: 255 }),
  financeAddress: text('finance_address'),
  
  // Warranty and Add-ons
  warrantyLevel: varchar('warranty_level', { length: 100 }),
  warrantyPrice: decimal('warranty_price', { precision: 10, scale: 2 }),
  warrantyDetails: text('warranty_details'),
  addons: jsonb('addons'), // Array of addon objects
  
  // Deposit and Delivery
  depositAmount: decimal('deposit_amount', { precision: 10, scale: 2 }),
  deliveryDate: timestamp('delivery_date'),
  deliveryLocation: varchar('delivery_location', { length: 255 }),
  collection: varchar('collection', { length: 50 }).default('FREE'), // input_32 - Collection (readonly "FREE")
  
  // Discounts and Payments
  discounts: jsonb('discounts'), // Array of discount objects
  payments: jsonb('payments'), // Array of payment objects
  
  // Balance Information
  totalBalance: decimal('total_balance', { precision: 10, scale: 2 }),
  outstandingBalance: decimal('outstanding_balance', { precision: 10, scale: 2 }),
  
  // Status and Validation
  status: varchar('status', { length: 50 }).notNull().default('draft'), // draft, finalized, sent, paid
  checklistValidated: boolean('checklist_validated').default(false),
  
  // Additional Data
  additionalData: jsonb('additional_data'), // For any extra form fields
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  stockIdIdx: index('idx_invoices_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_invoices_dealer_id').on(table.dealerId),
  invoiceNumberIdx: index('idx_invoices_invoice_number').on(table.invoiceNumber),
  statusIdx: index('idx_invoices_status').on(table.status),
}))

// Add Costs Form - Records various vehicle-related costs
export const vehicleCosts = pgTable('vehicle_costs', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Stock identification fields (added)
  registration: varchar('registration', { length: 50 }),
  
  // Fixed Costs
  transportIn: decimal('transport_in', { precision: 10, scale: 2 }),
  transportOut: decimal('transport_out', { precision: 10, scale: 2 }),
  mot: decimal('mot', { precision: 10, scale: 2 }),
  
  // Grouped Costs (stored as JSON for flexible structure)
  exVatCosts: jsonb('ex_vat_costs'), // { service: [...], parts: [...], repairs: [...], dents: [...], bodyshop: [...] }
  incVatCosts: jsonb('inc_vat_costs'), // { service: [...], parts: [...], repairs: [...], dents: [...], bodyshop: [...] }
  
  // Calculated totals (for performance) - restored
  fixedCostsTotal: decimal('fixed_costs_total', { precision: 10, scale: 2 }),
  exVatCostsTotal: decimal('ex_vat_costs_total', { precision: 10, scale: 2 }),
  incVatCostsTotal: decimal('inc_vat_costs_total', { precision: 10, scale: 2 }),
  grandTotal: decimal('grand_total', { precision: 10, scale: 2 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  stockIdIdx: index('idx_vehicle_costs_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_vehicle_costs_dealer_id').on(table.dealerId),
}))

// Purchase Info Form - Updates inventory details
export const inventoryDetails = pgTable('inventory_details', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull().unique(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Purchase Info Fields
  registration: varchar('registration', { length: 50 }), // Vehicle registration (read-only)
  dateOfPurchase: timestamp('date_of_purchase'),
  costOfPurchase: decimal('cost_of_purchase', { precision: 10, scale: 2 }), // Purchase cost
  purchaseFrom: varchar('purchase_from', { length: 255 }), // Who/where the vehicle was purchased from
  
  // Funding Fields
  fundingAmount: decimal('funding_amount', { precision: 10, scale: 2 }), // Amount funded from external source
  fundingSourceId: uuid('funding_source_id'), // Reference to fund source
  businessAmount: decimal('business_amount', { precision: 10, scale: 2 }), // Calculated: costOfPurchase - fundingAmount
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  fundingSourceFk: foreignKey({
    columns: [table.fundingSourceId],
    foreignColumns: [fundSources.id],
  }),
  stockIdIdx: index('idx_inventory_details_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_inventory_details_dealer_id').on(table.dealerId),
  fundingSourceIdIdx: index('idx_inventory_details_funding_source_id').on(table.fundingSourceId),
}))

// Add Checklist Form - Vehicle checklist items
export const vehicleChecklist = pgTable('vehicle_checklist', {
  id: serial('id').primaryKey(),
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Reference to stock
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Stock identification fields (added)
  registration: varchar('registration', { length: 50 }),
  
  // Checklist Fields
  userManual: text('user_manual'),
  numberOfKeys: text('number_of_keys'),
  serviceBook: text('service_book'),
  wheelLockingNut: text('wheel_locking_nut'),
  cambeltChainConfirmation: text('cambelt_chain_confirmation'),
  
  // Completion Status (calculated field)
  completionPercentage: integer('completion_percentage').default(0),
  isComplete: boolean('is_complete').default(false),
  
  // Metadata for custom questions and other flexible data
  metadata: jsonb('metadata'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  stockIdIdx: index('idx_vehicle_checklist_stock_id').on(table.stockId),
  dealerIdIdx: index('idx_vehicle_checklist_dealer_id').on(table.dealerId),
}))

// ================================
// STOCK ACTION FORMS RELATIONS
// ================================

// Sale Details Relations
export const saleDetailsRelations = relations(saleDetails, ({ one }) => ({
  dealer: one(dealers, {
    fields: [saleDetails.dealerId],
    references: [dealers.id],
  }),
  customer: one(customers, {
    fields: [saleDetails.customerId],
    references: [customers.id],
  }),
}))

// Service Details Relations
export const serviceDetailsRelations = relations(serviceDetails, ({ one }) => ({
  dealer: one(dealers, {
    fields: [serviceDetails.dealerId],
    references: [dealers.id],
  }),
}))

// Detailed Margins Relations
export const detailedMarginsRelations = relations(detailedMargins, ({ one }) => ({
  dealer: one(dealers, {
    fields: [detailedMargins.dealerId],
    references: [dealers.id],
  }),
}))

// Return Costs Relations
export const returnCostsRelations = relations(returnCosts, ({ one }) => ({
  dealer: one(dealers, {
    fields: [returnCosts.dealerId],
    references: [dealers.id],
  }),
}))

// Invoices Relations
export const invoicesRelations = relations(invoices, ({ one }) => ({
  dealer: one(dealers, {
    fields: [invoices.dealerId],
    references: [dealers.id],
  }),
}))

// Vehicle Costs Relations
export const vehicleCostsRelations = relations(vehicleCosts, ({ one }) => ({
  dealer: one(dealers, {
    fields: [vehicleCosts.dealerId],
    references: [dealers.id],
  }),
}))

// Inventory Details Relations
export const inventoryDetailsRelations = relations(inventoryDetails, ({ one }) => ({
  dealer: one(dealers, {
    fields: [inventoryDetails.dealerId],
    references: [dealers.id],
  }),
  fundingSource: one(fundSources, {
    fields: [inventoryDetails.fundingSourceId],
    references: [fundSources.id],
  }),
}))

// Vehicle Checklist Relations
export const vehicleChecklistRelations = relations(vehicleChecklist, ({ one }) => ({
  dealer: one(dealers, {
    fields: [vehicleChecklist.dealerId],
    references: [dealers.id],
  }),
}))

// Update dealers relations to include all stock action forms
export const dealersRelationsWithStockActions = relations(dealers, ({ many }) => ({
  inquiries: many(inquiries),
  contactSubmissions: many(contactSubmissions),
  assignedJoinSubmissions: many(joinSubmissions, { relationName: 'assignedDealer' }),
  assignedRequests: many(requests, { relationName: 'assignedDealer' }),
  assignedUserAssignments: many(userAssignments, { relationName: 'assignedByDealer' }),
  dealerUserAssignments: many(userAssignments, { relationName: 'dealerAssignments' }),
  assignedStoreConfigs: many(storeConfig, { relationName: 'assignedByDealer' }),
  teamMembers: many(teamMembers),
  stockCacheEntries: many(stockCache),
  templates: many(templates),
  stockImages: many(stockImages),
  // Stock Action Forms Relations
  saleDetails: many(saleDetails),
  detailedMargins: many(detailedMargins),
  returnCosts: many(returnCosts),
  invoices: many(invoices),
  vehicleCosts: many(vehicleCosts),
  inventoryDetails: many(inventoryDetails),
  vehicleChecklists: many(vehicleChecklist),
}))

// ================================
// STOCK ACTION FORMS TYPES
// ================================

// Sale Details Types
export type SaleDetails = typeof saleDetails.$inferSelect
export type NewSaleDetails = typeof saleDetails.$inferInsert

// Service Details Types
export type ServiceDetails = typeof serviceDetails.$inferSelect
export type NewServiceDetails = typeof serviceDetails.$inferInsert

// Detailed Margins Types
export type DetailedMargins = typeof detailedMargins.$inferSelect
export type NewDetailedMargins = typeof detailedMargins.$inferInsert

// Return Costs Types
export type ReturnCosts = typeof returnCosts.$inferSelect
export type NewReturnCosts = typeof returnCosts.$inferInsert

// Invoices Types
export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

// Vehicle Costs Types
export type VehicleCosts = typeof vehicleCosts.$inferSelect
export type NewVehicleCosts = typeof vehicleCosts.$inferInsert

// Vehicle Job Cards Types
export type VehicleJobCard = typeof vehicleJobCards.$inferSelect
export type NewVehicleJobCard = typeof vehicleJobCards.$inferInsert

// Inventory Details Types
export type InventoryDetails = typeof inventoryDetails.$inferSelect
export type NewInventoryDetails = typeof inventoryDetails.$inferInsert

// Vehicle Checklist Types
export type VehicleChecklist = typeof vehicleChecklist.$inferSelect
export type NewVehicleChecklist = typeof vehicleChecklist.$inferInsert

// Kanban boards table
export const kanbanBoards = pgTable('kanban_boards', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  dealerId: uuid('dealer_id').notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(), // Clerk user ID
  isDefault: boolean('is_default').notNull().default(false),
  color: varchar('color', { length: 50 }).default('#3b82f6'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
}))

// Kanban columns table
export const kanbanColumns = pgTable('kanban_columns', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  position: integer('position').notNull(),
  color: varchar('color', { length: 50 }).default('#6b7280'),
  limitWip: integer('limit_wip'), // Work in progress limit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  boardFk: foreignKey({
    columns: [table.boardId],
    foreignColumns: [kanbanBoards.id],
  }),
}))

// Kanban tasks table
export const kanbanTasks = pgTable('kanban_tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  boardId: uuid('board_id').notNull(),
  columnId: uuid('column_id').notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // low, medium, high, urgent
  assignedTo: varchar('assigned_to', { length: 255 }), // Clerk user ID
  createdBy: varchar('created_by', { length: 255 }).notNull(), // Clerk user ID
  dueDate: timestamp('due_date'),
  position: integer('position').notNull(),
  tags: text('tags').array(), // Array of tags
  checklist: jsonb('checklist'), // Checklist items
  attachments: jsonb('attachments'), // File attachments
  stockId: varchar('stock_id', { length: 255 }), // Link to vehicle stock if applicable
  estimatedHours: integer('estimated_hours'),
  actualHours: integer('actual_hours'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  boardFk: foreignKey({
    columns: [table.boardId],
    foreignColumns: [kanbanBoards.id],
  }),
  columnFk: foreignKey({
    columns: [table.columnId],
    foreignColumns: [kanbanColumns.id],
  }),
}))

// ================================
// VEHICLE JOB CARDS
// ================================

// Vehicle Job Cards Table - Dedicated table for vehicle service/repair jobs
export const vehicleJobCards = pgTable('vehicle_job_cards', {
  // Primary identification
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Vehicle Information
  stockId: varchar('stock_id', { length: 255 }).notNull(), // Actual stock ID from inventory
  registration: varchar('registration', { length: 50 }).notNull(), // Vehicle registration number
  
  // Job Details
  jobType: varchar('job_type', { length: 500 }).notNull(), // What work is being done
  garageDetails: text('garage_details'), // Free-text description of work
  jobCategory: varchar('job_category', { length: 100 }).notNull(), // Category from JOB_CATEGORIES
  
  // Workflow Status
  status: varchar('status', { length: 50 }).notNull().default('todo'), // Workflow column
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // Task priority
  
  // Time Tracking
  estimatedHours: integer('estimated_hours'),
  actualHours: integer('actual_hours'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  
  // Cost Information
  estimatedCost: decimal('estimated_cost', { precision: 10, scale: 2 }), // Initial estimate
  actualCost: decimal('actual_cost', { precision: 10, scale: 2 }), // Final cost
  costDescription: text('cost_description'), // Description for cost entry
  costsSubmitted: boolean('costs_submitted').default(false), // Whether costs are in vehicle_costs
  costsSubmittedAt: timestamp('costs_submitted_at'), // When costs were submitted
  
  // Assignment and Tracking
  assignedTo: varchar('assigned_to', { length: 255 }), // Clerk user ID of technician
  createdBy: varchar('created_by', { length: 255 }).notNull(), // Clerk user ID of creator
  
  // Additional Data
  notes: text('notes'), // Internal notes
  customerNotes: text('customer_notes'), // Customer-visible notes
  attachments: jsonb('attachments'), // Photos, documents
  jobs: jsonb('jobs'), // Array of individual jobs for this vehicle
  dueDate: timestamp('due_date'), // When the job is due
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Foreign Key Constraints
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  stockFk: foreignKey({
    columns: [table.stockId],
    foreignColumns: [stockCache.stockId],
  }),
  
  // Indexes for Performance
  dealerIdIdx: index('idx_vehicle_job_cards_dealer_id').on(table.dealerId),
  stockIdIdx: index('idx_vehicle_job_cards_stock_id').on(table.stockId),
  registrationIdx: index('idx_vehicle_job_cards_registration').on(table.registration),
  statusIdx: index('idx_vehicle_job_cards_status').on(table.status),
  assignedToIdx: index('idx_vehicle_job_cards_assigned_to').on(table.assignedTo),
  createdAtIdx: index('idx_vehicle_job_cards_created_at').on(table.createdAt),
  jobCategoryIdx: index('idx_vehicle_job_cards_job_category').on(table.jobCategory),
  
  // Composite indexes for common queries
  dealerStatusIdx: index('idx_vehicle_job_cards_dealer_status').on(table.dealerId, table.status),
  dealerRegistrationIdx: index('idx_vehicle_job_cards_dealer_registration').on(table.dealerId, table.registration),
}));

// Task comments table
export const kanbanTaskComments = pgTable('kanban_task_comments', {
  id: uuid('id').primaryKey().defaultRandom(),
  taskId: uuid('task_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  comment: text('comment').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  taskFk: foreignKey({
    columns: [table.taskId],
    foreignColumns: [kanbanTasks.id],
  }),
}))

// Kanban relations
export const kanbanBoardsRelations = relations(kanbanBoards, ({ many, one }) => ({
  columns: many(kanbanColumns),
  tasks: many(kanbanTasks),
  dealer: one(dealers, {
    fields: [kanbanBoards.dealerId],
    references: [dealers.id],
  }),
}))

export const kanbanColumnsRelations = relations(kanbanColumns, ({ many, one }) => ({
  board: one(kanbanBoards, {
    fields: [kanbanColumns.boardId],
    references: [kanbanBoards.id],
  }),
  tasks: many(kanbanTasks),
}))

export const kanbanTasksRelations = relations(kanbanTasks, ({ many, one }) => ({
  board: one(kanbanBoards, {
    fields: [kanbanTasks.boardId],
    references: [kanbanBoards.id],
  }),
  column: one(kanbanColumns, {
    fields: [kanbanTasks.columnId],
    references: [kanbanColumns.id],
  }),
  comments: many(kanbanTaskComments),
}))

export const kanbanTaskCommentsRelations = relations(kanbanTaskComments, ({ one }) => ({
  task: one(kanbanTasks, {
    fields: [kanbanTaskComments.taskId],
    references: [kanbanTasks.id],
  }),
}))

// Templates table - stores template files metadata
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull(), // 'logos', 'images', 'banners', 'stock'
  fileName: varchar('file_name', { length: 255 }).notNull(), // Original filename
  supabaseFileName: varchar('supabase_file_name', { length: 255 }).notNull(), // Filename in Supabase storage
  publicUrl: text('public_url').notNull(), // Supabase public URL
  fileSize: integer('file_size').notNull(), // File size in bytes
  mimeType: varchar('mime_type', { length: 100 }).notNull(), // File MIME type
  tags: jsonb('tags'), // Array of tags for searching
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerRef: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: 'templates_dealer_fk'
  }),
  dealerIdx: index('templates_dealer_idx').on(table.dealerId),
  categoryIdx: index('templates_category_idx').on(table.category),
}))

// Templates relations
export const templatesRelations = relations(templates, ({ one }) => ({
  dealer: one(dealers, {
    fields: [templates.dealerId],
    references: [dealers.id],
  }),
}))

// Kanban types
export type KanbanBoard = typeof kanbanBoards.$inferSelect
export type NewKanbanBoard = typeof kanbanBoards.$inferInsert
export type KanbanColumn = typeof kanbanColumns.$inferSelect
export type NewKanbanColumn = typeof kanbanColumns.$inferInsert
export type KanbanTask = typeof kanbanTasks.$inferSelect
export type NewKanbanTask = typeof kanbanTasks.$inferInsert
export type KanbanTaskComment = typeof kanbanTaskComments.$inferSelect
export type NewKanbanTaskComment = typeof kanbanTaskComments.$inferInsert

// Stock Images table - stores default stock images for vehicles
export const stockImages = pgTable('stock_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  fileName: varchar('file_name', { length: 255 }).notNull(), // Original filename
  supabaseFileName: varchar('supabase_file_name', { length: 255 }).notNull(), // Filename in Supabase storage
  publicUrl: text('public_url').notNull(), // Supabase public URL
  fileSize: integer('file_size').notNull(), // File size in bytes
  mimeType: varchar('mime_type', { length: 100 }).notNull(), // File MIME type
  tags: jsonb('tags'), // Array of tags for searching
  // Stock-specific fields (for future use)
  vehicleType: varchar('vehicle_type', { length: 100 }), // 'car', 'van', 'motorcycle', etc.
  imageType: varchar('image_type', { length: 50 }), // 'exterior', 'interior', 'engine', etc.
  isDefault: boolean('is_default').default(false), // Mark as default image for a vehicle type
  sortOrder: integer('sort_order').default(0), // For ordering images
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerRef: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: 'stock_images_dealer_fk'
  }),
  dealerIdx: index('stock_images_dealer_idx').on(table.dealerId),
  vehicleTypeIdx: index('stock_images_vehicle_type_idx').on(table.vehicleType),
  imageTypeIdx: index('stock_images_image_type_idx').on(table.imageType),
  defaultIdx: index('stock_images_default_idx').on(table.isDefault),
}))

// Stock Images relations
export const stockImagesRelations = relations(stockImages, ({ one }) => ({
  dealer: one(dealers, {
    fields: [stockImages.dealerId],
    references: [dealers.id],
  }),
}))

// Templates types
export type Template = typeof templates.$inferSelect
export type NewTemplate = typeof templates.$inferInsert

// Stock Images types
export type StockImage = typeof stockImages.$inferSelect
export type NewStockImage = typeof stockImages.$inferInsert

// ================================
// NOTIFICATIONS SCHEMA
// ================================

// Notification types enum - all possible notification categories
export const notificationTypes = [
  // Stock & Inventory
  'stock_added', 'stock_updated', 'stock_sold', 'stock_reserved', 'stock_expired',
  'low_stock_alert', 'price_change', 'stock_action_completed', 'stock_action_required',
  
  // Team & User Management
  'team_member_invited', 'team_member_joined', 'team_member_left', 'role_changed',
  'user_assigned_task', 'user_mentioned', 'permission_granted', 'permission_revoked',
  
  // Sales & Customer
  'sale_completed', 'customer_inquiry', 'lead_assigned', 'follow_up_required',
  'payment_received', 'payment_overdue', 'warranty_expiring', 'service_due',
  
  // Admin & System
  'join_request', 'join_request_submitted', 'join_request_approved', 'join_request_rejected',
  'contact_inquiry', 'system_maintenance', 'api_key_expiring', 'backup_completed', 'security_alert',
  
  // Kanban & Tasks
  'task_assigned', 'task_completed', 'task_overdue', 'task_commented',
  'task_created', 'task_updated', 'task_deleted', 'task_moved', 'task_status_changed',
  'task_due_soon', 'task_started', 'task_unassigned', 'task_comment',
  'board_created', 'board_shared', 'deadline_approaching', 'milestone_reached',
  
  // Financial
  'invoice_generated', 'invoice_paid', 'margin_alert', 'cost_threshold_exceeded',
  'financial_report_ready', 'tax_deadline_approaching',
  
  // Integration & External
  'autotrader_sync_completed', 'autotrader_sync_failed', 'api_rate_limit_warning',
  'external_service_down', 'data_import_completed',
  
  // General
  'system_announcement', 'feature_update', 'maintenance_scheduled', 'backup_reminder'
] as const

export type NotificationType = typeof notificationTypes[number]

// Notification priority levels
export const notificationPriorities = ['low', 'medium', 'high', 'urgent'] as const
export type NotificationPriority = typeof notificationPriorities[number]

// Notification delivery channels
export const notificationChannels = ['in_app', 'email', 'sms', 'push'] as const
export type NotificationChannel = typeof notificationChannels[number]

// Main notifications table
export const notifications = pgTable('notifications', {
  id: uuid('id').primaryKey().defaultRandom(),
  
  // Recipients and targeting
  recipientId: uuid('recipient_id').notNull(), // Dealer/user who receives the notification
  recipientType: varchar('recipient_type', { length: 50 }).notNull().default('user'), // 'user', 'team', 'role', 'all'
  senderId: uuid('sender_id'), // Who triggered the notification (can be null for system notifications)
  
  // Notification content
  type: varchar('type', { length: 100 }).notNull(), // From NotificationType enum
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  priority: varchar('priority', { length: 20 }).notNull().default('medium'), // From NotificationPriority enum
  
  // Metadata and context
  entityType: varchar('entity_type', { length: 50 }), // 'stock', 'task', 'user', 'invoice', etc.
  entityId: varchar('entity_id', { length: 255 }), // ID of the related entity
  metadata: jsonb('metadata'), // Additional context data
  
  // Action and navigation
  actionUrl: varchar('action_url', { length: 500 }), // Where to navigate when clicked
  actionLabel: varchar('action_label', { length: 100 }), // Text for action button
  
  // Delivery and status
  channels: text('channels').array().notNull().default(['in_app']), // Delivery channels
  isRead: boolean('is_read').notNull().default(false),
  isArchived: boolean('is_archived').notNull().default(false),
  readAt: timestamp('read_at'),
  
  // Scheduling and expiry
  scheduledFor: timestamp('scheduled_for'), // For delayed notifications
  expiresAt: timestamp('expires_at'), // When notification becomes irrelevant
  
  // Grouping and batching
  groupKey: varchar('group_key', { length: 255 }), // For grouping similar notifications
  batchId: uuid('batch_id'), // For batch operations
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Foreign key relationships
  recipientFk: foreignKey({
    columns: [table.recipientId],
    foreignColumns: [dealers.id],
  }),
  senderFk: foreignKey({
    columns: [table.senderId],
    foreignColumns: [dealers.id],
  }),
  
  // Indexes for performance
  recipientIdx: index('idx_notifications_recipient').on(table.recipientId),
  typeIdx: index('idx_notifications_type').on(table.type),
  priorityIdx: index('idx_notifications_priority').on(table.priority),
  isReadIdx: index('idx_notifications_is_read').on(table.isRead),
  createdAtIdx: index('idx_notifications_created_at').on(table.createdAt),
  scheduledForIdx: index('idx_notifications_scheduled_for').on(table.scheduledFor),
  expiresAtIdx: index('idx_notifications_expires_at').on(table.expiresAt),
  groupKeyIdx: index('idx_notifications_group_key').on(table.groupKey),
  entityIdx: index('idx_notifications_entity').on(table.entityType, table.entityId),
}))

// Notification preferences table - user-specific notification settings
export const notificationPreferences = pgTable('notification_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull(), // Reference to dealer/user
  
  // Global settings
  isEnabled: boolean('is_enabled').notNull().default(true),
  quietHoursStart: varchar('quiet_hours_start', { length: 5 }), // e.g., "22:00"
  quietHoursEnd: varchar('quiet_hours_end', { length: 5 }), // e.g., "08:00"
  timezone: varchar('timezone', { length: 50 }).default('Europe/London'),
  
  // Channel preferences (JSON object with notification types as keys)
  emailPreferences: jsonb('email_preferences').default('{}'), // { "stock_sold": true, "task_assigned": false }
  smsPreferences: jsonb('sms_preferences').default('{}'),
  pushPreferences: jsonb('push_preferences').default('{}'),
  inAppPreferences: jsonb('in_app_preferences').default('{}'),
  
  // Priority filtering
  minPriorityEmail: varchar('min_priority_email', { length: 20 }).default('medium'),
  minPrioritySms: varchar('min_priority_sms', { length: 20 }).default('high'),
  minPriorityPush: varchar('min_priority_push', { length: 20 }).default('medium'),
  
  // Frequency settings
  digestFrequency: varchar('digest_frequency', { length: 20 }).default('daily'), // 'immediate', 'hourly', 'daily', 'weekly'
  maxNotificationsPerHour: integer('max_notifications_per_hour').default(10),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  userFk: foreignKey({
    columns: [table.userId],
    foreignColumns: [dealers.id],
  }),
  userIdx: index('idx_notification_preferences_user').on(table.userId),
}))

// Notification delivery log - tracks actual delivery attempts
export const notificationDeliveryLog = pgTable('notification_delivery_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  notificationId: uuid('notification_id').notNull(),
  
  // Delivery details
  channel: varchar('channel', { length: 20 }).notNull(), // From NotificationChannel enum
  status: varchar('status', { length: 20 }).notNull(), // 'pending', 'sent', 'delivered', 'failed', 'bounced'
  
  // Provider details
  provider: varchar('provider', { length: 50 }), // 'clerk', 'sendgrid', 'twilio', etc.
  providerId: varchar('provider_id', { length: 255 }), // External provider's ID for this delivery
  
  // Delivery metadata
  recipientAddress: varchar('recipient_address', { length: 255 }), // Email, phone number, etc.
  errorMessage: text('error_message'),
  responseData: jsonb('response_data'), // Provider response
  
  // Timing
  sentAt: timestamp('sent_at'),
  deliveredAt: timestamp('delivered_at'),
  failedAt: timestamp('failed_at'),
  
  // Retry logic
  retryCount: integer('retry_count').default(0),
  nextRetryAt: timestamp('next_retry_at'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  notificationFk: foreignKey({
    columns: [table.notificationId],
    foreignColumns: [notifications.id],
  }),
  notificationIdx: index('idx_delivery_log_notification').on(table.notificationId),
  statusIdx: index('idx_delivery_log_status').on(table.status),
  channelIdx: index('idx_delivery_log_channel').on(table.channel),
  sentAtIdx: index('idx_delivery_log_sent_at').on(table.sentAt),
  nextRetryIdx: index('idx_delivery_log_next_retry').on(table.nextRetryAt),
}))

// Notification templates - reusable notification templates
export const notificationTemplates = pgTable('notification_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id'), // Null for system templates, specific dealer for custom templates
  
  // Template identification
  type: varchar('type', { length: 100 }).notNull(), // From NotificationType enum
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  
  // Template content (supports variables like {{userName}}, {{stockId}}, etc.)
  titleTemplate: varchar('title_template', { length: 255 }).notNull(),
  messageTemplate: text('message_template').notNull(),
  
  // Default settings
  defaultPriority: varchar('default_priority', { length: 20 }).default('medium'),
  defaultChannels: text('default_channels').array().default(['in_app']),
  
  // Template metadata
  variables: jsonb('variables'), // Array of available variables for this template
  isActive: boolean('is_active').notNull().default(true),
  isSystem: boolean('is_system').notNull().default(false), // System templates vs custom templates
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdx: index('idx_notification_templates_dealer').on(table.dealerId),
  typeIdx: index('idx_notification_templates_type').on(table.type),
  isActiveIdx: index('idx_notification_templates_is_active').on(table.isActive),
}))

// ================================
// NOTIFICATION RELATIONS
// ================================

export const notificationsRelations = relations(notifications, ({ one, many }) => ({
  recipient: one(dealers, {
    fields: [notifications.recipientId],
    references: [dealers.id],
    relationName: 'receivedNotifications',
  }),
  sender: one(dealers, {
    fields: [notifications.senderId],
    references: [dealers.id],
    relationName: 'sentNotifications',
  }),
  deliveryLogs: many(notificationDeliveryLog),
}))

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(dealers, {
    fields: [notificationPreferences.userId],
    references: [dealers.id],
  }),
}))

export const notificationDeliveryLogRelations = relations(notificationDeliveryLog, ({ one }) => ({
  notification: one(notifications, {
    fields: [notificationDeliveryLog.notificationId],
    references: [notifications.id],
  }),
}))

export const notificationTemplatesRelations = relations(notificationTemplates, ({ one }) => ({
  dealer: one(dealers, {
    fields: [notificationTemplates.dealerId],
    references: [dealers.id],
  }),
}))

// Update dealers relations to include notifications and company settings
export const dealersRelationsWithNotifications = relations(dealers, ({ many, one }) => ({
  inquiries: many(inquiries),
  contactSubmissions: many(contactSubmissions),
  assignedJoinSubmissions: many(joinSubmissions, { relationName: 'assignedDealer' }),
  assignedRequests: many(requests, { relationName: 'assignedDealer' }),
  assignedUserAssignments: many(userAssignments, { relationName: 'assignedByDealer' }),
  dealerUserAssignments: many(userAssignments, { relationName: 'dealerAssignments' }),
  assignedStoreConfigs: many(storeConfig, { relationName: 'assignedByDealer' }),
  teamMembers: many(teamMembers),
  stockCacheEntries: many(stockCache),
  templates: many(templates),
  stockImages: many(stockImages),
  // Stock Action Forms Relations
  saleDetails: many(saleDetails),
  detailedMargins: many(detailedMargins),
  returnCosts: many(returnCosts),
  invoices: many(invoices),
  vehicleCosts: many(vehicleCosts),
  inventoryDetails: many(inventoryDetails),
  vehicleChecklists: many(vehicleChecklist),
  // Notification Relations
  receivedNotifications: many(notifications, { relationName: 'receivedNotifications' }),
  sentNotifications: many(notifications, { relationName: 'sentNotifications' }),
  notificationPreferences: many(notificationPreferences),
  notificationTemplates: many(notificationTemplates),
  // Company Settings Relation
  companySettings: one(companySettings),
}))

// ================================
// COMPANY SETTINGS SCHEMA
// ================================

// Company Settings table - stores company information for each dealer
export const companySettings = pgTable('company_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull().unique(), // One company setting per dealer
  
  // Basic Company Information
  companyName: varchar('company_name', { length: 255 }),
  businessType: varchar('business_type', { length: 100 }),
  establishedYear: varchar('established_year', { length: 4 }),
  registrationNumber: varchar('registration_number', { length: 100 }),
  vatNumber: varchar('vat_number', { length: 50 }),
  
  // Company Logo - stored in Supabase storage
  companyLogoFileName: varchar('company_logo_file_name', { length: 255 }), // Original filename
  companyLogoSupabaseFileName: varchar('company_logo_supabase_file_name', { length: 255 }), // Supabase storage filename
  companyLogoPublicUrl: text('company_logo_public_url'), // Supabase public URL
  companyLogoFileSize: integer('company_logo_file_size'), // File size in bytes
  companyLogoMimeType: varchar('company_logo_mime_type', { length: 100 }), // e.g., 'image/png'
  
  // QR Code - stored as base64 or URL
  qrCodeFileName: varchar('qr_code_file_name', { length: 255 }), // Original filename
  qrCodeSupabaseFileName: varchar('qr_code_supabase_file_name', { length: 255 }), // Supabase storage filename
  qrCodePublicUrl: text('qr_code_public_url'), // Supabase public URL or base64 data
  qrCodeFileSize: integer('qr_code_file_size'), // File size in bytes
  qrCodeMimeType: varchar('qr_code_mime_type', { length: 100 }), // e.g., 'image/png'
  
  // Address Information
  addressStreet: varchar('address_street', { length: 255 }),
  addressCity: varchar('address_city', { length: 100 }),
  addressCounty: varchar('address_county', { length: 100 }),
  addressPostCode: varchar('address_post_code', { length: 20 }),
  addressCountry: varchar('address_country', { length: 100 }).default('United Kingdom'),
  
  // Contact Information
  contactPhone: varchar('contact_phone', { length: 50 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  contactWebsite: varchar('contact_website', { length: 255 }),
  contactFax: varchar('contact_fax', { length: 50 }),
  
  // Payment/Banking Information
  bankName: varchar('bank_name', { length: 255 }),
  bankSortCode: varchar('bank_sort_code', { length: 20 }),
  bankAccountNumber: varchar('bank_account_number', { length: 50 }),
  bankAccountName: varchar('bank_account_name', { length: 255 }),
  bankIban: varchar('bank_iban', { length: 50 }),
  bankSwiftCode: varchar('bank_swift_code', { length: 20 }),
  
  // Additional Information
  description: text('description'),
  mission: text('mission'),
  vision: text('vision'),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdIdx: index('idx_company_settings_dealer_id').on(table.dealerId),
}))

// Company Settings Relations
export const companySettingsRelations = relations(companySettings, ({ one }) => ({
  dealer: one(dealers, {
    fields: [companySettings.dealerId],
    references: [dealers.id],
  }),
}))

// ================================
// NOTIFICATION TYPES
// ================================

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

export type NotificationPreferences = typeof notificationPreferences.$inferSelect
export type NewNotificationPreferences = typeof notificationPreferences.$inferInsert

export type NotificationDeliveryLog = typeof notificationDeliveryLog.$inferSelect
export type NewNotificationDeliveryLog = typeof notificationDeliveryLog.$inferInsert

export type NotificationTemplate = typeof notificationTemplates.$inferSelect
export type NewNotificationTemplate = typeof notificationTemplates.$inferInsert

// Company Settings Types
export type CompanySettings = typeof companySettings.$inferSelect
export type NewCompanySettings = typeof companySettings.$inferInsert

// ================================
// VEHICLE DOCUMENTS SCHEMA
// ================================

// Vehicle Documents table - stores vehicle-related documents
export const vehicleDocuments = pgTable('vehicle_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(),
  stockId: varchar('stock_id', { length: 255 }), // Reference to stock (can be null for documents uploaded before stock creation)
  registration: varchar('registration', { length: 20 }).notNull(), // Vehicle registration number (primary identifier)
  
  // Document Information
  documentName: varchar('document_name', { length: 255 }).notNull(), // User-friendly name for the document
  documentType: varchar('document_type', { length: 100 }).notNull(), // Type of document (e.g., 'v5c', 'mot', 'service_history', etc.)
  description: text('description'), // Optional description of the document
  
  // File Storage Information (following existing pattern from stock_images/templates)
  fileName: varchar('file_name', { length: 255 }).notNull(), // Original filename
  supabaseFileName: varchar('supabase_file_name', { length: 255 }).notNull(), // Filename in Supabase storage
  publicUrl: text('public_url').notNull(), // Supabase public URL
  fileSize: integer('file_size').notNull(), // File size in bytes
  mimeType: varchar('mime_type', { length: 100 }).notNull(), // File MIME type
  
  // Document Metadata
  tags: jsonb('tags'), // Array of tags for searching and categorization
  isRequired: boolean('is_required').default(false), // Whether this document type is required for the vehicle
  isVerified: boolean('is_verified').default(false), // Whether the document has been verified by staff
  verifiedBy: varchar('verified_by', { length: 255 }), // Clerk user ID of who verified the document
  verifiedAt: timestamp('verified_at'), // When the document was verified
  expiryDate: timestamp('expiry_date'), // For documents that expire (MOT, insurance, etc.)
  documentDate: timestamp('document_date'), // Date the document was issued/created
  
  // Upload Information
  uploadedBy: varchar('uploaded_by', { length: 255 }).notNull(), // Clerk user ID of who uploaded the document
  uploadSource: varchar('upload_source', { length: 50 }).notNull().default('manual'), // 'manual', 'add_to_stock', 'bulk_upload', 'api'
  
  // Status and Workflow
  status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'archived', 'deleted', 'pending_review'
  visibility: varchar('visibility', { length: 50 }).notNull().default('internal'), // 'internal', 'customer', 'public'
  
  // Additional Metadata
  metadata: jsonb('metadata'), // Additional flexible data storage
  sortOrder: integer('sort_order').default(0), // For ordering documents
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdIdx: index('idx_vehicle_documents_dealer_id').on(table.dealerId),
  registrationIdx: index('idx_vehicle_documents_registration').on(table.registration),
  stockIdIdx: index('idx_vehicle_documents_stock_id').on(table.stockId),
  documentTypeIdx: index('idx_vehicle_documents_document_type').on(table.documentType),
  statusIdx: index('idx_vehicle_documents_status').on(table.status),
  uploadedByIdx: index('idx_vehicle_documents_uploaded_by').on(table.uploadedBy),
  expiryDateIdx: index('idx_vehicle_documents_expiry_date').on(table.expiryDate),
  createdAtIdx: index('idx_vehicle_documents_created_at').on(table.createdAt),
  regDealerIdx: index('idx_vehicle_documents_reg_dealer').on(table.registration, table.dealerId),
}))

// Document Categories table - manages document types
export const documentCategories = pgTable('document_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id'), // NULL for system-wide categories, specific dealer for custom categories
  categoryName: varchar('category_name', { length: 100 }).notNull(),
  displayName: varchar('display_name', { length: 255 }).notNull(),
  description: text('description'),
  isRequired: boolean('is_required').default(false), // Whether this category is required for all vehicles
  hasExpiry: boolean('has_expiry').default(false), // Whether documents in this category have expiry dates
  acceptsMultiple: boolean('accepts_multiple').default(true), // Whether multiple documents of this type are allowed per vehicle
  allowedMimeTypes: jsonb('allowed_mime_types'), // Array of allowed MIME types for this category
  maxFileSizeMb: integer('max_file_size_mb').default(10), // Maximum file size in MB
  isSystem: boolean('is_system').default(false), // System categories vs custom categories
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdIdx: index('idx_document_categories_dealer_id').on(table.dealerId),
  categoryNameIdx: index('idx_document_categories_category_name').on(table.categoryName),
  isActiveIdx: index('idx_document_categories_is_active').on(table.isActive),
}))

// Document Access Log table - audit trail
export const documentAccessLog = pgTable('document_access_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(), // Clerk user ID
  action: varchar('action', { length: 50 }).notNull(), // 'view', 'download', 'upload', 'update', 'delete', 'verify'
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6 address
  userAgent: text('user_agent'), // Browser/client information
  metadata: jsonb('metadata'), // Additional context data
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  documentFk: foreignKey({
    columns: [table.documentId],
    foreignColumns: [vehicleDocuments.id],
  }),
  documentIdIdx: index('idx_document_access_log_document_id').on(table.documentId),
  userIdIdx: index('idx_document_access_log_user_id').on(table.userId),
  actionIdx: index('idx_document_access_log_action').on(table.action),
  createdAtIdx: index('idx_document_access_log_created_at').on(table.createdAt),
}))

// ================================
// VEHICLE DOCUMENTS RELATIONS
// ================================

export const vehicleDocumentsRelations = relations(vehicleDocuments, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [vehicleDocuments.dealerId],
    references: [dealers.id],
  }),
  accessLogs: many(documentAccessLog),
}))

export const documentCategoriesRelations = relations(documentCategories, ({ one }) => ({
  dealer: one(dealers, {
    fields: [documentCategories.dealerId],
    references: [dealers.id],
  }),
}))

export const documentAccessLogRelations = relations(documentAccessLog, ({ one }) => ({
  document: one(vehicleDocuments, {
    fields: [documentAccessLog.documentId],
    references: [vehicleDocuments.id],
  }),
}))

// Update dealers relations to include vehicle documents
export const dealersRelationsWithDocuments = relations(dealers, ({ many, one }) => ({
  inquiries: many(inquiries),
  contactSubmissions: many(contactSubmissions),
  assignedJoinSubmissions: many(joinSubmissions, { relationName: 'assignedDealer' }),
  assignedRequests: many(requests, { relationName: 'assignedDealer' }),
  assignedUserAssignments: many(userAssignments, { relationName: 'assignedByDealer' }),
  dealerUserAssignments: many(userAssignments, { relationName: 'dealerAssignments' }),
  assignedStoreConfigs: many(storeConfig, { relationName: 'assignedByDealer' }),
  teamMembers: many(teamMembers),
  stockCacheEntries: many(stockCache),
  templates: many(templates),
  stockImages: many(stockImages),
  // Stock Action Forms Relations
  saleDetails: many(saleDetails),
  detailedMargins: many(detailedMargins),
  returnCosts: many(returnCosts),
  invoices: many(invoices),
  vehicleCosts: many(vehicleCosts),
  inventoryDetails: many(inventoryDetails),
  vehicleChecklists: many(vehicleChecklist),
  // Notification Relations
  receivedNotifications: many(notifications, { relationName: 'receivedNotifications' }),
  sentNotifications: many(notifications, { relationName: 'sentNotifications' }),
  notificationPreferences: many(notificationPreferences),
  notificationTemplates: many(notificationTemplates),
  // Company Settings Relation
  companySettings: one(companySettings),
  // Vehicle Documents Relations
  vehicleDocuments: many(vehicleDocuments),
  documentCategories: many(documentCategories),
}))

// ================================
// VEHICLE DOCUMENTS TYPES
// ================================

export type VehicleDocument = typeof vehicleDocuments.$inferSelect
export type NewVehicleDocument = typeof vehicleDocuments.$inferInsert

export type DocumentCategory = typeof documentCategories.$inferSelect
export type NewDocumentCategory = typeof documentCategories.$inferInsert

export type DocumentAccessLog = typeof documentAccessLog.$inferSelect
export type NewDocumentAccessLog = typeof documentAccessLog.$inferInsert

// ================================
// DEALERSHIP COSTS MANAGEMENT
// ================================

// Dealership Operating Costs - For tracking recurring and one-time costs
export const dealershipCosts = pgTable('dealership_costs', {
  id: serial('id').primaryKey(),
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Cost Details
  description: varchar('description', { length: 500 }).notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  hasVat: boolean('has_vat').default(false).notNull(),
  vatAmount: decimal('vat_amount', { precision: 10, scale: 2 }),
  totalAmount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(), // amount + vat
  
  // Cost Type and Frequency
  costType: varchar('cost_type', { length: 50 }).notNull(), // 'recurring', 'one_time', 'miscellaneous'
  frequency: varchar('frequency', { length: 20 }), // 'weekly', 'monthly', 'quarterly', 'annual' - null for one_time
  
  // Category for organization
  category: varchar('category', { length: 100 }).notNull(), // 'rent', 'utilities', 'insurance', 'maintenance', 'staff', 'marketing', 'other'
  
  // Date Information
  startDate: date('start_date'), // When recurring cost starts
  endDate: date('end_date'), // When recurring cost ends (optional)
  dueDate: date('due_date'), // For one-time or specific due dates
  
  // Status and Notes
  status: varchar('status', { length: 20 }).default('active').notNull(), // 'active', 'inactive', 'completed'
  notes: text('notes'),
  
  // Payment tracking
  isPaid: boolean('is_paid').default(false).notNull(),
  paidDate: date('paid_date'),
  paymentMethod: varchar('payment_method', { length: 50 }), // 'cash', 'card', 'bank_transfer', 'cheque', 'other'
  
  // Metadata
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  updatedBy: varchar('updated_by', { length: 255 }),
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdIdx: index('idx_dealership_costs_dealer_id').on(table.dealerId),
  categoryIdx: index('idx_dealership_costs_category').on(table.category),
  statusIdx: index('idx_dealership_costs_status').on(table.status),
  dueDateIdx: index('idx_dealership_costs_due_date').on(table.dueDate),
}))

// Cost Categories - Predefined categories for organization
export const costCategories = pgTable('cost_categories', {
  id: serial('id').primaryKey(),
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }).default('#6B7280'), // Hex color for UI
  icon: varchar('icon', { length: 50 }), // Icon name for UI
  isDefault: boolean('is_default').default(false), // System default categories
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdIdx: index('idx_cost_categories_dealer_id').on(table.dealerId),
  uniqueDealerName: unique('unique_dealer_category_name').on(table.dealerId, table.name),
}))

// ================================
// DEALERSHIP COSTS TYPES
// ================================

export type DealershipCost = typeof dealershipCosts.$inferSelect
export type NewDealershipCost = typeof dealershipCosts.$inferInsert

export type CostCategory = typeof costCategories.$inferSelect
export type NewCostCategory = typeof costCategories.$inferInsert

// ================================
// FUNDS MANAGEMENT TABLES
// ================================

// Fund Sources - Different financing sources for the dealership
export const fundSources = pgTable('fund_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  
  // Required fields
  fundName: varchar('fund_name', { length: 255 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  
  // Optional fields
  address: text('address'),
  contactPersonName: varchar('contact_person_name', { length: 255 }),
  mobileNumber: varchar('mobile_number', { length: 50 }),
  contactEmail: varchar('contact_email', { length: 255 }),
  
  // Additional metadata
  description: text('description'),
  interestRate: decimal('interest_rate', { precision: 5, scale: 2 }), // Interest rate if applicable
  repaymentTerms: text('repayment_terms'),
  status: varchar('status', { length: 50 }).notNull().default('active'), // active, inactive, closed
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  dealerIdIdx: index('idx_fund_sources_dealer_id').on(table.dealerId),
  statusIdx: index('idx_fund_sources_status').on(table.status),
  uniqueDealerFundName: unique('unique_dealer_fund_name').on(table.dealerId, table.fundName),
}))

// Fund Transactions - Track usage and repayment of funds
export const fundTransactions = pgTable('fund_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  dealerId: uuid('dealer_id').notNull(), // Reference to dealer
  fundSourceId: uuid('fund_source_id').notNull(), // Reference to fund source
  
  // Transaction details
  transactionType: varchar('transaction_type', { length: 50 }).notNull(), // 'usage', 'repayment', 'interest_payment'
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  description: text('description'),
  
  // Reference information
  referenceNumber: varchar('reference_number', { length: 100 }),
  vehicleStockId: varchar('vehicle_stock_id', { length: 255 }), // Optional reference to vehicle if used for purchase
  
  // Transaction metadata
  transactionDate: timestamp('transaction_date').defaultNow().notNull(),
  dueDate: timestamp('due_date'), // For repayments
  status: varchar('status', { length: 50 }).notNull().default('completed'), // completed, pending, cancelled
  
  // Additional information
  notes: text('notes'),
  attachments: jsonb('attachments'), // Store file references
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  fundSourceFk: foreignKey({
    columns: [table.fundSourceId],
    foreignColumns: [fundSources.id],
  }),
  // vehicleStockFk: foreignKey({
  //   columns: [table.vehicleStockId],
  //   foreignColumns: [stockCache.stockId],
  // }),
  dealerIdIdx: index('idx_fund_transactions_dealer_id').on(table.dealerId),
  fundSourceIdIdx: index('idx_fund_transactions_fund_source_id').on(table.fundSourceId),
  transactionTypeIdx: index('idx_fund_transactions_type').on(table.transactionType),
  transactionDateIdx: index('idx_fund_transactions_date').on(table.transactionDate),
  statusIdx: index('idx_fund_transactions_status').on(table.status),
}))

// ================================
// FUNDS MANAGEMENT RELATIONS
// ================================

export const fundSourcesRelations = relations(fundSources, ({ one, many }) => ({
  dealer: one(dealers, {
    fields: [fundSources.dealerId],
    references: [dealers.id],
  }),
  transactions: many(fundTransactions),
}))

export const fundTransactionsRelations = relations(fundTransactions, ({ one }) => ({
  dealer: one(dealers, {
    fields: [fundTransactions.dealerId],
    references: [dealers.id],
  }),
  fundSource: one(fundSources, {
    fields: [fundTransactions.fundSourceId],
    references: [fundSources.id],
  }),
  // vehicleStock: one(stockCache, {
  //   fields: [fundTransactions.vehicleStockId],
  //   references: [stockCache.stockId],
  // }),
}))

// ================================
// FUNDS MANAGEMENT TYPES
// ================================

export type FundSource = typeof fundSources.$inferSelect
export type NewFundSource = typeof fundSources.$inferInsert

export type FundTransaction = typeof fundTransactions.$inferSelect
export type NewFundTransaction = typeof fundTransactions.$inferInsert

// ================================
// SAVED INVOICES
// ================================

// Table to store saved invoices
export const savedInvoices = pgTable('saved_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 255 }).notNull(),
  stockId: varchar('stock_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  invoiceData: jsonb('invoice_data').notNull(), // Complete invoice data
  customerName: varchar('customer_name', { length: 255 }).notNull(), // For quick search
  vehicleRegistration: varchar('vehicle_registration', { length: 50 }).notNull(), // For quick search
  saleType: varchar('sale_type', { length: 50 }).notNull(), // Trade, Retail, Commercial
  invoiceType: varchar('invoice_type', { length: 100 }).notNull(), // Customer Invoice, Finance Company Invoice
  invoiceTo: varchar('invoice_to', { length: 100 }), // Finance Company, Customer
  totalAmount: varchar('total_amount', { length: 50 }).notNull(), // For display in listing
  remainingBalance: varchar('remaining_balance', { length: 50 }).default('0'), // Remaining balance to display
  isPaid: boolean('is_paid').default(false).notNull(), // Payment status toggle
  status: varchar('status', { length: 50 }).default('draft').notNull(), // draft, finalized
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow().notNull()
})

// Admin-managed dealer logos table
export const dealerLogos = pgTable('dealer_logos', {
  id: uuid('id').defaultRandom().primaryKey(),
  dealerId: uuid('dealer_id').notNull(), // Reference to dealers table
  
  // Logo file information
  logoFileName: varchar('logo_file_name', { length: 255 }), // Original filename
  logoSupabaseFileName: varchar('logo_supabase_file_name', { length: 255 }), // Supabase storage filename
  logoPublicUrl: text('logo_public_url'), // Supabase public URL
  logoFileSize: integer('logo_file_size'), // File size in bytes
  logoMimeType: varchar('logo_mime_type', { length: 100 }), // e.g., 'image/png'
  
  // Admin management
  assignedBy: uuid('assigned_by').notNull(), // Admin who assigned the logo
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
  
  // Status and metadata
  isActive: boolean('is_active').default(true).notNull(), // Can be disabled without deletion
  notes: text('notes'), // Admin notes about the logo assignment
  
  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Foreign key relationships
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
  }),
  assignedByFk: foreignKey({
    columns: [table.assignedBy],
    foreignColumns: [dealers.id],
  }),
  
  // Indexes for performance
  dealerIdIdx: index('idx_dealer_logos_dealer_id').on(table.dealerId),
  activeLogoIdx: index('idx_dealer_logos_active').on(table.dealerId, table.isActive),
}))

// Relations
export const savedInvoicesRelations = relations(savedInvoices, ({ one }) => ({
  user: one(dealers, {
    fields: [savedInvoices.userId],
    references: [dealers.clerkUserId]
  })
}))

export const dealerLogosRelations = relations(dealerLogos, ({ one }) => ({
  dealer: one(dealers, {
    fields: [dealerLogos.dealerId],
    references: [dealers.id]
  }),
  assignedByAdmin: one(dealers, {
    fields: [dealerLogos.assignedBy],
    references: [dealers.id]
  })
}))

// Custom Invoices table for user-generated invoices
export const customInvoices = pgTable("custom_invoices", {
  id: uuid().defaultRandom().primaryKey(),
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
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).default('0'),
  vatRate: decimal("vat_rate", { precision: 5, scale: 2 }).default('20.00'),
  vatAmount: decimal("vat_amount", { precision: 10, scale: 2 }).default('0'),
  total: decimal({ precision: 10, scale: 2 }).default('0'),
  vatMode: varchar("vat_mode", { length: 20 }).default('global'),
  discountMode: varchar("discount_mode", { length: 20 }).default('global'),
  globalDiscountType: varchar("global_discount_type", { length: 20 }).default('percentage'),
  globalDiscountValue: decimal("global_discount_value", { precision: 10, scale: 2 }).default('0'),
  globalDiscountAmount: decimal("global_discount_amount", { precision: 10, scale: 2 }).default('0'),
  totalDiscount: decimal("total_discount", { precision: 10, scale: 2 }).default('0'),
  subtotalAfterDiscount: decimal("subtotal_after_discount", { precision: 10, scale: 2 }).default('0'),
  
  // Payment Information
  paymentStatus: varchar("payment_status", { length: 20 }).default('unpaid'),
  payments: jsonb().default('[]'),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).default('0'),
  outstandingBalance: decimal("outstanding_balance", { precision: 10, scale: 2 }).default('0'),
  
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
}, (table) => ({
  dealerIdIdx: index("idx_custom_invoices_dealer_id").on(table.dealerId),
  invoiceNumberIdx: index("idx_custom_invoices_invoice_number").on(table.invoiceNumber),
  statusIdx: index("idx_custom_invoices_status").on(table.status),
  createdByIdx: index("idx_custom_invoices_created_by").on(table.createdBy),
  paymentStatusIdx: index("idx_custom_invoices_payment_status").on(table.paymentStatus),
  dealerInvoiceNumberUnique: unique("custom_invoices_dealer_invoice_number_unique").on(table.dealerId, table.invoiceNumber),
  dealerFk: foreignKey({
    columns: [table.dealerId],
    foreignColumns: [dealers.id],
    name: "custom_invoices_dealer_id_dealers_id_fk"
  }),
})) 