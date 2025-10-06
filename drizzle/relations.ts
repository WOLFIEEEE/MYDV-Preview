import { relations } from "drizzle-orm/relations";
import { dealers, requests, inquiries, storeConfig, joinSubmissions, userAssignments, teamMembers, stockCache, stockCacheSyncLog, detailedMargins, inventoryDetails, vehicleCosts, vehicleChecklist, saleDetails, invoices, notifications, notificationDeliveryLog, notificationPreferences, notificationTemplates, vehicleDocuments, documentAccessLog, documentCategories } from "./schema";

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

export const dealersRelations = relations(dealers, ({many}) => ({
	requests: many(requests),
	storeConfigs: many(storeConfig),
	userAssignments_assignedBy: many(userAssignments, {
		relationName: "userAssignments_assignedBy_dealers_id"
	}),
	userAssignments_dealerId: many(userAssignments, {
		relationName: "userAssignments_dealerId_dealers_id"
	}),
	teamMembers: many(teamMembers),
	stockCaches: many(stockCache),
	stockCacheSyncLogs: many(stockCacheSyncLog),
	detailedMargins: many(detailedMargins),
	inventoryDetails: many(inventoryDetails),
	vehicleCosts: many(vehicleCosts),
	vehicleChecklists: many(vehicleChecklist),
	saleDetails: many(saleDetails),
	invoices: many(invoices),
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

export const stockCacheRelations = relations(stockCache, ({one}) => ({
	dealer: one(dealers, {
		fields: [stockCache.dealerId],
		references: [dealers.id]
	}),
}));

export const stockCacheSyncLogRelations = relations(stockCacheSyncLog, ({one}) => ({
	dealer: one(dealers, {
		fields: [stockCacheSyncLog.dealerId],
		references: [dealers.id]
	}),
}));

export const detailedMarginsRelations = relations(detailedMargins, ({one}) => ({
	dealer: one(dealers, {
		fields: [detailedMargins.dealerId],
		references: [dealers.id]
	}),
}));

export const inventoryDetailsRelations = relations(inventoryDetails, ({one}) => ({
	dealer: one(dealers, {
		fields: [inventoryDetails.dealerId],
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

export const saleDetailsRelations = relations(saleDetails, ({one}) => ({
	dealer: one(dealers, {
		fields: [saleDetails.dealerId],
		references: [dealers.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	dealer: one(dealers, {
		fields: [invoices.dealerId],
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