import { relations } from "drizzle-orm/relations";
import { kanbanBoards, kanbanColumns, dealers, kanbanTasks, kanbanTaskComments, requests, inquiries, storeConfig, joinSubmissions, customInvoices, returnCosts, userAssignments, teamMembers, stockCache, stockCacheSyncLog, templates, vehicleCosts, vehicleChecklist, inventoryDetails, fundSources, detailedMargins, invoices, stockImages, notifications, notificationDeliveryLog, notificationPreferences, notificationTemplates, vehicleDocuments, documentAccessLog, documentCategories, costCategories, dealershipCosts, fundTransactions, vehicleJobCards, companySettings, dealerLogos, businesses, saleDetails, customers, serviceDetails, externalNotifications } from "./schema";

export const kanbanColumnsRelations = relations(kanbanColumns, ({one, many}) => ({
	kanbanBoard: one(kanbanBoards, {
		fields: [kanbanColumns.boardId],
		references: [kanbanBoards.id]
	}),
	kanbanTasks: many(kanbanTasks),
}));

export const kanbanBoardsRelations = relations(kanbanBoards, ({one, many}) => ({
	kanbanColumns: many(kanbanColumns),
	dealer: one(dealers, {
		fields: [kanbanBoards.dealerId],
		references: [dealers.id]
	}),
	kanbanTasks: many(kanbanTasks),
}));

export const dealersRelations = relations(dealers, ({many}) => ({
	kanbanBoards: many(kanbanBoards),
	requests: many(requests),
	storeConfigs: many(storeConfig),
	customInvoices: many(customInvoices),
	returnCosts: many(returnCosts),
	userAssignments_assignedBy: many(userAssignments, {
		relationName: "userAssignments_assignedBy_dealers_id"
	}),
	userAssignments_dealerId: many(userAssignments, {
		relationName: "userAssignments_dealerId_dealers_id"
	}),
	teamMembers: many(teamMembers),
	stockCaches: many(stockCache),
	stockCacheSyncLogs: many(stockCacheSyncLog),
	templates: many(templates),
	vehicleCosts: many(vehicleCosts),
	vehicleChecklists: many(vehicleChecklist),
	inventoryDetails: many(inventoryDetails),
	detailedMargins: many(detailedMargins),
	invoices: many(invoices),
	stockImages: many(stockImages),
	notifications_recipientId: many(notifications, {
		relationName: "notifications_recipientId_dealers_id"
	}),
	notifications_senderId: many(notifications, {
		relationName: "notifications_senderId_dealers_id"
	}),
	notificationPreferences: many(notificationPreferences),
	notificationTemplates: many(notificationTemplates),
	vehicleDocuments: many(vehicleDocuments),
	documentCategories: many(documentCategories),
	costCategories: many(costCategories),
	dealershipCosts: many(dealershipCosts),
	fundSources: many(fundSources),
	fundTransactions: many(fundTransactions),
	vehicleJobCards: many(vehicleJobCards),
	companySettings: many(companySettings),
	dealerLogos_assignedBy: many(dealerLogos, {
		relationName: "dealerLogos_assignedBy_dealers_id"
	}),
	dealerLogos_dealerId: many(dealerLogos, {
		relationName: "dealerLogos_dealerId_dealers_id"
	}),
	saleDetails: many(saleDetails),
	serviceDetails: many(serviceDetails),
	externalNotifications_assignedTo: many(externalNotifications, {
		relationName: "externalNotifications_assignedTo_dealers_id"
	}),
	externalNotifications_dealerId: many(externalNotifications, {
		relationName: "externalNotifications_dealerId_dealers_id"
	}),
}));

export const kanbanTaskCommentsRelations = relations(kanbanTaskComments, ({one}) => ({
	kanbanTask: one(kanbanTasks, {
		fields: [kanbanTaskComments.taskId],
		references: [kanbanTasks.id]
	}),
}));

export const kanbanTasksRelations = relations(kanbanTasks, ({one, many}) => ({
	kanbanTaskComments: many(kanbanTaskComments),
	kanbanBoard: one(kanbanBoards, {
		fields: [kanbanTasks.boardId],
		references: [kanbanBoards.id]
	}),
	kanbanColumn: one(kanbanColumns, {
		fields: [kanbanTasks.columnId],
		references: [kanbanColumns.id]
	}),
}));

