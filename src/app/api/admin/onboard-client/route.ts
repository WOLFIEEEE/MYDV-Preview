import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth, requireAdmin } from '@/lib/adminHelper';
import { db } from '@/lib/db';
import { dealers, storeConfig, companySettings, joinSubmissions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';
import { clerkClient } from '@clerk/nextjs/server';
import { EmailService } from '@/lib/emailService';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Client onboarding API route called');
    
    // Check admin authentication and authorization
    const adminAuthResponse = await requireAdmin();
    if (adminAuthResponse) {
      return adminAuthResponse;
    }

    // Get admin user details for logging
    const adminCheck = await checkAdminAuth();
    const adminUser = adminCheck.user;
    
    if (!adminUser) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'Admin user not found',
        details: 'Unable to retrieve admin user details',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/onboard-client'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }
    
    console.log('✅ Admin authenticated:', {
      adminId: adminUser.id,
      email: adminUser.emailAddresses?.[0]?.emailAddress?.replace(/(.{2}).*(@.*)/, '$1***$2'),
      timestamp: new Date().toISOString()
    });

    // Parse the request body
    const onboardingData = await request.json();
    
    console.log('📋 Onboarding data received:', {
      email: onboardingData.email,
      companyName: onboardingData.companyName,
      advertisementIds: onboardingData.advertisementIds?.length || 0
    });

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'email', 'companyName'];
    const missingFields = requiredFields.filter(field => !onboardingData[field]);
    
    if (missingFields.length > 0) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Missing required fields',
        details: `Required fields missing: ${missingFields.join(', ')}`,
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/onboard-client'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Validate advertisement IDs
    if (!onboardingData.advertisementIds || onboardingData.advertisementIds.length === 0) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'At least one advertisement ID is required',
        details: 'Advertisement IDs are required for AutoTrader integration',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/onboard-client'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingDealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.email, onboardingData.email))
      .limit(1);

    if (existingDealer.length > 0) {
      const conflictError = {
        type: ErrorType.VALIDATION,
        message: 'Email already exists',
        details: `A dealer with email ${onboardingData.email} already exists`,
        httpStatus: 409,
        timestamp: new Date().toISOString(),
        endpoint: 'admin/onboard-client'
      };
      return NextResponse.json(
        createErrorResponse(conflictError),
        { status: 409 }
      );
    }

    // Start database transaction
    const result = await db.transaction(async (tx) => {
      // 1. Create dealer record with placeholder clerkUserId
      // This will be updated when the user actually signs up through Clerk
      const placeholderClerkId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const [newDealer] = await tx
        .insert(dealers)
        .values({
          clerkUserId: placeholderClerkId, // Temporary placeholder until user signs up
          name: `${onboardingData.firstName} ${onboardingData.lastName}`,
          email: onboardingData.email,
          role: 'dealer',
          metadata: {
            onboardedBy: adminUser.id,
            onboardedAt: new Date().toISOString(),
            source: 'admin_onboarding',
            status: 'pending_signup',
            placeholderClerkId: placeholderClerkId
          }
        })
        .returning();

      console.log('✅ Dealer created:', { id: newDealer.id, email: newDealer.email });

      // 2. Create placeholder join submission for admin-initiated onboarding
      const [placeholderSubmission] = await tx
        .insert(joinSubmissions)
        .values({
          firstName: onboardingData.contactName?.split(' ')[0] || 'Admin',
          lastName: onboardingData.contactName?.split(' ').slice(1).join(' ') || 'Onboarded',
          email: onboardingData.email,
          phone: onboardingData.phone || null,
          dealershipName: onboardingData.companyName,
          dealershipType: onboardingData.businessType || 'dealer',
          numberOfVehicles: '50+',
          currentSystem: 'Admin Onboarded',
          inquiryType: 'admin_onboarding',
          subject: `Admin Onboarding: ${onboardingData.companyName}`,
          message: `Admin-initiated onboarding for ${onboardingData.companyName}`,
          preferredContact: 'email',
          status: 'approved',
          assignedTo: newDealer.id,
          notes: 'Created via admin client onboarding interface'
        })
        .returning();

      console.log('✅ Placeholder join submission created:', { id: placeholderSubmission.id });

      // 3. Create store configuration
      const primaryAdId = onboardingData.primaryAdvertisementId || onboardingData.advertisementIds[0];
      const additionalAdIds = onboardingData.advertisementIds.length > 1 
        ? onboardingData.advertisementIds.slice(1) 
        : [];

      const [newStoreConfig] = await tx
        .insert(storeConfig)
        .values({
          joinSubmissionId: placeholderSubmission.id,
          email: onboardingData.email,
          storeName: onboardingData.companyName,
          storeType: onboardingData.businessType || 'dealer',
          
          // Use new enhanced columns as primary (legacy fields kept for backward compatibility)
          advertisementId: primaryAdId, // Primary field for new system
          additionalAdvertisementIds: additionalAdIds.length > 0 ? JSON.stringify(additionalAdIds) : null,
          
          // Legacy columns (for backward compatibility during migration)
          advertisementIds: JSON.stringify(onboardingData.advertisementIds),
          primaryAdvertisementId: primaryAdId,
          
          // Other configuration
          autotraderIntegrationId: onboardingData.autotraderIntegrationId || null,
          companyName: onboardingData.companyName,
          companyLogo: onboardingData.companyLogo || null,
          companyLogoUrl: onboardingData.companyLogo && onboardingData.companyLogo.startsWith('http') 
            ? onboardingData.companyLogo 
            : null,
          
          assignedBy: newDealer.id,
          invitationStatus: 'pending'
        })
        .returning();

      console.log('✅ Store config created:', { id: newStoreConfig.id, storeName: newStoreConfig.storeName });

      // 4. Create company settings
      const [newCompanySettings] = await tx
        .insert(companySettings)
        .values({
          dealerId: newDealer.id,
          
          // Basic Company Information
          companyName: onboardingData.companyName,
          businessType: onboardingData.businessType || null,
          establishedYear: onboardingData.establishedYear || null,
          registrationNumber: onboardingData.registrationNumber || null,
          vatNumber: onboardingData.vatNumber || null,
          
          // Company Logo
          companyLogoFileName: null, // Will be set when logo is uploaded to Supabase
          companyLogoSupabaseFileName: null,
          companyLogoPublicUrl: onboardingData.companyLogo || null,
          companyLogoFileSize: null,
          companyLogoMimeType: null,
          
          // Address Information
          addressStreet: onboardingData.addressStreet || null,
          addressCity: onboardingData.addressCity || null,
          addressCounty: onboardingData.addressCounty || null,
          addressPostCode: onboardingData.addressPostCode || null,
          addressCountry: onboardingData.addressCountry || 'United Kingdom',
          
          // Contact Information
          contactPhone: onboardingData.phone || null,
          contactEmail: onboardingData.email,
          contactWebsite: onboardingData.contactWebsite || null,
          contactFax: onboardingData.contactFax || null,
          
          // Additional Information
          description: onboardingData.description || null
        })
        .returning();

      console.log('✅ Company settings created:', { id: newCompanySettings.id });

      return {
        dealer: newDealer,
        storeConfig: newStoreConfig,
        companySettings: newCompanySettings
      };
    });

    // 4. Send Clerk invitation (outside transaction)
    let invitationResult = null;
    try {
      console.log('📧 Sending Clerk invitation...');
      
      // Create Clerk invitation
      const client = await clerkClient();
      const invitation = await client.invitations.createInvitation({
        emailAddress: onboardingData.email,
        redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard-redirect?invitation=1`,
        notify: true
      });

      // Update store config with invitation ID
      await db
        .update(storeConfig)
        .set({
          clerkInvitationId: invitation.id,
          invitationStatus: 'invited',
          updatedAt: new Date()
        })
        .where(eq(storeConfig.id, result.storeConfig.id));

      invitationResult = {
        success: true,
        invitationId: invitation.id,
        invitationUrl: invitation.url
      };

      console.log('✅ Clerk invitation sent successfully');
    } catch (inviteError) {
      console.error('❌ Failed to send Clerk invitation:', inviteError);
      invitationResult = {
        success: false,
        error: inviteError instanceof Error ? inviteError.message : 'Unknown invitation error'
      };
    }

    // 5. Send welcome email using Resend (similar to team member invitations)
    // TODO: Temporarily commented out - Admin requested to disable email sending for onboarding
    let welcomeEmailResult = null;
    /*
    try {
      console.log('📧 Sending welcome email using Resend...');
      
      const adminName = adminUser.firstName && adminUser.lastName 
        ? `${adminUser.firstName} ${adminUser.lastName}` 
        : adminUser.emailAddresses?.[0]?.emailAddress || 'MYDV Admin';
      
      const inviteUrl = (invitationResult?.success && invitationResult.invitationUrl) 
        ? invitationResult.invitationUrl 
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard-redirect?invitation=1`;
      
      const emailResult = await EmailService.sendJoinRequestApproved({
        to: onboardingData.email,
        applicantName: `${onboardingData.firstName} ${onboardingData.lastName}`,
        dealershipName: onboardingData.companyName,
        inviteUrl: inviteUrl,
        adminName: adminName,
        approvalDate: new Date().toLocaleDateString('en-GB'),
        assignmentDetails: {
          advertisementIds: onboardingData.advertisementIds,
          primaryAdvertisementId: onboardingData.primaryAdvertisementId || onboardingData.advertisementIds[0],
          autotraderIntegrationId: onboardingData.autotraderIntegrationId,
          companyName: onboardingData.companyName,
          companyLogo: onboardingData.companyLogo
        }
      });
      
      if (emailResult.success) {
        console.log('✅ Welcome email sent successfully via Resend');
        welcomeEmailResult = {
          success: true,
          messageId: emailResult.messageId
        };
      } else {
        console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        welcomeEmailResult = {
          success: false,
          error: emailResult.error
        };
      }
    } catch (emailError) {
      console.error('❌ Error sending welcome email:', emailError);
      welcomeEmailResult = {
        success: false,
        error: emailError instanceof Error ? emailError.message : 'Unknown email error'
      };
    }
    */
    
    // Set welcome email result to null since email sending is disabled
    welcomeEmailResult = {
      success: false,
      error: 'Email sending temporarily disabled by admin request'
    };
    
    console.log('⚠️ Welcome email sending is currently disabled');

    console.log('✅ Client onboarding completed successfully');
    
    const responseData = {
      dealer: result.dealer,
      storeConfig: result.storeConfig,
      companySettings: result.companySettings,
      invitation: invitationResult,
      welcomeEmail: welcomeEmailResult,
      onboardingInfo: {
        processedBy: adminUser.id,
        processedAt: new Date().toISOString(),
        advertisementIds: onboardingData.advertisementIds,
        primaryAdvertisementId: onboardingData.primaryAdvertisementId || onboardingData.advertisementIds[0]
      },
      message: invitationResult?.success 
        ? 'Client onboarded successfully with invitation sent (welcome email disabled)'
        : 'Client onboarded successfully (invitation failed, welcome email disabled)'
    };
    
    return NextResponse.json(
      createSuccessResponse(responseData, 'admin/onboard-client')
    );

  } catch (error) {
    console.error('❌ Error in client onboarding API:', error);
    const internalError = createInternalErrorResponse(error, 'admin/onboard-client');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
