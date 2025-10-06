'use server';

import { db } from '@/lib/db';
import { contactSubmissions, joinSubmissions, dealers, userAssignments, storeConfig, teamMembers, inquiries, requests, templates, stockImages, type NewContactSubmission, type NewJoinSubmission, type NewDealer, type Dealer, type ContactSubmission, type JoinSubmission, type UserAssignment, type NewUserAssignment, type StoreConfig, type NewStoreConfig, type TeamMember, type NewTeamMember, type Template, type NewTemplate, type StockImage, type NewStockImage } from '@/db/schema';

// Re-export TeamMember type for external use
export type { TeamMember, NewTeamMember } from '@/db/schema';
import { desc, eq, count, sql, ilike, or, and, inArray } from 'drizzle-orm';
import { clerkClient } from '@clerk/nextjs/server';
import { EmailService } from './emailService';

// GLOBAL CACHE to prevent multiple dealer creation calls
const dealerCache = new Map<string, { dealer: Dealer; timestamp: number }>();
const CACHE_DURATION = 30 * 60 * 1000; // FIXED: Increased to 30 minutes to reduce database calls
const activeRequests = new Map<string, Promise<Dealer>>();
const processingUsers = new Set<string>(); // FIXED: Track users currently being processed

// DEALER FUNCTIONS
export async function createOrGetDealer(clerkUserId: string, name: string, email: string): Promise<Dealer> {
  try {
    console.log('🔄 createOrGetDealer called:', { clerkUserId, name, email, timestamp: new Date().toISOString() });
    
    // CRITICAL: Check if this email is an admin email - admins should NOT have dealer records
    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(email => email.trim()).filter(email => email.length > 0) || [];
    if (adminEmails.includes(email)) {
      console.log('🚫 Admin email detected - refusing to create dealer record:', email);
      throw new Error(`Admin emails cannot be created as dealers: ${email}`);
    }
    
    // FIXED: Check if user is already being processed to prevent duplicate calls
    if (processingUsers.has(clerkUserId)) {
      console.log('🚫 User already being processed, preventing duplicate call:', clerkUserId);
      // Wait a bit and check cache again
      await new Promise(resolve => setTimeout(resolve, 100));
      const cached = dealerCache.get(clerkUserId);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log('🎯 Returning cached dealer after wait:', cached.dealer.id);
        return cached.dealer;
      }
    }
    
    // CRITICAL: Check cache first
    const cached = dealerCache.get(clerkUserId);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('🎯 Returning cached dealer:', cached.dealer.id);
      return cached.dealer;
    }
    
    // CRITICAL: Check if there's already an active request for this user
    const activeRequest = activeRequests.get(clerkUserId);
    if (activeRequest) {
      console.log('⏳ Waiting for active request to complete...');
      return await activeRequest;
    }
    
    // Mark user as being processed
    processingUsers.add(clerkUserId);
    
    // Create a new request promise
    const requestPromise = (async () => {
      try {
        console.log('🔍 Checking database for existing dealer...');
        
        // First, try to find existing dealer
        const existingDealer = await db
          .select()
          .from(dealers)
          .where(eq(dealers.clerkUserId, clerkUserId))
          .limit(1);

        if (existingDealer.length > 0) {
          console.log('✅ Found existing dealer by clerkUserId:', existingDealer[0].id);
          const dealer = existingDealer[0];
          
          // Check if the existing dealer has "null null" as name and update it
          if (dealer.name === 'null null' && name !== 'null null') {
            console.log('🔄 Updating dealer name from "null null" to:', name);
            const [updatedDealer] = await db
              .update(dealers)
              .set({ name })
              .where(eq(dealers.clerkUserId, clerkUserId))
              .returning();
            console.log('✅ Dealer name updated successfully');
            
            // Cache the updated dealer
            dealerCache.set(clerkUserId, { dealer: updatedDealer, timestamp: Date.now() });
            return updatedDealer;
          }
          
          // Cache the existing dealer
          dealerCache.set(clerkUserId, { dealer, timestamp: Date.now() });
          return dealer;
        }

        // If no dealer found by clerkUserId, check by email (for cases where clerkUserId changed)
        console.log('🔍 No dealer found by clerkUserId, checking by email...');
        const existingDealerByEmail = await db
          .select()
          .from(dealers)
          .where(eq(dealers.email, email))
          .limit(1);

        if (existingDealerByEmail.length > 0) {
          console.log('✅ Found existing dealer by email, updating clerkUserId:', existingDealerByEmail[0].id);
          const [updatedDealer] = await db
            .update(dealers)
            .set({ 
              clerkUserId,
              name: name !== 'null null' ? name : existingDealerByEmail[0].name
            })
            .where(eq(dealers.email, email))
            .returning();
          console.log('✅ Dealer clerkUserId updated successfully');
          
          // Cache the updated dealer
          dealerCache.set(clerkUserId, { dealer: updatedDealer, timestamp: Date.now() });
          return updatedDealer;
        }

        // If no dealer exists by clerkUserId or email, create a new one
        console.log('🆕 Creating new dealer record for:', email);
        const [newDealer] = await db
          .insert(dealers)
          .values({
            clerkUserId,
            name,
            email,
            role: 'dealer'
          })
          .returning();

        console.log('✅ New dealer created with ID:', newDealer.id);
        
        // Cache the new dealer
        dealerCache.set(clerkUserId, { dealer: newDealer, timestamp: Date.now() });
        return newDealer;
      } finally {
        // Always remove from active requests and processing set when done
        activeRequests.delete(clerkUserId);
        processingUsers.delete(clerkUserId);
      }
    })();
    
    // Store the active request
    activeRequests.set(clerkUserId, requestPromise);
    
    return await requestPromise;
  } catch (error) {
    console.error('❌ Error in createOrGetDealer:', error);
    // Clean up on error
    activeRequests.delete(clerkUserId);
    processingUsers.delete(clerkUserId);
    throw error;
  }
}

export async function getDealerByClerkId(clerkUserId: string): Promise<Dealer | null> {
  try {
    const result = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, clerkUserId))
      .limit(1);

    return result.length > 0 ? result[0] : null;
  } catch (error) {
    console.error('Error fetching dealer:', error);
    throw error;
  }
}

export async function getAllDealers(): Promise<Dealer[]> {
  try {
    const result = await db
      .select()
      .from(dealers)
      .orderBy(desc(dealers.createdAt));
    
    return result;
  } catch (error) {
    console.error('Error fetching dealers:', error);
    throw error;
  }
}

export async function deleteDealer(dealerId: string) {
  try {
    console.log('🔄 Deleting dealer:', dealerId);
    
    // Delete the dealer record
    const result = await db
      .delete(dealers)
      .where(eq(dealers.id, dealerId))
      .returning();
    
    if (result.length === 0) {
      return {
        success: false,
        error: 'Dealer not found'
      };
    }
    
    console.log('✅ Dealer deleted successfully:', result[0].name);
    
    return {
      success: true,
      data: result[0]
    };
  } catch (error) {
    console.error('❌ Error deleting dealer:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return {
      success: false,
      error: `Failed to delete dealer: ${errorMessage}`
    };
  }
}

// CONTACT SUBMISSION FUNCTIONS
export async function createContactSubmission(data: NewContactSubmission) {
  try {
    const [submission] = await db
      .insert(contactSubmissions)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('✅ Contact submission created:', submission.id);
    return { success: true, data: submission };
  } catch (error) {
    console.error('Error creating contact submission:', error);
    return { success: false, error: 'Failed to submit contact form' };
  }
}

// Join form submission
export async function createJoinSubmission(data: NewJoinSubmission) {
  try {
    const [submission] = await db
      .insert(joinSubmissions)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return { success: true, data: submission };
  } catch (error) {
    console.error('Error creating join submission:', error);
    return { success: false, error: 'Failed to submit application' };
  }
}

// Get all contact submissions (for admin panel)
export async function getContactSubmissions(limit = 50, offset = 0) {
  try {
    const submissions = await db
      .select()
      .from(contactSubmissions)
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    const total = await db
      .select({ count: count() })
      .from(contactSubmissions);
    
    return { 
      success: true, 
      data: submissions, 
      total: total[0].count,
      hasMore: total[0].count > offset + submissions.length 
    };
  } catch (error) {
    console.error('Error fetching contact submissions:', error);
    return { success: false, error: 'Failed to fetch contact submissions' };
  }
}

// Get all join submissions (for admin panel)
export async function getJoinSubmissions(limit = 50, offset = 0) {
  try {
    const submissions = await db
      .select()
      .from(joinSubmissions)
      .orderBy(desc(joinSubmissions.createdAt))
      .limit(limit)
      .offset(offset);
    
    const total = await db
      .select({ count: count() })
      .from(joinSubmissions);
    
    return { 
      success: true, 
      data: submissions, 
      total: total[0].count,
      hasMore: total[0].count > offset + submissions.length 
    };
  } catch (error) {
    console.error('Error fetching join submissions:', error);
    return { success: false, error: 'Failed to fetch join submissions' };
  }
}

