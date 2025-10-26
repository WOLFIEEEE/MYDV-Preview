import { 
  externalNotifications, 
  type ExternalNotification, 
  type NewExternalNotification,
  type ExternalEnquiryType,
  type EmploymentStatus,
  type FindYourNextCarType
} from '@/db/schema'
import { db } from '@/lib/db'
import { eq, desc, and, sql } from 'drizzle-orm'

// Type definitions based on your webhook data structure
export type WebhookData = {
  dealerId: string
  enquiryType: 'part-exchange' | 'find-your-next-car' | 'book-appointment' | 'request-finance' | 'general-contact'
  personal: {
    title?: string | null
    firstName: string
    lastName: string
    email: string
    phoneNumber: string
    gender?: string | null
    countryOfOrigin?: string | null
    dateOfBirth?: string | null
    maritalStatus?: string | null
    dependents?: number | null
    address?: string | null
  }
  vehicle?: {
    stockId?: string | null
    make?: string | null
    model?: string | null
    registration?: string | null
    mileage?: string | null
    year?: string | null
    recentValuations?: string | null
    price?: number | null
    initialDeposit?: number | null
    loanTerm?: number | null
    apr?: number | null
    amountToFinance?: number | null
    monthlyPayment?: number | null
  } | null
  // User's own vehicle for part-exchange (separate from the vehicle they're interested in)
  userVehicle?: {
    make?: string | null
    model?: string | null
    registration?: string | null
    mileage?: string | null
    year?: string | null
    recentValuations?: string | null
  } | null
  findYourNextCar?: {
    enquiryType?: 'stock-vehicle' | 'help-finding-car' | 'general-enquiry' | 'car-enhancement' | 'finance' | 'warranty' | 'feedback' | 'part-exchange'
    vehiclePreferences?: string | null
  } | null
  testDrive?: {
    isTestDrive: boolean
    testDriveDate?: string | null
    testDriveTime?: string | null
    additionalRequirements?: string | null
  } | null
  employment?: {
    status?: 
      | 'Employed Full-Time'
      | 'Employed Part-Time'
      | 'Self-Employed'
      | 'Unemployed'
      | 'Retired'
      | 'Student'
      | 'Annuitant'
      | 'Pensioner'
      | 'Other'
    annualIncome?: number
    employerName?: string
    timeInEmployment?: string
    grossAnnualIncome?: number
  } | null
  finance?: {
    monthlyExpenses?: number
    existenceCreditCommitments?: number
  } | null
  bank?: {
    accountHolderName?: string
    bankName?: string
    sortCode?: string
    accountNumber?: string
    timeWithBank?: string
  } | null
  notes?: string | null
}

export type VehicleReservationData = {
  customerDetails: {
    title: string
    firstName: string
    lastName: string
    email: string
    phone: string
    address: string
  }
  vehicleDetails: {
    make: string
    model: string
    registration: string
    stockId?: string
  }
  amount: number // Amount in pence
}

// Utility functions for working with external notifications

/**
 * Transform webhook data into a format suitable for database insertion
 */
