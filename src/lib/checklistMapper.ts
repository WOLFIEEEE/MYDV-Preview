/**
 * Utility functions to map checklist data to First2Page template fields
 */

export interface ChecklistData {
  mileage: string
  cambeltChainConfirmation: string
  fuelTypeChecklist: string
  numberOfKeys: string
  serviceHistoryRecord: string
  userManual: string
  serviceHistory: string
  wheelLockingNut: string
  dealerPreSaleCheck: string
  vehicleInspectionTestDrive: string
}

export interface TemplateFieldMapping {
  [key: string]: string
}

/**
 * Maps checklist data to First2Page template field IDs
 */
export const CHECKLIST_TEMPLATE_MAPPING: TemplateFieldMapping = {
  mileage: '{Mileage:18}',
  cambeltChainConfirmation: '{Cambelt / Chain Confirmation:23}',
  fuelTypeChecklist: '{Fuel Type Checklist:19}',
  numberOfKeys: '{Number of Keys:20}',
  serviceHistoryRecord: '{Service History Record:21}',
  userManual: '{User Manual:22}',
  serviceHistory: '{Service History:21}',
  wheelLockingNut: '{Wheel Locking Nut:25}',
  dealerPreSaleCheck: '{Dealer Pre-Sale Full Vehicle Health Check:130}',
  vehicleInspectionTestDrive: '{Vehicle Inspection / Test drive:24}'
}

/**
 * Maps terms and conditions to template fields
 */
export const TERMS_TEMPLATE_MAPPING: TemplateFieldMapping = {
  customerAcceptedIdd: '{Customer has accepted the IDD:156}',
  termsOfServiceInHouse: '{Terms of Service In-House:154}',
  termsOfServiceTrade: '{Terms of Service Trade:155}',
  customerSignature: '{Customer Signature:82}',
  dateOfSignature: '{Date Of Signature:152}',
  customerAvailableSignature: '{Customer Available for Signature:153}'
}

/**
 * Converts checklist data to template-compatible format
 */
export function mapChecklistToTemplate(checklistData: Partial<ChecklistData>): Record<string, any> {
  const templateData: Record<string, any> = {}
  
  Object.entries(checklistData).forEach(([key, value]) => {
    const templateField = CHECKLIST_TEMPLATE_MAPPING[key]
    if (templateField && value) {
      // Remove the curly braces and colon notation for the actual field name
      const fieldName = templateField.replace(/[{}]/g, '').split(':')[0]
      templateData[fieldName] = value
    }
  })
  
  return templateData
}

/**
 * Converts terms data to template-compatible format
 */
export function mapTermsToTemplate(termsData: Record<string, any>): Record<string, any> {
  const templateData: Record<string, any> = {}
  
  Object.entries(termsData).forEach(([key, value]) => {
    const templateField = TERMS_TEMPLATE_MAPPING[key]
    if (templateField && value !== undefined) {
      // Remove the curly braces and colon notation for the actual field name
      const fieldName = templateField.replace(/[{}]/g, '').split(':')[0]
      templateData[fieldName] = value
    }
  })
  
  return templateData
}

/**
 * Validates checklist completion
 */
export function validateChecklist(checklistData: Partial<ChecklistData>): {
  isComplete: boolean
  missingFields: string[]
  completionPercentage: number
} {
  const requiredFields = Object.keys(CHECKLIST_TEMPLATE_MAPPING)
  const completedFields = requiredFields.filter(field => {
    const value = checklistData[field as keyof ChecklistData]
    if (value === null || value === undefined) return false
    const stringValue = String(value).trim()
    return stringValue !== '' && stringValue !== 'undefined' && stringValue !== 'null'
  })
  
  const missingFields = requiredFields.filter(field => {
    const value = checklistData[field as keyof ChecklistData]
    if (value === null || value === undefined) return true
    const stringValue = String(value).trim()
    return stringValue === '' || stringValue === 'undefined' || stringValue === 'null'
  })
  
  const completionPercentage = (completedFields.length / requiredFields.length) * 100
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage: Math.round(completionPercentage)
  }
}

/**
 * Generates a checklist summary for display
 */
export function generateChecklistSummary(checklistData: Partial<ChecklistData>): string {
  const validation = validateChecklist(checklistData)
  
  if (validation.isComplete) {
    return `✅ Vehicle inspection checklist completed (${validation.completionPercentage}%)`
  } else {
    return `⚠️ Vehicle inspection checklist incomplete (${validation.completionPercentage}%) - Missing: ${validation.missingFields.join(', ')}`
  }
}

/**
 * Default checklist values for new invoices
 */
export const DEFAULT_CHECKLIST_VALUES: Partial<ChecklistData> = {
  cambeltChainConfirmation: 'No',
  fuelTypeChecklist: 'Petrol',
  numberOfKeys: '2',
  serviceHistoryRecord: 'Unknown',
  userManual: 'Not Present',
  serviceHistory: 'Not Available',
  wheelLockingNut: 'Not Present',
  dealerPreSaleCheck: 'No',
  vehicleInspectionTestDrive: 'No'
}