// Update contact submission status
export async function updateContactSubmissionStatus(id: number, status: string, dealerId?: string) {
  try {
    const [updated] = await db
      .update(contactSubmissions)
      .set({ 
        status, 
        dealerId, 
        updatedAt: new Date() 
      })
      .where(eq(contactSubmissions.id, id))
      .returning();
    
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error updating contact submission status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}

// Update join submission status
export async function updateJoinSubmissionStatus(id: number, status: string, assignedTo?: string, notes?: string, sendEmailNotification: boolean = false, adminName?: string) {
  try {
    // Get current submission data for email notification
    let currentSubmission = null;
    if (sendEmailNotification) {
      const [current] = await db
        .select()
        .from(joinSubmissions)
        .where(eq(joinSubmissions.id, id))
        .limit(1);
      currentSubmission = current;
    }

    const [updated] = await db
      .update(joinSubmissions)
      .set({ 
        status, 
        assignedTo, 
        notes,
        updatedAt: new Date() 
      })
      .where(eq(joinSubmissions.id, id))
      .returning();
    
    // Send email notification if requested and we have the current submission data
    if (sendEmailNotification && currentSubmission && updated) {
      console.log('📧 Sending status update email notification...');
      try {
        const emailResult = await EmailService.sendJoinRequestStatusUpdate({
          to: updated.email,
          applicantName: `${updated.firstName} ${updated.lastName}`,
          dealershipName: updated.dealershipName,
          oldStatus: currentSubmission.status,
          newStatus: updated.status,
          statusMessage: notes,
          adminName: adminName || 'Admin',
          updateDate: new Date().toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        });
        
        if (emailResult.success) {
          console.log('✅ Status update email sent to applicant');
        } else {
          console.warn('⚠️ Failed to send status update email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error sending status update email:', emailError);
      }
    }
    
    return { success: true, data: updated };
  } catch (error) {
    console.error('Error updating join submission status:', error);
    return { success: false, error: 'Failed to update status' };
  }
}

// Reject join submission with email notification
export async function rejectJoinSubmission(submissionId: number, adminClerkId: string, rejectionReason?: string) {
  try {
    console.log('❌ Rejecting join submission:', submissionId);
    
    // Get admin dealer info
    const adminDealerResult = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, adminClerkId))
      .limit(1);
    
    if (adminDealerResult.length === 0) {
      return { success: false, error: 'Admin dealer not found' };
    }
    
    const adminDealer = adminDealerResult[0];
    console.log('✅ Found admin dealer:', { id: adminDealer.id, email: adminDealer.email });
    
    // Get join submission data
    const [joinData] = await db
      .select()
      .from(joinSubmissions)
      .where(eq(joinSubmissions.id, submissionId))
      .limit(1);
    
    if (!joinData) {
      return { success: false, error: 'Join submission not found' };
    }
    
    // Update status to rejected
    const statusUpdate = await updateJoinSubmissionStatus(
      submissionId, 
      'rejected', 
      adminDealer.id, 
      rejectionReason || 'Application rejected by admin'
    );
    
    if (!statusUpdate.success) {
      return { success: false, error: 'Failed to update submission status: ' + statusUpdate.error };
    }
    
    // Send rejection email to applicant
    console.log('📧 Sending rejection email to applicant...');
    try {
      const rejectionEmailResult = await EmailService.sendJoinRequestRejected({
        to: joinData.email,
        applicantName: `${joinData.firstName} ${joinData.lastName}`,
        dealershipName: joinData.dealershipName,
        rejectionReason: rejectionReason,
        adminName: adminDealer.name || adminDealer.email,
        rejectionDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      
      if (rejectionEmailResult.success) {
        console.log('✅ Rejection email sent to applicant');
      } else {
        console.warn('⚠️ Failed to send rejection email:', rejectionEmailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending rejection email:', emailError);
    }
    
    return { 
      success: true, 
      data: { 
        submission: joinData,
        rejectionReason
      } 
    };
  } catch (error) {
    console.error('❌ Error rejecting join submission:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: 'Failed to reject join submission: ' + errorMessage };
  }
}

// Get dashboard statistics
export async function getDashboardStats() {
  try {
    const [contactStats] = await db
      .select({
        total: count(),
        pending: count(sql`CASE WHEN ${contactSubmissions.status} = 'pending' THEN 1 END`),
        contacted: count(sql`CASE WHEN ${contactSubmissions.status} = 'contacted' THEN 1 END`),
        resolved: count(sql`CASE WHEN ${contactSubmissions.status} = 'resolved' THEN 1 END`),
      })
      .from(contactSubmissions);

    const [joinStats] = await db
      .select({
        total: count(),
        pending: count(sql`CASE WHEN ${joinSubmissions.status} = 'pending' THEN 1 END`),
        reviewing: count(sql`CASE WHEN ${joinSubmissions.status} = 'reviewing' THEN 1 END`),
        approved: count(sql`CASE WHEN ${joinSubmissions.status} = 'approved' THEN 1 END`),
        rejected: count(sql`CASE WHEN ${joinSubmissions.status} = 'rejected' THEN 1 END`),
      })
      .from(joinSubmissions);

    return {
      success: true,
      data: {
        contacts: contactStats,
        applications: joinStats,
      }
    };
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return { success: false, error: 'Failed to fetch dashboard statistics' };
  }
}

// Search functions
export async function searchContactSubmissions(searchTerm: string, limit = 50) {
  try {
    const submissions = await db
      .select()
      .from(contactSubmissions)
      .where(
        or(
          ilike(contactSubmissions.name, `%${searchTerm}%`),
          ilike(contactSubmissions.email, `%${searchTerm}%`),
          ilike(contactSubmissions.company, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(contactSubmissions.createdAt))
      .limit(limit);
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error('Error searching contact submissions:', error);
    return { success: false, error: 'Failed to search contact submissions' };
  }
}

export async function searchJoinSubmissions(searchTerm: string, limit = 50) {
  try {
    const submissions = await db
      .select()
      .from(joinSubmissions)
      .where(
        or(
          ilike(joinSubmissions.firstName, `%${searchTerm}%`),
          ilike(joinSubmissions.lastName, `%${searchTerm}%`),
          ilike(joinSubmissions.email, `%${searchTerm}%`),
          ilike(joinSubmissions.dealershipName, `%${searchTerm}%`)
        )
      )
      .orderBy(desc(joinSubmissions.createdAt))
      .limit(limit);
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error('Error searching join submissions:', error);
    return { success: false, error: 'Failed to search join submissions' };
  }
}

/**
 * Bulk fetch store configs for multiple submission IDs in a single optimized query
 * This is much more efficient than calling getStoreConfigBySubmissionId for each submission individually
 */
export async function getBulkStoreConfigsBySubmissionIds(submissionIds: number[]) {
  try {
    console.log('🔍 Bulk fetching store configs for', submissionIds.length, 'submissions');
    
    if (submissionIds.length === 0) {
      return { success: true, data: {} };
    }

    // Single query to get all store configs for the given submission IDs
    const storeConfigs = await db
      .select()
      .from(storeConfig)
      .where(inArray(storeConfig.joinSubmissionId, submissionIds));

    console.log('📋 Bulk query returned', storeConfigs.length, 'store configs');

    // Process results into a map for easy lookup
    const configMap: Record<number, StoreConfig> = {};
    
    storeConfigs.forEach(config => {
      if (config.joinSubmissionId) {
        configMap[config.joinSubmissionId] = config;
      }
    });

    console.log('✅ Bulk store configs processed:', {
      requested: submissionIds.length,
      found: Object.keys(configMap).length,
      performance: 'Single optimized query'
    });

    return {
      success: true,
      data: configMap
    };
    
  } catch (error) {
    console.error('❌ Error in bulk store configs fetch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {}
    };
  }
}

/**
 * Enhanced join submissions loading with store configs in a single optimized operation
 * Combines submission loading with store config loading for maximum efficiency
 */
export async function getJoinSubmissionsWithStoreConfigs(limit = 100) {
  try {
    console.log('🔍 Loading join submissions with store configs (optimized)');
    const startTime = performance.now();

    // Get all submissions in one query
    const submissions = await db
      .select()
      .from(joinSubmissions)
      .orderBy(desc(joinSubmissions.createdAt))
      .limit(limit);

    // Calculate status counts from the fetched data
    const statusCounts = submissions.reduce((acc, submission) => {
      acc[submission.status] = (acc[submission.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get approved submission IDs for store config loading
    const approvedSubmissionIds = submissions
      .filter(s => s.status === 'approved')
      .map(s => s.id);

    // Bulk load store configs for approved submissions
    let storeConfigs: Record<number, StoreConfig> = {};
    if (approvedSubmissionIds.length > 0) {
      const configResult = await getBulkStoreConfigsBySubmissionIds(approvedSubmissionIds);
      if (configResult.success) {
        storeConfigs = configResult.data;
      }
    }

    const endTime = performance.now();
    console.log('✅ Join submissions with store configs loaded:', {
      totalSubmissions: submissions.length,
      approvedSubmissions: approvedSubmissionIds.length,
      storeConfigsLoaded: Object.keys(storeConfigs).length,
      loadTime: `${(endTime - startTime).toFixed(2)}ms`,
      method: 'optimized_combined'
    });

    return { 
      success: true, 
      data: submissions,
      counts: {
        all: submissions.length,
        pending: statusCounts.pending || 0,
        reviewing: statusCounts.reviewing || 0,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0
      },
      storeConfigs: storeConfigs
    };
  } catch (error) {
    console.error('❌ Error fetching join submissions with store configs:', error);
    return { 
      success: false, 
      error: 'Failed to fetch join submissions with store configs',
      data: [],
      counts: { all: 0, pending: 0, reviewing: 0, approved: 0, rejected: 0 },
      storeConfigs: {}
    };
  }
}

// Export types
export type { ContactSubmission, JoinSubmission, StoreConfig }; 

// DEALER KEY MANAGEMENT FUNCTIONS
// Updated to use store_config data instead of creating separate keys
export async function assignDealerKeys(dealerId: string, apiKey?: string, apiSecret?: string) {
  try {
    console.log('🔄 Starting API key assignment for dealer:', dealerId);
    
    // First, find the dealer's Clerk ID to look up their store config
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      return {
        success: false,
        error: 'Dealer not found'
      };
    }

    // Look for existing store config for this dealer using email
    const existingStoreConfig = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, dealer[0].email))
      .limit(1);

    if (existingStoreConfig.length === 0) {
      console.log('❌ No store config found for dealer email:', dealer[0].email);
      return {
        success: false,
        error: `No assignment data found for dealer ${dealer[0].name} (${dealer[0].email}). Please assign them through Partner Applications first.`
      };
    }

    const config = existingStoreConfig[0];

    // Check if they already have API keys assigned
    if (config.autotraderKey && config.autotraderSecret) {
      console.log('✅ Dealer already has API keys from assignment');
      return {
        success: true,
        data: {
          apiKey: config.autotraderKey,
          apiSecret: config.autotraderSecret,
          advertisementId: config.advertisementId,
          additionalAdvertisementIds: config.additionalAdvertisementIds ? JSON.parse(config.additionalAdvertisementIds) : [],
          companyName: config.companyName,
          companyLogoUrl: config.companyLogoUrl,
          dvlaApiKey: config.dvlaApiKey,
          autotraderIntegrationId: config.autotraderIntegrationId,
          assignedAt: config.assignedAt || config.createdAt,
          storeConfigId: config.id
        }
      };
    }

    // If no API keys in store config, generate new ones and update
    const generatedApiKey = apiKey || `dk_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const generatedApiSecret = apiSecret || `ds_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    
    console.log('🔑 Updating store config with generated keys:', { apiKey: generatedApiKey, apiSecret: generatedApiSecret });
    
    const [updatedConfig] = await db
      .update(storeConfig)
      .set({
        autotraderKey: generatedApiKey,
        autotraderSecret: generatedApiSecret,
        assignedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(storeConfig.id, config.id))
      .returning();

    console.log('✅ Store config updated with API keys');
    
    return {
      success: true,
      data: {
        apiKey: generatedApiKey,
        apiSecret: generatedApiSecret,
        advertisementId: updatedConfig.advertisementId,
        additionalAdvertisementIds: updatedConfig.additionalAdvertisementIds ? JSON.parse(updatedConfig.additionalAdvertisementIds) : [],
        companyName: updatedConfig.companyName,
        companyLogoUrl: updatedConfig.companyLogoUrl,
        dvlaApiKey: updatedConfig.dvlaApiKey,
        autotraderIntegrationId: updatedConfig.autotraderIntegrationId,
        assignedAt: new Date(),
        storeConfigId: updatedConfig.id
      }
    };
  } catch (error) {
    console.error('❌ Error assigning dealer keys:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      success: false, 
      error: `Failed to assign API keys: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

// Updated to use store_config data instead of requests table
export async function getDealerKeys(dealerId: string) {
  try {
    console.log('🔍 Fetching API keys for dealer:', dealerId);
    
    // First, find the dealer's Clerk ID to look up their store config
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      return {
        success: true,
        data: null
      };
    }

    // Look for store config for this dealer using email
    const storeConfigData = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, dealer[0].email))
      .limit(1);

    console.log('📋 Found store config for dealer:', storeConfigData.length > 0 ? 'Yes' : 'No');

    // Return null only if no store config exists at all
    if (storeConfigData.length === 0) {
      return {
        success: true,
        data: null
      };
    }

    const config = storeConfigData[0];

    // Return data even if API keys don't exist (new simplified flow uses only advertiserId and integrationId)
    return {
      success: true,
      data: {
        apiKey: config.autotraderKey || null,
        apiSecret: config.autotraderSecret || null,
        advertisementId: config.advertisementId,
        additionalAdvertisementIds: config.additionalAdvertisementIds ? JSON.parse(config.additionalAdvertisementIds) : [],
        companyName: config.companyName,
        companyLogoUrl: config.companyLogoUrl,
        dvlaApiKey: config.dvlaApiKey,
        autotraderIntegrationId: config.autotraderIntegrationId,
        assignedAt: config.assignedAt || config.createdAt,
        storeConfigId: config.id,
        status: config.autotraderKey && config.autotraderSecret ? 'active' : 'configured'
      }
    };
  } catch (error) {
    console.error('❌ Error fetching dealer keys:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      success: false, 
      error: `Failed to fetch dealer keys: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

/**
 * Bulk fetch dealer keys for multiple dealers in a single optimized query
 * This is much more efficient than calling getDealerKeys for each dealer individually
 */
export async function getBulkDealerKeys(dealerIds: string[]) {
  try {
    console.log('🔍 Bulk fetching dealer keys for', dealerIds.length, 'dealers');
    
    if (dealerIds.length === 0) {
      return { success: true, data: {} };
    }

    // inArray is already imported at the top

    // Single query to get all dealers and their store configs
    const dealersWithConfigs = await db
      .select({
        // Dealer fields
        dealerId: dealers.id,
        dealerEmail: dealers.email,
        dealerName: dealers.name,
        
        // Store config fields
        autotraderKey: storeConfig.autotraderKey,
        autotraderSecret: storeConfig.autotraderSecret,
        advertisementId: storeConfig.advertisementId,
        additionalAdvertisementIds: storeConfig.additionalAdvertisementIds,
        primaryAdvertisementId: storeConfig.primaryAdvertisementId,
        advertisementIds: storeConfig.advertisementIds,
        companyName: storeConfig.companyName,
        companyLogoUrl: storeConfig.companyLogoUrl,
        dvlaApiKey: storeConfig.dvlaApiKey,
        autotraderIntegrationId: storeConfig.autotraderIntegrationId,
        assignedAt: storeConfig.assignedAt,
        createdAt: storeConfig.createdAt,
        storeConfigId: storeConfig.id
      })
      .from(dealers)
      .leftJoin(storeConfig, eq(dealers.email, storeConfig.email))
      .where(inArray(dealers.id, dealerIds));

    console.log('📋 Bulk query returned', dealersWithConfigs.length, 'results');

    // Process results into the expected format
    const keysData: Record<string, any> = {};
    
    dealersWithConfigs.forEach(row => {
      const dealerIdStr = String(row.dealerId);
      
      // Include dealers that have store config data (even without API keys for simplified flow)
      if (row.storeConfigId) {
        keysData[dealerIdStr] = {
          apiKey: row.autotraderKey || null,
          apiSecret: row.autotraderSecret || null,
          advertisementId: row.advertisementId,
          additionalAdvertisementIds: row.additionalAdvertisementIds ? JSON.parse(row.additionalAdvertisementIds) : [],
          primaryAdvertisementId: row.primaryAdvertisementId,
          advertisementIdsParsed: row.advertisementIds ? JSON.parse(row.advertisementIds) : [],
          companyName: row.companyName,
          companyLogoUrl: row.companyLogoUrl,
          dvlaApiKey: row.dvlaApiKey,
          autotraderIntegrationId: row.autotraderIntegrationId,
          assignedAt: row.assignedAt || row.createdAt,
          storeConfigId: row.storeConfigId,
          status: row.autotraderKey && row.autotraderSecret ? 'active' : 'configured'
        };
      }
    });

    console.log('✅ Bulk dealer keys processed:', {
      requested: dealerIds.length,
      found: Object.keys(keysData).length,
      performance: 'Single optimized query'
    });

    return {
      success: true,
      data: keysData
    };
    
  } catch (error) {
    console.error('❌ Error in bulk dealer keys fetch:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: {}
    };
  }
}

// Updated to revoke keys from store_config instead of requests table
// Update dealer store config (advertiser IDs, integration ID, company details)
export async function updateDealerStoreConfig(
  dealerId: string, 
  updates: {
    advertisementId?: string;
    additionalAdvertisementIds?: string[];
    autotraderIntegrationId?: string;
    companyName?: string;
    companyLogoUrl?: string;
  }
) {
  try {
    console.log('🔄 Updating store config for dealer:', dealerId);
    console.log('📋 Updates to apply:', updates);
    
    // First, find the dealer to look up their store config
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      return {
        success: false,
        error: 'Dealer not found'
      };
    }

    // Look for store config for this dealer using email
    const storeConfigData = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, dealer[0].email))
      .limit(1);

    if (storeConfigData.length === 0) {
      console.log('❌ No store config found for dealer email:', dealer[0].email);
      return {
        success: false,
        error: `No store config found for dealer ${dealer[0].name} (${dealer[0].email}). Please assign them through Partner Applications first.`
      };
    }

    const configId = storeConfigData[0].id;
    
    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    // Update primary advertisement ID
    if (updates.advertisementId !== undefined) {
      updateData.advertisementId = updates.advertisementId;
    }

    // Update additional advertisement IDs as JSON string
    if (updates.additionalAdvertisementIds !== undefined) {
      updateData.additionalAdvertisementIds = JSON.stringify(updates.additionalAdvertisementIds);
    }

    // Update integration ID
    if (updates.autotraderIntegrationId !== undefined) {
      updateData.autotraderIntegrationId = updates.autotraderIntegrationId;
    }

    // Update company details
    if (updates.companyName !== undefined) {
      updateData.companyName = updates.companyName;
    }

    if (updates.companyLogoUrl !== undefined) {
      updateData.companyLogoUrl = updates.companyLogoUrl;
    }

    console.log('💾 Applying updates to store config ID:', configId);
    
    // Update store config
    const [result] = await db
      .update(storeConfig)
      .set(updateData)
      .where(eq(storeConfig.id, configId))
      .returning();

    console.log('✅ Store config updated successfully');

    return { 
      success: true, 
      message: 'Store config updated successfully',
      data: result
    };
  } catch (error) {
    console.error('❌ Error updating store config:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: 'Failed to update store config: ' + errorMessage };
  }
}

export async function revokeDealerKeys(dealerId: string) {
  try {
    console.log('🔒 Revoking API keys for dealer:', dealerId);
    
    // First, find the dealer's Clerk ID to look up their store config
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      return {
        success: false,
        error: 'Dealer not found'
      };
    }

    // Look for store config for this dealer using email
    const storeConfigData = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, dealer[0].email))
      .limit(1);

    if (storeConfigData.length === 0 || !storeConfigData[0].autotraderKey || !storeConfigData[0].autotraderSecret) {
      console.log('⚠️ No active API keys found for dealer');
      return {
        success: false,
        error: 'No active API keys found for this dealer'
      };
    }

    // Clear API keys from store config
    const [result] = await db
      .update(storeConfig)
      .set({ 
        autotraderKey: null,
        autotraderSecret: null,
        updatedAt: new Date()
      })
      .where(eq(storeConfig.id, storeConfigData[0].id))
      .returning();

    console.log('✅ API keys revoked successfully');

    return { 
      success: true, 
      message: 'API keys revoked successfully',
      revokedStoreConfigId: result?.id
    };
  } catch (error) {
    console.error('❌ Error revoking dealer keys:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { 
      success: false, 
      error: `Failed to revoke API keys: ${errorMessage}`,
      details: error instanceof Error ? error.stack : undefined
    };
  }
}

export async function updateDealerRole(dealerId: string, newRole: string) {
  try {
    const [updatedDealer] = await db
      .update(dealers)
      .set({ role: newRole })
      .where(eq(dealers.id, dealerId))
      .returning();

    return { success: true, data: updatedDealer };
  } catch (error) {
    console.error('Error updating dealer role:', error);
    return { success: false, error: 'Failed to update dealer role' };
  }
}

// ADMIN JOIN SUBMISSION MANAGEMENT FUNCTIONS

// Get all join submissions for admin dashboard with optimized filtering
export async function getAllJoinSubmissions(limit = 50) {
  try {
    const submissions = await db
      .select()
      .from(joinSubmissions)
      .orderBy(desc(joinSubmissions.createdAt))
      .limit(limit);
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error('Error fetching join submissions:', error);
    return { success: false, error: 'Failed to fetch join submissions' };
  }
}

// Get join submissions by status - optimized version
export async function getJoinSubmissionsByStatus(status: string, limit = 50) {
  try {
    const submissions = await db
      .select()
      .from(joinSubmissions)
      .where(eq(joinSubmissions.status, status))
      .orderBy(desc(joinSubmissions.createdAt))
      .limit(limit);
    
    return { success: true, data: submissions };
  } catch (error) {
    console.error('Error fetching join submissions by status:', error);
    return { success: false, error: 'Failed to fetch join submissions' };
  }
}

// Optimized function to get join submissions with status counts
export async function getJoinSubmissionsWithCounts(limit = 100) {
  try {
    // Get all submissions in one query
    const submissions = await db
      .select()
      .from(joinSubmissions)
      .orderBy(desc(joinSubmissions.createdAt))
      .limit(limit);

    // Calculate status counts from the fetched data
    const statusCounts = submissions.reduce((acc, submission) => {
      acc[submission.status] = (acc[submission.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { 
      success: true, 
      data: submissions,
      counts: {
        all: submissions.length,
        pending: statusCounts.pending || 0,
        reviewing: statusCounts.reviewing || 0,
        approved: statusCounts.approved || 0,
        rejected: statusCounts.rejected || 0
      }
    };
  } catch (error) {
    console.error('Error fetching join submissions with counts:', error);
    return { success: false, error: 'Failed to fetch join submissions' };
  }
}



// USER ASSIGNMENT FUNCTIONS

// Create user assignment when admin accepts a user
export async function createUserAssignment(data: NewUserAssignment) {
  try {
    const [assignment] = await db
      .insert(userAssignments)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    return { success: true, data: assignment };
  } catch (error) {
    console.error('Error creating user assignment:', error);
    return { success: false, error: 'Failed to create user assignment' };
  }
}

// Get user assignment by join submission ID
export async function getUserAssignmentBySubmissionId(joinSubmissionId: number) {
  try {
    const assignments = await db
      .select()
      .from(userAssignments)
      .where(eq(userAssignments.joinSubmissionId, joinSubmissionId))
      .limit(1);
    
    return { 
      success: true, 
      data: assignments.length > 0 ? assignments[0] : null 
    };
  } catch (error) {
    console.error('Error fetching user assignment:', error);
    return { success: false, error: 'Failed to fetch user assignment' };
  }
}

// Update user assignment
export async function updateUserAssignment(assignmentId: number, data: Partial<UserAssignment>) {
  try {
    const [updatedAssignment] = await db
      .update(userAssignments)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(userAssignments.id, assignmentId))
      .returning();

    return { success: true, data: updatedAssignment };
  } catch (error) {
    console.error('Error updating user assignment:', error);
    return { success: false, error: 'Failed to update user assignment' };
  }
}

// Get all user assignments for admin dashboard
export async function getAllUserAssignments(limit = 50) {
  try {
    const assignments = await db
      .select({
        assignment: userAssignments,
        submission: joinSubmissions,
        dealer: dealers
      })
      .from(userAssignments)
      .leftJoin(joinSubmissions, eq(userAssignments.joinSubmissionId, joinSubmissions.id))
      .leftJoin(dealers, eq(userAssignments.dealerId, dealers.id))
      .orderBy(desc(userAssignments.createdAt))
      .limit(limit);
    
    return { success: true, data: assignments };
  } catch (error) {
    console.error('Error fetching user assignments:', error);
    return { success: false, error: 'Failed to fetch user assignments' };
  }
}

// STORE CONFIG FUNCTIONS

// Create store config entry
export async function createStoreConfig(data: NewStoreConfig) {
  try {
    console.log('🔄 Creating store config with data:', {
      joinSubmissionId: data.joinSubmissionId,
      email: data.email,
      storeName: data.storeName,
      storeType: data.storeType,
      assignedBy: data.assignedBy,
      invitationStatus: data.invitationStatus
    });
    
    // Test database connection first
    console.log('🔄 Testing database connection...');
    await db.select().from(storeConfig).limit(1);
    console.log('✅ Database connection successful');
    
    const [storeConfigEntry] = await db
      .insert(storeConfig)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    
    console.log('✅ Store config created successfully with ID:', storeConfigEntry.id);
    return { success: true, data: storeConfigEntry };
  } catch (error) {
    console.error('❌ Database error creating store config:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
      code: (error as any)?.code,
      constraint: (error as any)?.constraint,
      detail: (error as any)?.detail,
      table: (error as any)?.table,
      column: (error as any)?.column
    });
    console.error('❌ Data being inserted:', JSON.stringify(data, null, 2));
    
    // Return the actual error message for debugging
    const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
    return { success: false, error: errorMessage };
  }
}

// Get store config by email
export async function getStoreConfigByEmail(email: string) {
  try {
    const configs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, email))
      .limit(1);
    
    return { 
      success: true, 
      data: configs.length > 0 ? configs[0] : null 
    };
  } catch (error) {
    console.error('Error fetching store config by email:', error);
    return { success: false, error: 'Failed to fetch store config' };
  }
}

// Get store config by clerk user ID
export async function getStoreConfigByClerkUserId(clerkUserId: string) {
  try {
    const configs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, clerkUserId))
      .limit(1);
    
    return { 
      success: true, 
      data: configs.length > 0 ? configs[0] : null 
    };
  } catch (error) {
    console.error('Error fetching store config by clerk user ID:', error);
    return { success: false, error: 'Failed to fetch store config' };
  }
}

// Update store config clerk user ID when user signs up
export async function updateStoreConfigClerkUserId(email: string, clerkUserId: string) {
  try {
    console.log('🔄 Updating store config with Clerk user ID:', { email, clerkUserId });
    
    const [updated] = await db
      .update(storeConfig)
      .set({ 
        clerkUserId, 
        invitationStatus: 'accepted',
        updatedAt: new Date() 
      })
      .where(eq(storeConfig.email, email))
      .returning();
    
    console.log('✅ Store config updated successfully:', { 
      id: updated?.id, 
      email: updated?.email,
      status: updated?.invitationStatus,
      clerkUserId: updated?.clerkUserId
    });
    
    return { success: true, data: updated };
  } catch (error) {
    console.error('❌ Error updating store config clerk user ID:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      email,
      clerkUserId
    });
    return { success: false, error: 'Failed to update store config' };
  }
}

// Send Clerk invitation
export async function sendClerkInvitation(email: string, storeConfigId: number) {
  try {
    console.log(`📧 Starting Clerk invitation process for: ${email}`);
    console.log(`🔧 Store config ID: ${storeConfigId}`);
    
    // Sanitize and validate email to prevent ByteString conversion errors
    const sanitizedEmail = email
      .trim()
      .toLowerCase()
      .replace(/[^\x00-\x7F]/g, ""); // Remove all non-ASCII characters
    
    console.log(`🧹 Original email: "${email}"`);
    console.log(`🧹 Sanitized email: "${sanitizedEmail}"`);
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error(`Invalid email format after sanitization: "${sanitizedEmail}"`);
    }

    // Check if user already exists in Clerk or has pending invitations
    console.log('🔍 Checking for existing users and invitations in Clerk...');
    const clerkClient_instance = await clerkClient();
    
    try {
      // Check if user already exists
      const existingUsers = await clerkClient_instance.users.getUserList({
        emailAddress: [sanitizedEmail],
        limit: 1
      });
      
      if (existingUsers.data && existingUsers.data.length > 0) {
        console.log('⚠️ User already exists in Clerk, cannot send invitation');
        return {
          success: false,
          error: 'User already exists in the system. Please ask them to sign in directly.',
          userExists: true
        };
      }

      // Check for existing pending invitations
      const existingInvitations = await clerkClient_instance.invitations.getInvitationList();
      
      const existingInvitation = existingInvitations.data?.find(
        (inv: any) => inv.emailAddress === sanitizedEmail && inv.status === 'pending'
      );
      
      if (existingInvitation) {
        console.log('⚠️ Pending invitation already exists for this email');
        
        // Update store config with existing invitation ID
        await db
          .update(storeConfig)
          .set({ 
            email: sanitizedEmail,
            clerkInvitationId: existingInvitation.id,
            invitationStatus: 'invited',
            updatedAt: new Date() 
          })
          .where(eq(storeConfig.id, storeConfigId));
        
        return {
          success: true,
          data: {
            invitation: {
              id: existingInvitation.id,
              emailAddress: existingInvitation.emailAddress,
              status: existingInvitation.status,
              url: existingInvitation.url
            },
            sanitizedEmail: sanitizedEmail,
            originalEmail: email,
            invitationUrl: existingInvitation.url,
            isExisting: true
          }
        };
      }
    } catch (checkError) {
      console.log('ℹ️ Could not check existing users/invitations, proceeding with new invitation');
    }
    
    // Use a simple, reliable redirect URL construction
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    
    // For Clerk invitations, use the sign-in page instead of sign-up to avoid conflicts
    const redirectUrl = `${baseUrl}/sign-in`;
    
    console.log(`🌐 Base URL: ${baseUrl}`);
    console.log(`🌐 Redirect URL: ${redirectUrl}`);
    
    // Validate redirect URL format
    try {
      new URL(redirectUrl);
      console.log(`✅ Redirect URL validation passed`);
    } catch (urlError) {
      console.error(`❌ Invalid redirect URL format: ${redirectUrl}`);
      throw new Error(`Invalid redirect URL: ${redirectUrl}`);
    }
    
    // Create invitation via Clerk
    console.log(`🔄 Preparing Clerk invitation...`);
    console.log(`🔑 Checking Clerk environment variables...`);
    console.log(`🔑 CLERK_SECRET_KEY exists:`, !!process.env.CLERK_SECRET_KEY);
    console.log(`🔑 CLERK_SECRET_KEY length:`, process.env.CLERK_SECRET_KEY?.length || 0);
    console.log(`🔑 NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY exists:`, !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
    
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY environment variable is not set');
    }
    
    console.log(`✅ Using Clerk client for invitation creation`);
    
    // Prepare invitation parameters with clean ASCII-only data
    const invitationParams = {
      emailAddress: sanitizedEmail,
      redirectUrl: redirectUrl,
      publicMetadata: {
        role: 'store_owner',
        storeConfigId: storeConfigId.toString()
      }
    };
    
    console.log(`📧 === CLERK INVITATION PARAMS ===`);
    console.log(`📧 Email:`, sanitizedEmail);
    console.log(`🌐 Redirect URL:`, redirectUrl);
    console.log(`👤 Role:`, 'store_owner');
    console.log(`🆔 Store Config ID:`, storeConfigId.toString());
    console.log(`📧 === END PARAMS ===`);
    
    // Try to make the API call with better error handling
    console.log(`🚀 Making Clerk API call...`);
    try {
      const invitation = await clerkClient_instance.invitations.createInvitation(invitationParams);
      console.log(`✅ Clerk API call successful!`);
      
      console.log(`✅ Clerk invitation created with ID: ${invitation.id}`);
      console.log(`✅ Invitation sent to: ${invitation.emailAddress}`);
      
      // Update store config with invitation ID and status
      console.log(`🔄 Updating store config with invitation details...`);
      await db
        .update(storeConfig)
        .set({ 
          email: sanitizedEmail, // Update with sanitized email
          clerkInvitationId: invitation.id,
          invitationStatus: 'invited',
          updatedAt: new Date() 
        })
        .where(eq(storeConfig.id, storeConfigId));
      
      console.log(`✅ Store config updated successfully`);
      
      // Create invitation URL for display
      const invitationUrl = invitation.url || `${redirectUrl}?__clerk_invitation_token=${invitation.id}`;
      
      return { 
        success: true, 
        data: { 
          invitation: {
            id: invitation.id,
            emailAddress: invitation.emailAddress,
            status: invitation.status,
            url: invitationUrl
          },
          sanitizedEmail: sanitizedEmail,
          originalEmail: email,
          invitationUrl: invitationUrl
        } 
      };
      
    } catch (clerkError: any) {
      console.log(`❌ Clerk API call failed!`);
      console.log(`❌ Error type:`, typeof clerkError);
      console.log(`❌ Error constructor:`, clerkError?.constructor?.name);
      console.log(`❌ Error message:`, clerkError?.message);
      console.log(`❌ Error response:`, clerkError?.response?.data || 'No response data');
      console.log(`❌ Error status:`, clerkError?.response?.status || 'No status');
      
      // Parse Clerk error details if available
      let errorDetails = 'Unknown Clerk API error';
      if (clerkError?.response?.data) {
        if (typeof clerkError.response.data === 'string') {
          errorDetails = clerkError.response.data;
        } else if (clerkError.response.data.errors) {
          errorDetails = clerkError.response.data.errors.map((e: any) => e.message || e.longMessage || e).join(', ');
        } else if (clerkError.response.data.message) {
          errorDetails = clerkError.response.data.message;
        }
      } else if (clerkError?.message) {
        errorDetails = clerkError.message;
      }
      
      console.log(`❌ Parsed error details:`, errorDetails);
      
      // Handle specific error cases
      if (errorDetails.includes('Bad Request') || clerkError?.response?.status === 400) {
        if (errorDetails.includes('email') || errorDetails.includes('invitation')) {
          errorDetails = 'Invalid email address or invitation already exists for this email';
        } else if (errorDetails.includes('redirect')) {
          errorDetails = 'Invalid redirect URL configuration';
        } else {
          errorDetails = 'Bad request - please check the email address and try again';
        }
      } else if (errorDetails.includes('already exists') || errorDetails.includes('duplicate')) {
        errorDetails = 'User already exists in the system or has a pending invitation';
      }
      
      throw new Error(`Clerk API Error: ${errorDetails}`);
    }
  } catch (error) {
    console.error('❌ Error sending Clerk invitation:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
      originalEmail: email,
      storeConfigId: storeConfigId
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update store config to failed status
    try {
      await db
        .update(storeConfig)
        .set({ 
          invitationStatus: 'failed',
          updatedAt: new Date() 
        })
        .where(eq(storeConfig.id, storeConfigId));
      console.log(`✅ Store config status updated to failed`);
    } catch (dbError) {
      console.error('❌ Failed to update store config status:', dbError);
    }
    
    return { 
      success: false, 
      error: errorMessage,
      details: {
        originalEmail: email,
        storeConfigId: storeConfigId,
        errorType: error instanceof Error ? error.name : 'Unknown'
      }
    };
  }
}

// Accept join submission and create store owner invitation
export async function acceptJoinSubmissionAndCreateStoreOwner(
  submissionId: number,
  adminClerkId: string,
  assignmentData: {
    advertisementIds?: string[];
    primaryAdvertisementId?: string;
    autotraderKey?: string;
    autotraderSecret?: string;
    dvlaApiKey?: string;
    autotraderIntegrationId?: string;
    companyName?: string;
    companyLogo?: string;
  }
) {
  try {
    console.log('🔄 Starting store owner creation process for submission:', submissionId);
    console.log('🔄 Admin Clerk ID:', adminClerkId);
    
    // Get the admin's dealer record from Clerk ID
    console.log('🔄 Looking up admin dealer record...');
    const adminDealers = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, adminClerkId))
      .limit(1);

    if (adminDealers.length === 0) {
      console.error('❌ Admin dealer record not found for Clerk ID:', adminClerkId);
      return { success: false, error: 'Admin dealer record not found' };
    }

    const adminDealer = adminDealers[0];
    console.log('✅ Found admin dealer:', { id: adminDealer.id, email: adminDealer.email });
    
    // Get the join submission
    console.log('🔄 Fetching join submission...');
    const submission = await db
      .select()
      .from(joinSubmissions)
      .where(eq(joinSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      console.error('❌ Join submission not found:', submissionId);
      return { success: false, error: 'Join submission not found' };
    }

    const joinData = submission[0];
    console.log('✅ Found join submission for:', joinData.email);

    // Check if store config already exists for this submission
    const existingConfigs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.joinSubmissionId, submissionId))
      .limit(1);

    let storeConfigEntry;
    
    if (existingConfigs.length > 0) {
      console.log('🔄 Updating existing store config...');
      // Update existing store config
      const [updated] = await db
        .update(storeConfig)
        .set({
          storeName: joinData.dealershipName,
          storeType: joinData.dealershipType,
          advertisementIds: assignmentData.advertisementIds ? JSON.stringify(assignmentData.advertisementIds) : null,
          primaryAdvertisementId: assignmentData.primaryAdvertisementId || null,
          autotraderKey: assignmentData.autotraderKey || null,
          autotraderSecret: assignmentData.autotraderSecret || null,
          dvlaApiKey: assignmentData.dvlaApiKey || null,
          autotraderIntegrationId: assignmentData.autotraderIntegrationId || null,
          companyName: assignmentData.companyName || null,
          companyLogo: assignmentData.companyLogo || null,
          updatedAt: new Date()
        })
        .where(eq(storeConfig.id, existingConfigs[0].id))
        .returning();
        
      storeConfigEntry = updated;
      console.log('✅ Store config updated successfully');
    } else {
      console.log('🔄 Creating new store config...');
      // Create new store config entry
      const storeConfigData: NewStoreConfig = {
        joinSubmissionId: submissionId,
        email: joinData.email,
        storeName: joinData.dealershipName,
        storeType: joinData.dealershipType || null,
        advertisementIds: assignmentData.advertisementIds ? JSON.stringify(assignmentData.advertisementIds) : null,
        primaryAdvertisementId: assignmentData.primaryAdvertisementId || null,
        autotraderKey: assignmentData.autotraderKey || null,
        autotraderSecret: assignmentData.autotraderSecret || null,
        dvlaApiKey: assignmentData.dvlaApiKey || null,
        autotraderIntegrationId: assignmentData.autotraderIntegrationId || null,
        companyName: assignmentData.companyName || null,
        companyLogo: assignmentData.companyLogo || null,
        assignedBy: adminDealer.id,  // Use dealer UUID instead of Clerk ID
        invitationStatus: 'pending'
      };

      const result = await createStoreConfig(storeConfigData);
      if (!result.success) {
        console.error('❌ Failed to create store config:', result.error);
        return { success: false, error: 'Failed to create store config: ' + result.error };
      }
      storeConfigEntry = result.data!;
      console.log('✅ Store config created successfully');
    }

    console.log('🔄 Updating join submission status...');
    // Update join submission status
    const statusUpdate = await updateJoinSubmissionStatus(submissionId, 'approved', adminDealer.id, 'Approved and invitation will be sent');
    if (!statusUpdate.success) {
      console.error('❌ Failed to update join submission status:', statusUpdate.error);
      return { success: false, error: 'Failed to update submission status: ' + statusUpdate.error };
    }
    console.log('✅ Join submission status updated');

    console.log('🔄 Sending Clerk invitation...');
    // Send Clerk invitation
    const invitationResult = await sendClerkInvitation(joinData.email, storeConfigEntry.id);
    
    if (!invitationResult.success) {
      console.error('❌ Failed to send invitation:', invitationResult.error);
      // Don't fail the whole process, just update status
      await updateJoinSubmissionStatus(submissionId, 'approved', adminDealer.id, 'Approved but invitation failed to send: ' + invitationResult.error);
      
      return { 
        success: true, 
        data: { 
          storeConfig: storeConfigEntry,
          submission: joinData,
          invitation: null,
          warning: 'Store config created but invitation failed to send: ' + invitationResult.error
        } 
      };
    }

    console.log('✅ Clerk invitation sent successfully');
    
    // Send comprehensive approval email to applicant with assignment details
    console.log('📧 Sending detailed approval email to applicant...');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
      const inviteUrl = `${baseUrl}/dashboard-redirect?invitation=1`;
      
      // Prepare assignment details for email
      const assignmentDetails = {
        companyName: assignmentData.companyName,
        primaryAdvertisementId: assignmentData.primaryAdvertisementId,
        advertisementIds: assignmentData.advertisementIds,
        autotraderIntegrationId: assignmentData.autotraderIntegrationId,
        autotraderKey: assignmentData.autotraderKey,
        autotraderSecret: assignmentData.autotraderSecret, // Note: We'll mask this in the template
        dvlaApiKey: assignmentData.dvlaApiKey,
        companyLogo: assignmentData.companyLogo
      };
      
      const approvalEmailResult = await EmailService.sendJoinRequestApproved({
        to: joinData.email,
        applicantName: `${joinData.firstName} ${joinData.lastName}`,
        dealershipName: joinData.dealershipName,
        inviteUrl: inviteUrl,
        adminName: adminDealer.name || adminDealer.email,
        approvalDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        assignmentDetails: assignmentDetails
      });
      
      if (approvalEmailResult.success) {
        console.log('✅ Detailed approval email sent to applicant with assignment details');
      } else {
        console.warn('⚠️ Failed to send approval email:', approvalEmailResult.error);
      }
    } catch (emailError) {
      console.error('❌ Error sending approval email:', emailError);
    }
    
    return { 
      success: true, 
      data: { 
        storeConfig: storeConfigEntry,
        submission: joinData,
        invitation: invitationResult.data
      } 
    };
  } catch (error) {
    console.error('❌ Error in acceptJoinSubmissionAndCreateStoreOwner:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: 'Failed to accept join submission and create store owner invitation: ' + errorMessage };
  }
}

// Resend Clerk invitation for existing store config
export async function resendClerkInvitation(submissionId: number) {
  try {
    console.log('🔄 Starting resend invitation process for submission:', submissionId);
    
    // Get the join submission
    const submission = await db
      .select()
      .from(joinSubmissions)
      .where(eq(joinSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      console.error('❌ Join submission not found:', submissionId);
      return { success: false, error: 'Join submission not found' };
    }

    const joinData = submission[0];
    console.log('✅ Found join submission for:', joinData.email);

    // Get the store config for this submission
    const storeConfigs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.joinSubmissionId, submissionId))
      .limit(1);

    if (storeConfigs.length === 0) {
      console.error('❌ Store config not found for submission:', submissionId);
      return { success: false, error: 'Store config not found. Please create an assignment first.' };
    }

    const storeConfigEntry = storeConfigs[0];
    console.log('✅ Found store config:', { id: storeConfigEntry.id, email: storeConfigEntry.email, status: storeConfigEntry.invitationStatus });

    // Check if user already exists or has existing invitation
    if (storeConfigEntry.invitationStatus === 'invited' && storeConfigEntry.clerkInvitationId) {
      console.log('ℹ️ Invitation already exists, returning existing invitation details');
      return {
        success: true,
        data: {
          storeConfig: storeConfigEntry,
          submission: joinData,
          invitation: {
            id: storeConfigEntry.clerkInvitationId,
            emailAddress: storeConfigEntry.email,
            status: 'pending'
          },
          message: 'Invitation already exists and is pending',
          isExisting: true
        }
      };
    }

    // Resend the invitation
    console.log('🔄 Resending Clerk invitation...');
    const invitationResult = await sendClerkInvitation(storeConfigEntry.email, storeConfigEntry.id);
    
    if (!invitationResult.success) {
      console.error('❌ Failed to resend invitation:', invitationResult.error);
      
      // If the error indicates user already exists, update status and return success
      if (invitationResult.userExists) {
        await db
          .update(storeConfig)
          .set({ 
            invitationStatus: 'user_exists',
            updatedAt: new Date() 
          })
          .where(eq(storeConfig.id, storeConfigEntry.id));
        
        return {
          success: true,
          data: {
            storeConfig: storeConfigEntry,
            submission: joinData,
            message: 'User already exists in the system. They can sign in directly.',
            userExists: true
          }
        };
      }
      
      return { 
        success: false, 
        error: `Failed to resend invitation: ${invitationResult.error}`,
        details: invitationResult.details
      };
    }

    console.log('✅ Clerk invitation resent successfully');
    
    return { 
      success: true, 
      data: { 
        storeConfig: storeConfigEntry,
        submission: joinData,
        invitation: invitationResult.data,
        message: 'Invitation resent successfully'
      } 
    };
  } catch (error) {
    console.error('❌ Error in resendClerkInvitation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: 'Failed to resend invitation: ' + errorMessage };
  }
}

// Get store config by join submission ID to check invitation status
export async function getStoreConfigBySubmissionId(submissionId: number) {
  try {
    const configs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.joinSubmissionId, submissionId))
      .limit(1);
    
    return { 
      success: true, 
      data: configs.length > 0 ? configs[0] : null 
    };
  } catch (error) {
    console.error('Error fetching store config by submission ID:', error);
    return { success: false, error: 'Failed to fetch store config' };
  }
}