export const requestsRelations = relations(requests, ({one}) => ({
	dealer: one(dealers, {
		fields: [requests.assignedTo],
		references: [dealers.id]
	}),
	inquiry: one(inquiries, {
		fields: [requests.inquiryId],
		references: [inquiries.id]
	}),
}));

export const inquiriesRelations = relations(inquiries, ({many}) => ({
	requests: many(requests),
}));

export const storeConfigRelations = relations(storeConfig, ({one}) => ({
	dealer: one(dealers, {
		fields: [storeConfig.assignedBy],
		references: [dealers.id]
	}),
	joinSubmission: one(joinSubmissions, {
		fields: [storeConfig.joinSubmissionId],
		references: [joinSubmissions.id]
	}),
}));

export const joinSubmissionsRelations = relations(joinSubmissions, ({many}) => ({
	storeConfigs: many(storeConfig),
	userAssignments: many(userAssignments),
}));

export const customInvoicesRelations = relations(customInvoices, ({one}) => ({
	dealer: one(dealers, {
		fields: [customInvoices.dealerId],
		references: [dealers.id]
	}),
}));

export const returnCostsRelations = relations(returnCosts, ({one}) => ({
	dealer: one(dealers, {
		fields: [returnCosts.dealerId],
		references: [dealers.id]
	}),
}));

export const userAssignmentsRelations = relations(userAssignments, ({one}) => ({
	dealer_assignedBy: one(dealers, {
		fields: [userAssignments.assignedBy],
		references: [dealers.id],
		relationName: "userAssignments_assignedBy_dealers_id"
	}),
	dealer_dealerId: one(dealers, {
		fields: [userAssignments.dealerId],
		references: [dealers.id],
		relationName: "userAssignments_dealerId_dealers_id"
	}),
	joinSubmission: one(joinSubmissions, {
		fields: [userAssignments.joinSubmissionId],
		references: [joinSubmissions.id]
	}),
}));

export const teamMembersRelations = relations(teamMembers, ({one}) => ({
	dealer: one(dealers, {
		fields: [teamMembers.storeOwnerId],
		references: [dealers.id]
	}),
}));

export const stockCacheRelations = relations(stockCache, ({one, many}) => ({
	dealer: one(dealers, {
		fields: [stockCache.dealerId],
		references: [dealers.id]
	}),
	vehicleJobCards: many(vehicleJobCards),
}));

export const stockCacheSyncLogRelations = relations(stockCacheSyncLog, ({one}) => ({
	dealer: one(dealers, {
		fields: [stockCacheSyncLog.dealerId],
		references: [dealers.id]
	}),
}));

export const templatesRelations = relations(templates, ({one}) => ({
	dealer: one(dealers, {
		fields: [templates.dealerId],
		references: [dealers.id]
	}),
}));

export const vehicleCostsRelations = relations(vehicleCosts, ({one}) => ({
	dealer: one(dealers, {
		fields: [vehicleCosts.dealerId],
		references: [dealers.id]
	}),
}));

export const vehicleChecklistRelations = relations(vehicleChecklist, ({one}) => ({
	dealer: one(dealers, {
		fields: [vehicleChecklist.dealerId],
		references: [dealers.id]
	}),
}));

export const inventoryDetailsRelations = relations(inventoryDetails, ({one}) => ({
	dealer: one(dealers, {
		fields: [inventoryDetails.dealerId],
		references: [dealers.id]
	}),
	fundSource: one(fundSources, {
		fields: [inventoryDetails.fundingSourceId],
		references: [fundSources.id]
	}),
}));

export const fundSourcesRelations = relations(fundSources, ({one, many}) => ({
	inventoryDetails: many(inventoryDetails),
	dealer: one(dealers, {
		fields: [fundSources.dealerId],
		references: [dealers.id]
	}),
	fundTransactions: many(fundTransactions),
}));