export function transformWebhookDataToDbFormat(data: WebhookData): NewExternalNotification {
  return {
    dealerId: data.dealerId,
    enquiryType: data.enquiryType,
    
    // Personal Information
    personalTitle: data.personal.title,
    personalFirstName: data.personal.firstName,
    personalLastName: data.personal.lastName,
    personalEmail: data.personal.email,
    personalPhoneNumber: data.personal.phoneNumber,
    personalGender: data.personal.gender,
    personalCountryOfOrigin: data.personal.countryOfOrigin,
    personalDateOfBirth: data.personal.dateOfBirth,
    personalMaritalStatus: data.personal.maritalStatus,
    personalDependents: data.personal.dependents,
    personalAddress: data.personal.address,
    
    // Vehicle Details
    vehicleStockId: data.vehicle?.stockId,
    vehicleMake: data.vehicle?.make,
    vehicleModel: data.vehicle?.model,
    vehicleRegistration: data.vehicle?.registration,
    vehicleMileage: data.vehicle?.mileage,
    vehicleYear: data.vehicle?.year,
    vehicleRecentValuations: data.vehicle?.recentValuations,
    vehiclePrice: data.vehicle?.price ? data.vehicle.price.toString() : null,
    vehicleInitialDeposit: data.vehicle?.initialDeposit ? data.vehicle.initialDeposit.toString() : null,
    vehicleLoanTerm: data.vehicle?.loanTerm,
    vehicleApr: data.vehicle?.apr ? data.vehicle.apr.toString() : null,
    vehicleAmountToFinance: data.vehicle?.amountToFinance ? data.vehicle.amountToFinance.toString() : null,
    vehicleMonthlyPayment: data.vehicle?.monthlyPayment ? data.vehicle.monthlyPayment.toString() : null,
    
    // User Vehicle (for part-exchange)
    userVehicleMake: data.userVehicle?.make,
    userVehicleModel: data.userVehicle?.model,
    userVehicleRegistration: data.userVehicle?.registration,
    userVehicleMileage: data.userVehicle?.mileage,
    userVehicleYear: data.userVehicle?.year,
    userVehicleRecentValuations: data.userVehicle?.recentValuations,
    
    // Find Your Next Car
    findYourNextCarEnquiryType: data.findYourNextCar?.enquiryType,
    findYourNextCarVehiclePreferences: data.findYourNextCar?.vehiclePreferences,
    
    // Test Drive
    testDriveIsTestDrive: data.testDrive?.isTestDrive || false,
    testDriveDate: data.testDrive?.testDriveDate,
    testDriveTime: data.testDrive?.testDriveTime,
    testDriveAdditionalRequirements: data.testDrive?.additionalRequirements,
    
    // Employment
    employmentStatus: data.employment?.status,
    employmentAnnualIncome: data.employment?.annualIncome ? data.employment.annualIncome.toString() : null,
    employmentEmployerName: data.employment?.employerName,
    employmentTimeInEmployment: data.employment?.timeInEmployment,
    employmentGrossAnnualIncome: data.employment?.grossAnnualIncome ? data.employment.grossAnnualIncome.toString() : null,
    
    // Finance
    financeMonthlyExpenses: data.finance?.monthlyExpenses ? data.finance.monthlyExpenses.toString() : null,
    financeExistenceCreditCommitments: data.finance?.existenceCreditCommitments ? data.finance.existenceCreditCommitments.toString() : null,
    
    // Bank
    bankAccountHolderName: data.bank?.accountHolderName,
    bankName: data.bank?.bankName,
    bankSortCode: data.bank?.sortCode,
    bankAccountNumber: data.bank?.accountNumber,
    bankTimeWithBank: data.bank?.timeWithBank,
    
    // General
    notes: data.notes,
    
    // Default values
    status: 'new',
    priority: 'medium',
    isRead: false,
  }
}

/**
 * Transform vehicle reservation data into a format suitable for database insertion
 */
export function transformVehicleReservationDataToDbFormat(
  data: VehicleReservationData, 
  dealerId: string
): NewExternalNotification {
  return {
    dealerId,
    enquiryType: 'vehicle-reservation',
    
    // Personal Information
    personalTitle: data.customerDetails.title,
    personalFirstName: data.customerDetails.firstName,
    personalLastName: data.customerDetails.lastName,
    personalEmail: data.customerDetails.email,
    personalPhoneNumber: data.customerDetails.phone,
    personalAddress: data.customerDetails.address,
    
    // Vehicle Details
    vehicleStockId: data.vehicleDetails.stockId,
    vehicleMake: data.vehicleDetails.make,
    vehicleModel: data.vehicleDetails.model,
    vehicleRegistration: data.vehicleDetails.registration,
    
    // Reservation Amount
    reservationAmount: data.amount.toString(),
    
    // Default values
    status: 'new',
    priority: 'high', // Vehicle reservations might be high priority
    isRead: false,
  }
}

/**
 * Create a new external notification from webhook data
 */