// ENHANCED ASSIGNMENT FUNCTIONS WITH NEW COLUMNS

// Enhanced assignment data type for the new columns
export interface EnhancedAssignmentData {
  // Legacy column support (for backward compatibility)
  advertisementIds?: string[];
  primaryAdvertisementId?: string;
  autotraderKey?: string;
  autotraderSecret?: string;
  dvlaApiKey?: string;
  autotraderIntegrationId?: string;
  companyName?: string;
  companyLogo?: string;
  
  // New enhanced columns
  advertisementId?: string;
  additionalAdvertisementIds?: string[];
  companyLogoUrl?: string;
}

// Enhanced function to create or update store config with new columns
export async function createOrUpdateEnhancedStoreConfig(
  submissionId: number,
  adminClerkId: string,
  assignmentData: EnhancedAssignmentData
) {
  try {
    console.log('🔄 Starting enhanced store config creation for submission:', submissionId);
    console.log('📋 Assignment data:', assignmentData);
    
    // Get the admin's dealer record from Clerk ID
    const adminDealers = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, adminClerkId))
      .limit(1);

    if (adminDealers.length === 0) {
      console.error('❌ Admin dealer record not found for Clerk ID:', adminClerkId);
      return { success: false, error: 'Admin dealer record not found' };
    }

    const adminDealer = adminDealers[0];
    console.log('✅ Found admin dealer:', { id: adminDealer.id, email: adminDealer.email });
    
    // Get the join submission
    const submission = await db
      .select()
      .from(joinSubmissions)
      .where(eq(joinSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      console.error('❌ Join submission not found:', submissionId);
      return { success: false, error: 'Join submission not found' };
    }

    const joinData = submission[0];
    console.log('✅ Found join submission for:', joinData.email);

    // Check if store config already exists for this submission
    const existingConfigs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.joinSubmissionId, submissionId))
      .limit(1);

    const storeConfigData = {
      joinSubmissionId: submissionId,
      email: joinData.email,
      storeName: joinData.dealershipName,
      storeType: joinData.dealershipType,
      
      // Legacy columns (for backward compatibility)
      advertisementIds: assignmentData.advertisementIds ? JSON.stringify(assignmentData.advertisementIds) : null,
      primaryAdvertisementId: assignmentData.primaryAdvertisementId || null,
      autotraderKey: assignmentData.autotraderKey || null,
      autotraderSecret: assignmentData.autotraderSecret || null,
      dvlaApiKey: assignmentData.dvlaApiKey || null,
      autotraderIntegrationId: assignmentData.autotraderIntegrationId || null,
      companyName: assignmentData.companyName || null,
      companyLogo: assignmentData.companyLogo || null,
      
      // New enhanced columns
      advertisementId: assignmentData.advertisementId || null,
      additionalAdvertisementIds: assignmentData.additionalAdvertisementIds ? JSON.stringify(assignmentData.additionalAdvertisementIds) : null,
      companyLogoUrl: assignmentData.companyLogoUrl || null,
      assignedAt: new Date(),
      
      // Metadata
      assignedBy: adminDealer.id,
      invitationStatus: 'pending',
      updatedAt: new Date(),
    };

    let storeConfigEntry: StoreConfig;

    if (existingConfigs.length > 0) {
      // Update existing store config
      console.log('🔄 Updating existing store config...');
      const [updatedConfig] = await db
        .update(storeConfig)
        .set(storeConfigData)
        .where(eq(storeConfig.id, existingConfigs[0].id))
        .returning();
      
      storeConfigEntry = updatedConfig;
      console.log('✅ Store config updated successfully');
    } else {
      // Create new store config
      console.log('🔄 Creating new store config...');
      const [newConfig] = await db
        .insert(storeConfig)
        .values({
          ...storeConfigData,
          createdAt: new Date(),
        })
        .returning();
      
      storeConfigEntry = newConfig;
      console.log('✅ Store config created successfully');
    }

    // Update the join submission status to approved
    await updateJoinSubmissionStatus(submissionId, 'approved', adminDealer.id.toString());

    console.log('✅ Enhanced store config process completed successfully');
    return { 
      success: true, 
      data: { 
        storeConfig: storeConfigEntry,
        submission: joinData,
        isUpdate: existingConfigs.length > 0
      } 
    };

  } catch (error) {
    console.error('❌ Error in enhanced store config creation:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return { success: false, error: 'Failed to create/update enhanced store config: ' + errorMessage };
  }
}