export const detailedMarginsRelations = relations(detailedMargins, ({one}) => ({
	dealer: one(dealers, {
		fields: [detailedMargins.dealerId],
		references: [dealers.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	dealer: one(dealers, {
		fields: [invoices.dealerId],
		references: [dealers.id]
	}),
}));

export const stockImagesRelations = relations(stockImages, ({one}) => ({
	dealer: one(dealers, {
		fields: [stockImages.dealerId],
		references: [dealers.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one, many}) => ({
	dealer_recipientId: one(dealers, {
		fields: [notifications.recipientId],
		references: [dealers.id],
		relationName: "notifications_recipientId_dealers_id"
	}),
	dealer_senderId: one(dealers, {
		fields: [notifications.senderId],
		references: [dealers.id],
		relationName: "notifications_senderId_dealers_id"
	}),
	notificationDeliveryLogs: many(notificationDeliveryLog),
}));

export const notificationDeliveryLogRelations = relations(notificationDeliveryLog, ({one}) => ({
	notification: one(notifications, {
		fields: [notificationDeliveryLog.notificationId],
		references: [notifications.id]
	}),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({one}) => ({
	dealer: one(dealers, {
		fields: [notificationPreferences.userId],
		references: [dealers.id]
	}),
}));

export const notificationTemplatesRelations = relations(notificationTemplates, ({one}) => ({
	dealer: one(dealers, {
		fields: [notificationTemplates.dealerId],
		references: [dealers.id]
	}),
}));

export const vehicleDocumentsRelations = relations(vehicleDocuments, ({one, many}) => ({
	dealer: one(dealers, {
		fields: [vehicleDocuments.dealerId],
		references: [dealers.id]
	}),
	documentAccessLogs: many(documentAccessLog),
}));

export const documentAccessLogRelations = relations(documentAccessLog, ({one}) => ({
	vehicleDocument: one(vehicleDocuments, {
		fields: [documentAccessLog.documentId],
		references: [vehicleDocuments.id]
	}),
}));

export const documentCategoriesRelations = relations(documentCategories, ({one}) => ({
	dealer: one(dealers, {
		fields: [documentCategories.dealerId],
		references: [dealers.id]
	}),
}));

export const costCategoriesRelations = relations(costCategories, ({one}) => ({
	dealer: one(dealers, {
		fields: [costCategories.dealerId],
		references: [dealers.id]
	}),
}));

export const dealershipCostsRelations = relations(dealershipCosts, ({one}) => ({
	dealer: one(dealers, {
		fields: [dealershipCosts.dealerId],
		references: [dealers.id]
	}),
}));

export const fundTransactionsRelations = relations(fundTransactions, ({one}) => ({
	dealer: one(dealers, {
		fields: [fundTransactions.dealerId],
		references: [dealers.id]
	}),
	fundSource: one(fundSources, {
		fields: [fundTransactions.fundSourceId],
		references: [fundSources.id]
	}),
}));

export const vehicleJobCardsRelations = relations(vehicleJobCards, ({one}) => ({
	dealer: one(dealers, {
		fields: [vehicleJobCards.dealerId],
		references: [dealers.id]
	}),
	stockCache: one(stockCache, {
		fields: [vehicleJobCards.stockId],
		references: [stockCache.stockId]
	}),
}));

export const companySettingsRelations = relations(companySettings, ({one}) => ({
	dealer: one(dealers, {
		fields: [companySettings.dealerId],
		references: [dealers.id]
	}),
}));

export const dealerLogosRelations = relations(dealerLogos, ({one}) => ({
	dealer_assignedBy: one(dealers, {
		fields: [dealerLogos.assignedBy],
		references: [dealers.id],
		relationName: "dealerLogos_assignedBy_dealers_id"
	}),
	dealer_dealerId: one(dealers, {
		fields: [dealerLogos.dealerId],
		references: [dealers.id],
		relationName: "dealerLogos_dealerId_dealers_id"
	}),
}));

export const saleDetailsRelations = relations(saleDetails, ({one}) => ({
	business: one(businesses, {
		fields: [saleDetails.businessId],
		references: [businesses.id]
	}),
	customer: one(customers, {
		fields: [saleDetails.customerId],
		references: [customers.id]
	}),
	dealer: one(dealers, {
		fields: [saleDetails.dealerId],
		references: [dealers.id]
	}),
}));

export const businessesRelations = relations(businesses, ({many}) => ({
	saleDetails: many(saleDetails),
}));

export const customersRelations = relations(customers, ({many}) => ({
	saleDetails: many(saleDetails),
}));

export const serviceDetailsRelations = relations(serviceDetails, ({one}) => ({
	dealer: one(dealers, {
		fields: [serviceDetails.dealerId],
		references: [dealers.id]
	}),
}));

export const externalNotificationsRelations = relations(externalNotifications, ({one}) => ({
	dealer_assignedTo: one(dealers, {
		fields: [externalNotifications.assignedTo],
		references: [dealers.id],
		relationName: "externalNotifications_assignedTo_dealers_id"
	}),
	dealer_dealerId: one(dealers, {
		fields: [externalNotifications.dealerId],
		references: [dealers.id],
		relationName: "externalNotifications_dealerId_dealers_id"
	}),
}));