export async function createExternalNotification(data: WebhookData | VehicleReservationData, dealerId?: string) {
  let notificationData: NewExternalNotification

  if ('enquiryType' in data) {
    // WebhookData
    notificationData = transformWebhookDataToDbFormat(data)
  } else {
    // VehicleReservationData
    if (!dealerId) {
      throw new Error('dealerId is required for vehicle reservation data')
    }
    notificationData = transformVehicleReservationDataToDbFormat(data, dealerId)
  }

  const [notification] = await db
    .insert(externalNotifications)
    .values(notificationData)
    .returning()

  return notification
}

/**
 * Update external notification with source information
 */
export async function updateExternalNotificationSource(
  notificationId: string,
  sourceInfo: {
    sourceWebsite?: string
    sourceIp?: string
    userAgent?: string
  }
) {
  return await db
    .update(externalNotifications)
    .set({
      sourceWebsite: sourceInfo.sourceWebsite,
      sourceIp: sourceInfo.sourceIp,
      userAgent: sourceInfo.userAgent,
      updatedAt: new Date()
    })
    .where(eq(externalNotifications.id, notificationId))
    .returning()
}

/**
 * Get external notifications for a specific dealer
 */
export async function getExternalNotifications(
  dealerId: string,
  options?: {
    limit?: number
    offset?: number
    status?: string
    enquiryType?: ExternalEnquiryType
    unreadOnly?: boolean
  }
) {
  const conditions = [eq(externalNotifications.dealerId, dealerId)]
  
  if (options?.status) {
    conditions.push(eq(externalNotifications.status, options.status))
  }
  
  if (options?.enquiryType) {
    conditions.push(eq(externalNotifications.enquiryType, options.enquiryType))
  }
  
  if (options?.unreadOnly) {
    conditions.push(eq(externalNotifications.isRead, false))
  }

  const baseQuery = db
    .select()
    .from(externalNotifications)
    .where(and(...conditions))
    .orderBy(desc(externalNotifications.createdAt))

  // Apply limit and offset if provided
  if (options?.limit && options?.offset) {
    return await baseQuery.limit(options.limit).offset(options.offset)
  } else if (options?.limit) {
    return await baseQuery.limit(options.limit)
  } else if (options?.offset) {
    return await baseQuery.offset(options.offset)
  } else {
    return await baseQuery
  }
}

/**
 * Mark external notification as read
 */
export async function markExternalNotificationAsRead(notificationId: string) {
  return await db
    .update(externalNotifications)
    .set({ 
      isRead: true, 
      readAt: new Date() 
    })
    .where(eq(externalNotifications.id, notificationId))
    .returning()
}

/**
 * Update external notification status
 */
export async function updateExternalNotificationStatus(
  notificationId: string, 
  status: string,
  assignedTo?: string
) {
  const updateData: Partial<ExternalNotification> = { 
    status,
    updatedAt: new Date()
  }
  
  if (assignedTo) {
    updateData.assignedTo = assignedTo
  }

  return await db
    .update(externalNotifications)
    .set(updateData)
    .where(eq(externalNotifications.id, notificationId))
    .returning()
}

/**
 * Get unread notification count for a dealer
 */
export async function getUnreadExternalNotificationCount(dealerId: string) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(externalNotifications)
    .where(
      and(
        eq(externalNotifications.dealerId, dealerId),
        eq(externalNotifications.isRead, false)
      )
    )

  return result[0]?.count || 0
}

/**
 * Search external notifications by email or phone
 */
export async function searchExternalNotifications(
  dealerId: string,
  searchTerm: string
) {
  return await db
    .select()
    .from(externalNotifications)
    .where(
      and(
        eq(externalNotifications.dealerId, dealerId),
        sql`(${externalNotifications.personalEmail} ILIKE ${`%${searchTerm}%`} OR ${externalNotifications.personalPhoneNumber} ILIKE ${`%${searchTerm}%`})`
      )
    )
    .orderBy(desc(externalNotifications.createdAt))
}