// Get enhanced assignment data by submission ID or user ID
export async function getEnhancedAssignmentData(
  submissionId?: number,
  userClerkId?: string,
  userEmail?: string
) {
  try {
    console.log('🔍 Fetching enhanced assignment data:', { submissionId, userClerkId, userEmail });
    
    let config: StoreConfig | null = null;

    if (submissionId) {
      // Fetch by submission ID
      const result = await db
        .select()
        .from(storeConfig)
        .where(eq(storeConfig.joinSubmissionId, submissionId))
        .limit(1);
      
      config = result.length > 0 ? result[0] : null;
    } else if (userClerkId) {
      // Fetch by Clerk user ID
      const result = await db
        .select()
        .from(storeConfig)
        .where(eq(storeConfig.clerkUserId, userClerkId))
        .limit(1);
      
      config = result.length > 0 ? result[0] : null;
    } else if (userEmail) {
      // Fetch by email
      const result = await db
        .select()
        .from(storeConfig)
        .where(eq(storeConfig.email, userEmail))
        .limit(1);
      
      config = result.length > 0 ? result[0] : null;
    }

    if (!config) {
      return { success: false, error: 'Assignment data not found' };
    }

    // Parse JSON fields for easier consumption
    const enhancedData = {
      ...config,
      advertisementIdsParsed: config.advertisementIds ? JSON.parse(config.advertisementIds) : [],
      additionalAdvertisementIdsParsed: config.additionalAdvertisementIds ? JSON.parse(config.additionalAdvertisementIds) : [],
    };

    console.log('✅ Enhanced assignment data retrieved successfully');
    return { success: true, data: enhancedData };

  } catch (error) {
    console.error('❌ Error fetching enhanced assignment data:', error);
    return { success: false, error: 'Failed to fetch enhanced assignment data' };
  }
}

// Accept join submission and create dealer account
export async function acceptJoinSubmissionAndCreateDealer(
  submissionId: number,
  adminId: string,
  assignmentData: {
    advertisementIds?: string[];
    primaryAdvertisementId?: string;
    autotraderKey?: string;
    autotraderSecret?: string;
    dvlaApiKey?: string;
    autotraderIntegrationId?: string;
    companyName?: string;
    companyLogo?: string;
  }
) {
  try {
    // Get the join submission
    const submission = await db
      .select()
      .from(joinSubmissions)
      .where(eq(joinSubmissions.id, submissionId))
      .limit(1);

    if (submission.length === 0) {
      return { success: false, error: 'Join submission not found' };
    }

    const joinData = submission[0];

    // Create dealer account
    const [newDealer] = await db
      .insert(dealers)
      .values({
        name: `${joinData.firstName} ${joinData.lastName}`,
        email: joinData.email,
        role: 'dealer',
        clerkUserId: '', // Will be updated when user signs up
      })
      .returning();

    // Update join submission status
    await updateJoinSubmissionStatus(submissionId, 'approved', adminId, 'Accepted and dealer account created');

    // Create user assignment
    const assignment = await createUserAssignment({
      joinSubmissionId: submissionId,
      dealerId: newDealer.id,
      advertisementIds: assignmentData.advertisementIds ? JSON.stringify(assignmentData.advertisementIds) : null,
      primaryAdvertisementId: assignmentData.primaryAdvertisementId || null,
      autotraderKey: assignmentData.autotraderKey || null,
      autotraderSecret: assignmentData.autotraderSecret || null,
      dvlaApiKey: assignmentData.dvlaApiKey || null,
      autotraderIntegrationId: assignmentData.autotraderIntegrationId || null,
      companyName: assignmentData.companyName || null,
      companyLogo: assignmentData.companyLogo || null,
      assignedBy: adminId,
    });

    return { 
      success: true, 
      data: { 
        dealer: newDealer, 
        assignment: assignment.data,
        submission: joinData
      } 
    };
  } catch (error) {
    console.error('Error accepting join submission:', error);
    return { success: false, error: 'Failed to accept join submission and create dealer' };
  }
} 

// TEAM MEMBER FUNCTIONS

// Send Clerk invitation for team member
export async function sendTeamMemberInvitation(email: string, role: string, storeOwnerId: string) {
  try {
    console.log(`📧 Starting team member Clerk invitation process for: ${email}`);
    console.log(`👤 Role: ${role}`);
    console.log(`🏪 Store Owner ID: ${storeOwnerId}`);
    
    // Sanitize and validate email
    const sanitizedEmail = email
      .trim()
      .toLowerCase()
      .replace(/[^\x00-\x7F]/g, "");
    
    console.log(`🧹 Original email: "${email}"`);
    console.log(`🧹 Sanitized email: "${sanitizedEmail}"`);
    
    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(sanitizedEmail)) {
      throw new Error(`Invalid email format after sanitization: "${sanitizedEmail}"`);
    }
    
    // Initialize Clerk client first
    console.log(`🔄 Initializing Clerk client...`);
    
    if (!process.env.CLERK_SECRET_KEY) {
      throw new Error('CLERK_SECRET_KEY environment variable is not set');
    }
    
    const client = await clerkClient();
    console.log(`✅ Clerk client initialized successfully`);
    
    // Check if user already exists in Clerk
    console.log(`🔍 Checking if user already exists...`);
    try {
      const existingUsers = await client.users.getUserList({
        emailAddress: [sanitizedEmail]
      });
      
      if (existingUsers.data.length > 0) {
        console.log(`⚠️ User already exists in Clerk:`, existingUsers.data[0].id);
        
        // User exists - we need to add them directly to our team instead of sending invitation
        const existingUser = existingUsers.data[0];
        
        // Update their metadata to include team member info
        await client.users.updateUserMetadata(existingUser.id, {
          publicMetadata: {
            ...existingUser.publicMetadata,
            role: role,
            userType: 'team_member',
            storeOwnerId: storeOwnerId,
            teamMemberRole: role
          }
        });
        
        console.log(`✅ Updated existing user metadata`);
        
        // Return success with existing user info
        return {
          success: true,
          invitationId: `existing_user_${existingUser.id}`,
          email: sanitizedEmail,
          existingUser: true,
          userId: existingUser.id
        };
      }
    } catch (userCheckError) {
      console.log(`ℹ️ User check failed (this is normal for new users):`, userCheckError);
    }
    
    // Check for existing invitations
    console.log(`🔍 Checking for existing invitations...`);
    try {
      // Check for pending invitations first
      const pendingInvitations = await client.invitations.getInvitationList({
        status: 'pending'
      });
      
      const pendingInvitation = pendingInvitations.data.find(
        inv => inv.emailAddress === sanitizedEmail
      );
      
      if (pendingInvitation) {
        console.log(`⚠️ Pending invitation already exists:`, pendingInvitation.id);
        // Revoke existing invitation and create a new one
        console.log(`🔄 Revoking existing pending invitation...`);
        await client.invitations.revokeInvitation(pendingInvitation.id);
        console.log(`✅ Existing invitation revoked`);
      }
      
      // Check for accepted invitations
      const acceptedInvitations = await client.invitations.getInvitationList({
        status: 'accepted'
      });
      
      const acceptedInvitation = acceptedInvitations.data.find(
        inv => inv.emailAddress === sanitizedEmail
      );
      
      if (acceptedInvitation) {
        console.log(`⚠️ User has already accepted an invitation:`, acceptedInvitation.id);
        return {
          success: false,
          error: `User has already accepted an invitation. Please check if they're already in the system.`
        };
      }
    } catch (invCheckError) {
      console.log(`ℹ️ Invitation check failed (this is normal):`, invCheckError);
    }
    
    // Use redirect URL for team member invitation acceptance
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/dashboard-redirect?invitation=1`;  // Direct to dashboard-redirect with invitation context
    
    console.log(`🌐 Base URL: ${baseUrl}`);
    console.log(`🌐 Redirect URL: ${redirectUrl}`);
    
    // Validate redirect URL format
    try {
      new URL(redirectUrl);
      console.log(`✅ Redirect URL validation passed`);
    } catch (urlError) {
      console.error(`❌ Invalid redirect URL format: ${redirectUrl}`);
      throw new Error(`Invalid redirect URL: ${redirectUrl}`);
    }
    
    // Prepare invitation parameters with enhanced configuration
    const invitationParams = {
      emailAddress: sanitizedEmail,
      redirectUrl: redirectUrl,
      publicMetadata: {
        role: role,
        storeOwnerId: storeOwnerId,
        userType: 'team_member',
        invitedBy: 'store_owner',
        invitedAt: new Date().toISOString()
      },
      // Disable Clerk's email since we send our own branded email
      notify: false,
      // Add custom template (if available in your Clerk setup)
      // templateName: 'team-member-invitation'
    };
    
    console.log(`\n🎯 === INVITATION CREATION DEBUG ===`);
    console.log(`📧 Email:`, sanitizedEmail);
    console.log(`🌐 Redirect URL:`, redirectUrl);
    console.log(`👤 Role:`, role);
    console.log(`🏪 Store Owner ID:`, storeOwnerId);
    console.log(`📧 Notify:`, true);
    console.log(`🕒 Invited At:`, new Date().toISOString());
    console.log(`🎯 === INVITATION CREATION DEBUG END ===\n`);
    
    // Make Clerk API call with enhanced error handling
    console.log(`🚀 Making Clerk API call with enhanced email delivery...`);
    const invitation = await client.invitations.createInvitation(invitationParams);
    console.log(`✅ Clerk API call successful!`);
    console.log(`✅ Clerk invitation created with ID: ${invitation.id}`);
    console.log(`✅ Invitation email should be sent to: ${sanitizedEmail}`);
    
    // Wait a moment to ensure email processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`🎯 Email invitation process completed successfully`);
    console.log(`📬 The invitation email should be delivered to: ${sanitizedEmail}`);
    console.log(`ℹ️ Note: Email delivery may take 1-5 minutes depending on email provider`);
    console.log(`📋 Invitation tracking ID: ${invitation.id}`);
    
    return {
      success: true,
      invitationId: invitation.id,
      email: sanitizedEmail,
      existingUser: false,
      emailSent: true
    };
    
  } catch (error: any) {
    console.error('❌ Error sending team member Clerk invitation:', error);
    
    // Extract detailed error information from Clerk
    let errorMessage = 'Unknown error occurred';
    let errorDetails = '';
    
    if (error?.clerkError && error?.errors) {
      console.log('🔍 Clerk error details:', error.errors);
      errorMessage = 'Clerk API Error';
      errorDetails = error.errors.map((e: any) => e.message || e.longMessage || JSON.stringify(e)).join(', ');
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    // Handle specific Clerk error cases
    if (error?.status === 422) {
      errorMessage = 'Invalid invitation request';
      if (errorDetails.includes('email') || errorDetails.includes('already')) {
        errorMessage = 'Email may already be registered or have a pending invitation';
      }
    }
    
    console.error('❌ Processed error message:', errorMessage);
    console.error('❌ Error details:', errorDetails);
    
    return {
      success: false,
      error: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
      emailSent: false
    };
  }
}

// Create team member invitation record
export async function createTeamMemberInvitation(storeOwnerId: string, name: string, email: string, role: string, phone?: string, specialization?: string) {
  try {
    console.log(`🔄 Creating team member invitation record...`);
    console.log(`🏪 Store Owner ID: ${storeOwnerId}`);
    console.log(`👤 Member: ${name} (${email}) - ${role}`);
    
    // Send Clerk invitation first
    const invitationResult = await sendTeamMemberInvitation(email, role, storeOwnerId);
    
    if (!invitationResult.success) {
      throw new Error(`Failed to send Clerk invitation: ${invitationResult.error}`);
    }
    
    // Create team member record in database
    const [newTeamMember] = await db
      .insert(teamMembers)
      .values({
        storeOwnerId,
        name,
        email: invitationResult.email!,
        phone,
        role,
        status: invitationResult.existingUser ? 'active' : 'pending',
        invitationStatus: invitationResult.existingUser ? 'accepted' : 'invited',
        clerkInvitationId: invitationResult.invitationId!,
        clerkUserId: invitationResult.existingUser ? invitationResult.userId : null,
        specialization: specialization || (role === 'sales' ? 'General Sales' : 'Operations')
      })
      .returning();
    
    console.log(`✅ Team member ${invitationResult.existingUser ? 'added' : 'invitation created'} successfully with ID: ${newTeamMember.id}`);
    
    return {
      success: true,
      teamMember: newTeamMember,
      invitationId: invitationResult.invitationId,
      existingUser: invitationResult.existingUser || false
    };
    
  } catch (error) {
    console.error('❌ Error creating team member invitation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Get team members for a store owner
export async function getTeamMembers(storeOwnerId: string): Promise<TeamMember[]> {
  try {
    const members = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.storeOwnerId, storeOwnerId))
      .orderBy(desc(teamMembers.createdAt));
    
    return members;
  } catch (error) {
    console.error('Error fetching team members:', error);
    return [];
  }
}

// Update team member
export async function updateTeamMember(memberId: number, updates: Partial<NewTeamMember>) {
  try {
    console.log('🔄 Updating team member:', { memberId, updates });
    
    // Get the current team member data before updating
    const [currentMember] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .limit(1);
      
    if (!currentMember) {
      throw new Error('Team member not found');
    }
    
    console.log('📋 Current member data:', {
      id: currentMember.id,
      name: currentMember.name,
      email: currentMember.email,
      role: currentMember.role,
      clerkUserId: currentMember.clerkUserId
    });
    
    // Update the team member in database
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teamMembers.id, memberId))
      .returning();
    
    console.log('✅ Team member updated in database:', {
      id: updatedMember.id,
      name: updatedMember.name,
      role: updatedMember.role
    });
    
    // If the user has a Clerk user ID and role was updated, update Clerk metadata
    if (updatedMember.clerkUserId && updates.role && updates.role !== currentMember.role) {
      console.log('🔄 Role changed - updating Clerk user metadata...');
      console.log('📋 Role change:', { from: currentMember.role, to: updates.role });
      
      try {
        const client = await clerkClient();
        await client.users.updateUserMetadata(updatedMember.clerkUserId, {
          publicMetadata: {
            role: updates.role,
            userType: 'team_member',
            storeOwnerId: updatedMember.storeOwnerId,
            teamMemberId: updatedMember.id
          }
        });
        
        console.log('✅ Clerk user metadata updated successfully');
        console.log('🎉 Role change completed for:', updatedMember.email);
      } catch (clerkError) {
        console.error('❌ Error updating Clerk metadata:', clerkError);
        // Don't fail the whole operation if Clerk update fails
        console.log('⚠️ Database updated but Clerk metadata update failed');
      }
    } else if (!updatedMember.clerkUserId) {
      console.log('ℹ️ Team member not yet active (no Clerk user ID) - metadata will be set when they join');
    } else {
      console.log('ℹ️ No role change detected - no Clerk metadata update needed');
    }
    
    return {
      success: true,
      teamMember: updatedMember
    };
  } catch (error) {
    console.error('❌ Error updating team member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Remove team member
export async function removeTeamMember(memberId: number) {
  try {
    const [deletedMember] = await db
      .delete(teamMembers)
      .where(eq(teamMembers.id, memberId))
      .returning();
    
    return {
      success: true,
      teamMember: deletedMember
    };
  } catch (error) {
    console.error('Error removing team member:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Get team member by email
export async function getTeamMemberByEmail(email: string): Promise<TeamMember | null> {
  try {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.email, email))
      .limit(1);
    
    return member || null;
  } catch (error) {
    console.error('Error fetching team member by email:', error);
    return null;
  }
}

// Update team member Clerk user ID when they sign up
export async function updateTeamMemberClerkUserId(email: string, clerkUserId: string) {
  try {
    const [updatedMember] = await db
      .update(teamMembers)
      .set({ 
        clerkUserId,
        status: 'active',
        invitationStatus: 'accepted',
        updatedAt: new Date()
      })
      .where(eq(teamMembers.email, email))
      .returning();
    
    return {
      success: true,
      teamMember: updatedMember
    };
  } catch (error) {
    console.error('Error updating team member Clerk user ID:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// ============================================================================
// TEMPLATE FUNCTIONS
// ============================================================================

// Re-export Template types for external use
export type { Template, NewTemplate } from '@/db/schema';

// Create a new template record in database
export async function createTemplate(templateData: NewTemplate): Promise<{ success: boolean; template?: Template; error?: string }> {
  try {
    console.log('📄 Creating template:', templateData.name);
    
    const [newTemplate] = await db
      .insert(templates)
      .values(templateData)
      .returning();
    
    console.log('✅ Template created successfully:', newTemplate.id);
    return {
      success: true,
      template: newTemplate
    };
  } catch (error) {
    console.error('❌ Error creating template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Get all templates for a dealer
export async function getTemplatesByDealer(dealerId: string): Promise<Template[]> {
  try {
    console.log('📋 Getting templates for dealer:', dealerId);
    
    const dealerTemplates = await db
      .select()
      .from(templates)
      .where(eq(templates.dealerId, dealerId))
      .orderBy(desc(templates.createdAt));
    
    console.log('✅ Found templates:', dealerTemplates.length);
    return dealerTemplates;
  } catch (error) {
    console.error('❌ Error getting templates:', error);
    return [];
  }
}

// Get templates by category for a dealer
export async function getTemplatesByCategory(dealerId: string, category: string): Promise<Template[]> {
  try {
    console.log('📂 Getting templates for dealer:', dealerId, 'category:', category);
    
    const categoryTemplates = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.dealerId, dealerId),
          eq(templates.category, category)
        )
      )
      .orderBy(desc(templates.createdAt));
    
    console.log('✅ Found category templates:', categoryTemplates.length);
    return categoryTemplates;
  } catch (error) {
    console.error('❌ Error getting category templates:', error);
    return [];
  }
}

// Delete a template
export async function deleteTemplate(templateId: string, dealerId: string): Promise<{ success: boolean; template?: Template; error?: string }> {
  try {
    console.log('🗑️ Deleting template:', templateId, 'for dealer:', dealerId);
    
    const [deletedTemplate] = await db
      .delete(templates)
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.dealerId, dealerId)
        )
      )
      .returning();
    
    if (!deletedTemplate) {
      return {
        success: false,
        error: 'Template not found or not authorized to delete'
      };
    }
    
    console.log('✅ Template deleted successfully:', deletedTemplate.id);
    return {
      success: true,
      template: deletedTemplate
    };
  } catch (error) {
    console.error('❌ Error deleting template:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Get a single template by ID
export async function getTemplateById(templateId: string, dealerId: string): Promise<Template | null> {
  try {
    console.log('🔍 Getting template:', templateId, 'for dealer:', dealerId);
    
    const [template] = await db
      .select()
      .from(templates)
      .where(
        and(
          eq(templates.id, templateId),
          eq(templates.dealerId, dealerId)
        )
      )
      .limit(1);
    
    return template || null;
  } catch (error) {
    console.error('❌ Error getting template:', error);
    return null;
  }
}

// ================================
// STOCK IMAGES FUNCTIONS
// ================================

// Re-export StockImage types for external use
export type { StockImage, NewStockImage } from '@/db/schema';

// Create a new stock image record in database
export async function createStockImage(stockImageData: NewStockImage): Promise<{ success: boolean; stockImage?: StockImage; error?: string }> {
  try {
    console.log('📸 Creating stock image:', stockImageData.name);
    
    const [newStockImage] = await db
      .insert(stockImages)
      .values(stockImageData)
      .returning();
    
    console.log('✅ Stock image created successfully:', newStockImage.id);
    return {
      success: true,
      stockImage: newStockImage
    };
  } catch (error) {
    console.error('❌ Error creating stock image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get all stock images for a dealer
export async function getStockImagesByDealer(dealerId: string): Promise<StockImage[]> {
  try {
    console.log('📋 Getting stock images for dealer:', dealerId);
    
    const dealerStockImages = await db
      .select()
      .from(stockImages)
      .where(eq(stockImages.dealerId, dealerId))
      .orderBy(desc(stockImages.createdAt));
    
    console.log('✅ Found stock images:', dealerStockImages.length);
    return dealerStockImages;
  } catch (error) {
    console.error('❌ Error getting stock images:', error);
    return [];
  }
}

// Get stock images by vehicle type for a dealer
export async function getStockImagesByVehicleType(dealerId: string, vehicleType: string): Promise<StockImage[]> {
  try {
    console.log('🚗 Getting stock images for dealer:', dealerId, 'vehicle type:', vehicleType);
    
    const vehicleStockImages = await db
      .select()
      .from(stockImages)
      .where(
        and(
          eq(stockImages.dealerId, dealerId),
          eq(stockImages.vehicleType, vehicleType)
        )
      )
      .orderBy(stockImages.sortOrder, desc(stockImages.createdAt));
    
    console.log('✅ Found stock images for vehicle type:', vehicleStockImages.length);
    return vehicleStockImages;
  } catch (error) {
    console.error('❌ Error getting stock images by vehicle type:', error);
    return [];
  }
}

// Get default stock images for a dealer
export async function getDefaultStockImages(dealerId: string): Promise<StockImage[]> {
  try {
    console.log('⭐ Getting default stock images for dealer:', dealerId);
    
    const defaultStockImages = await db
      .select()
      .from(stockImages)
      .where(
        and(
          eq(stockImages.dealerId, dealerId),
          eq(stockImages.isDefault, true)
        )
      )
      .orderBy(stockImages.sortOrder, desc(stockImages.createdAt));
    
    console.log('✅ Found default stock images:', defaultStockImages.length);
    return defaultStockImages;
  } catch (error) {
    console.error('❌ Error getting default stock images:', error);
    return [];
  }
}

// Delete a stock image
export async function deleteStockImage(stockImageId: string, dealerId: string): Promise<{ success: boolean; stockImage?: StockImage; error?: string }> {
  try {
    console.log('🗑️ Deleting stock image:', stockImageId, 'for dealer:', dealerId);
    
    const [deletedStockImage] = await db
      .delete(stockImages)
      .where(
        and(
          eq(stockImages.id, stockImageId),
          eq(stockImages.dealerId, dealerId)
        )
      )
      .returning();
    
    if (!deletedStockImage) {
      return {
        success: false,
        error: 'Stock image not found or not authorized to delete'
      };
    }
    
    console.log('✅ Stock image deleted successfully:', deletedStockImage.id);
    return {
      success: true,
      stockImage: deletedStockImage
    };
  } catch (error) {
    console.error('❌ Error deleting stock image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get a single stock image by ID
export async function getStockImageById(stockImageId: string, dealerId: string): Promise<StockImage | null> {
  try {
    console.log('🔍 Getting stock image:', stockImageId, 'for dealer:', dealerId);
    
    const [stockImage] = await db
      .select()
      .from(stockImages)
      .where(
        and(
          eq(stockImages.id, stockImageId),
          eq(stockImages.dealerId, dealerId)
        )
      )
      .limit(1);
    
    return stockImage || null;
  } catch (error) {
    console.error('❌ Error getting stock image:', error);
    return null;
  }
}

// Update stock image metadata
export async function updateStockImage(
  stockImageId: string, 
  dealerId: string, 
  updateData: Partial<NewStockImage>
): Promise<{ success: boolean; stockImage?: StockImage; error?: string }> {
  try {
    console.log('📝 Updating stock image:', stockImageId, 'for dealer:', dealerId);
    
    const [updatedStockImage] = await db
      .update(stockImages)
      .set({
        ...updateData,
        updatedAt: new Date()
      })
      .where(
        and(
          eq(stockImages.id, stockImageId),
          eq(stockImages.dealerId, dealerId)
        )
      )
      .returning();
    
    if (!updatedStockImage) {
      return {
        success: false,
        error: 'Stock image not found or not authorized to update'
      };
    }
    
    console.log('✅ Stock image updated successfully:', updatedStockImage.id);
    return {
      success: true,
      stockImage: updatedStockImage
    };
  } catch (error) {
    console.error('❌ Error updating stock image:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
} 