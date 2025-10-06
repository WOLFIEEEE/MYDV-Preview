import { headers } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { storeConfig, teamMembers, dealers } from '@/db/schema';
import { eq, like } from 'drizzle-orm';
import { EmailService } from '@/lib/emailService';

// Define comprehensive Clerk webhook event types
type ClerkWebhookEvent = {
  data: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    username?: string | null;
    image_url?: string | null;
    profile_image_url?: string | null;
    primary_email_address_id?: string | null;
    primary_phone_number_id?: string | null;
    email_addresses: Array<{
      id: string;
      email_address: string;
      verification: {
        status: string;
      };
    }>;
    phone_numbers?: Array<{
      id: string;
      phone_number: string;
      verification: {
        status: string;
      };
    }>;
    public_metadata?: Record<string, unknown>;
    private_metadata?: Record<string, unknown>;
    unsafe_metadata?: Record<string, unknown>;
    created_at: number;
    updated_at: number;
    last_sign_in_at?: number | null;
    banned?: boolean;
    locked?: boolean;
    deleted?: boolean;
  };
  object: string;
  type: 'user.created' | 'user.updated' | 'user.deleted';
};

export async function POST(req: NextRequest) {
      console.log(`\n🔔 === CLERK WEBHOOK RECEIVED ===`);
    console.log('⏰ Timestamp:', new Date().toISOString());

  try {
    // Get the headers
    const headerPayload = await headers();
    const svix_id = headerPayload.get("svix-id");
    const svix_timestamp = headerPayload.get("svix-timestamp");
    const svix_signature = headerPayload.get("svix-signature");

    // If there are no headers, error out
    if (!svix_id || !svix_timestamp || !svix_signature) {
      console.error('❌ Missing svix headers');
      return new NextResponse('Missing svix headers', { status: 400 });
    }

    // Get the body
    const payload = await req.text();

    // Get the Webhook secret from environment variables
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      console.error('❌ CLERK_WEBHOOK_SECRET is not set');
      throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env.local');
    }

    // Create a new Svix instance with your secret.
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: ClerkWebhookEvent;

    // Verify the payload with the headers
    try {
      evt = wh.verify(payload, {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
      }) as ClerkWebhookEvent;
    } catch (err) {
      console.error('❌ Error verifying webhook:', err);
      return new NextResponse('Error occurred', { status: 400 });
    }

    console.log('✅ Webhook verified successfully');
    console.log('📋 Event type:', evt.type);
    console.log('📋 User ID:', evt.data.id);

    // Handle the webhook based on event type
    switch (evt.type) {
      case 'user.created':
        await handleUserCreated(evt.data);
        break;
      case 'user.updated':
        await handleUserUpdated(evt.data);
        break;
      case 'user.deleted':
        await handleUserDeleted(evt.data);
        break;
      default:
        console.log(`ℹ️ Unhandled event type: ${evt.type}`);
    }

    return new NextResponse('Success', { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

// Helper function to extract user data from Clerk webhook
function extractUserData(userData: ClerkWebhookEvent['data']) {
  const primaryEmail = userData.email_addresses.find(
    email => email.id === userData.primary_email_address_id || email.verification.status === 'verified'
  )?.email_address;

  const primaryPhone = userData.phone_numbers?.find(
    phone => phone.id === userData.primary_phone_number_id || phone.verification.status === 'verified'
  )?.phone_number;

  // Construct full name from first_name and last_name
  const fullName = [userData.first_name, userData.last_name].filter(Boolean).join(' ').trim() || 
                   userData.username || 
                   primaryEmail?.split('@')[0] || 
                   'Unknown User';

  return {
    clerkUserId: userData.id,
    email: primaryEmail,
    phone: primaryPhone,
    fullName,
    firstName: userData.first_name,
    lastName: userData.last_name,
    username: userData.username,
    imageUrl: userData.image_url || userData.profile_image_url,
    publicMetadata: userData.public_metadata || {},
    createdAt: new Date(userData.created_at),
    updatedAt: new Date(userData.updated_at),
    lastSignInAt: userData.last_sign_in_at ? new Date(userData.last_sign_in_at) : null,
    banned: userData.banned || false,
    locked: userData.locked || false,
    deleted: userData.deleted || false
  };
}

async function handleUserCreated(userData: ClerkWebhookEvent['data']) {
  try {
    console.log('🔄 Processing user.created event for user:', userData.id);
    console.log('📋 Full user data:', JSON.stringify(userData, null, 2));

    const extractedData = extractUserData(userData);
    
    if (!extractedData.email) {
      console.error('❌ No verified email found for user:', userData.id);
      console.error('📧 Available emails:', userData.email_addresses);
      return;
    }

    console.log('📧 User email:', extractedData.email);
    console.log('👤 Full name:', extractedData.fullName);
    console.log('📱 Phone:', extractedData.phone);
    console.log('🏷️ Metadata:', extractedData.publicMetadata);

    // First check if this user is a team member
    console.log('🔄 Looking for team member with email:', extractedData.email);
    const teamMemberRecords = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.email, extractedData.email))
      .limit(1);

    if (teamMemberRecords.length > 0) {
      const teamMember = teamMemberRecords[0];
      console.log(`\n👥 === TEAM MEMBER FOUND IN WEBHOOK ===`);
      console.log('✅ Team member exists in database');
      console.log('🆔 ID:', teamMember.id);
      console.log('👤 Name:', teamMember.name);
      console.log('📧 Email:', teamMember.email);
      console.log('🏷️ Role:', teamMember.role);
      console.log('🏪 Store Owner ID:', teamMember.storeOwnerId);
      console.log('👥 === TEAM MEMBER FOUND END ===\n');

      // Update the team member record with comprehensive Clerk data
      console.log('🔄 Updating team member record with comprehensive Clerk data...');
      
      // Prepare update data - only update fields that have values
      const updateData: Record<string, unknown> = {
        clerkUserId: extractedData.clerkUserId,
        status: 'active',
        invitationStatus: 'accepted',
        updatedAt: new Date()
      };

      // Update name if we have better data from Clerk
      if (extractedData.fullName && extractedData.fullName !== 'Unknown User') {
        updateData.name = extractedData.fullName;
      }

      // Update phone if available and not already set
      if (extractedData.phone && !teamMember.phone) {
        updateData.phone = extractedData.phone;
      }

      console.log('📝 Update data:', updateData);

      const [updatedTeamMember] = await db
        .update(teamMembers)
        .set(updateData)
        .where(eq(teamMembers.id, teamMember.id))
        .returning();

      console.log('✅ Team member record updated successfully:', {
        id: updatedTeamMember.id,
        clerkUserId: updatedTeamMember.clerkUserId,
        status: updatedTeamMember.status,
        invitationStatus: updatedTeamMember.invitationStatus
      });

      // Update the user's metadata in Clerk to mark them as a team member
      console.log('🔄 Updating Clerk user metadata for team member...');
      
      const { setTeamMemberMetadata } = await import('@/lib/userRoleUtils');
      await setTeamMemberMetadata(extractedData.clerkUserId, {
        role: updatedTeamMember.role,
        storeOwnerId: updatedTeamMember.storeOwnerId,
        teamMemberId: updatedTeamMember.id,
        name: updatedTeamMember.name
      });

      console.log('✅ Clerk user metadata updated successfully for team member');
      
      // Send welcome email to the new team member
      try {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;
        
        // Get dealership name from store config
        const [storeConfigRecord] = await db
          .select({ storeName: storeConfig.storeName })
          .from(storeConfig)
          .where(eq(storeConfig.assignedBy, teamMember.storeOwnerId))
          .limit(1);
        
        const dealershipName = storeConfigRecord?.storeName || 'Your Dealership';
        
        const emailResult = await EmailService.sendTeamWelcome({
          to: updatedTeamMember.email,
          userName: updatedTeamMember.name,
          dealershipName: dealershipName,
          role: updatedTeamMember.role,
          dashboardUrl: dashboardUrl
        });
        
        if (emailResult.success) {
          console.log('✅ Welcome email sent successfully to:', updatedTeamMember.email);
        } else {
          console.warn('⚠️ Failed to send welcome email:', emailResult.error);
        }
      } catch (emailError) {
        console.error('❌ Error sending welcome email:', emailError);
      }
      
      console.log('🎉 Team member setup completed for:', extractedData.email);
      return;
    }

    // Check if this user is an onboarded dealer with a placeholder Clerk ID
    console.log('🔄 Looking for onboarded dealer with email:', extractedData.email);
    const dealerRecords = await db
      .select()
      .from(dealers)
      .where(eq(dealers.email, extractedData.email))
      .limit(1);

    if (dealerRecords.length > 0) {
      const dealer = dealerRecords[0];
      
      // Check if this dealer has a placeholder Clerk ID (indicating they were onboarded by admin)
      if (dealer.clerkUserId.startsWith('pending_')) {
        console.log(`\n🎯 === ONBOARDED DEALER FOUND IN WEBHOOK ===`);
        console.log('✅ Onboarded dealer exists in database');
        console.log('🆔 Dealer ID:', dealer.id);
        console.log('👤 Name:', dealer.name);
        console.log('📧 Email:', dealer.email);
        console.log('🔑 Placeholder Clerk ID:', dealer.clerkUserId);
        console.log('📋 Metadata:', dealer.metadata);
        console.log('🎯 === ONBOARDED DEALER FOUND END ===\n');

        // Update the dealer record with the real Clerk user ID
        console.log('🔄 Updating dealer record with real Clerk user ID...');
        
        const updateData = {
          clerkUserId: extractedData.clerkUserId,
          metadata: {
            ...(dealer.metadata as Record<string, any> || {}),
            status: 'active',
            activatedAt: new Date().toISOString(),
            placeholderClerkId: dealer.clerkUserId // Keep track of the old placeholder ID
          },
          updatedAt: new Date()
        };

        console.log('📝 Update data:', updateData);

        const [updatedDealer] = await db
          .update(dealers)
          .set(updateData)
          .where(eq(dealers.id, dealer.id))
          .returning();

        console.log('✅ Dealer record updated successfully:', {
          id: updatedDealer.id,
          clerkUserId: updatedDealer.clerkUserId,
          name: updatedDealer.name,
          email: updatedDealer.email
        });

        // Update the user's metadata in Clerk to mark them as an onboarded dealer
        console.log('🔄 Updating Clerk user metadata for onboarded dealer...');
        
        const dealerMetadata = dealer.metadata as Record<string, any> || {};
        const clerkMetadata = {
          role: 'dealer',
          userType: 'onboarded_dealer',
          dealerId: updatedDealer.id,
          dealerName: updatedDealer.name,
          onboardedBy: dealerMetadata.onboardedBy,
          onboardedAt: dealerMetadata.onboardedAt,
          activatedAt: new Date().toISOString()
        };
        
        console.log('📋 Setting dealer metadata:', clerkMetadata);
        
        const client = await clerkClient();
        await client.users.updateUserMetadata(extractedData.clerkUserId, {
          publicMetadata: clerkMetadata
        });

        console.log('✅ Clerk user metadata updated successfully for onboarded dealer');
        
        // Send welcome email to the new dealer
        try {
          const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`;
          
          const emailResult = await EmailService.sendCustomEmail({
            to: updatedDealer.email,
            subject: 'Welcome to MYDV - Your Account is Now Active!',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #2563eb;">Welcome to MYDV!</h2>
                <p>Dear ${updatedDealer.name},</p>
                <p>Congratulations! Your MYDV dealer account has been successfully activated.</p>
                <p>You can now access your dashboard and start managing your vehicle inventory, creating invoices, and much more.</p>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    Access Your Dashboard
                  </a>
                </div>
                <p>If you have any questions or need assistance, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The MYDV Team</p>
              </div>
            `,
            text: `Welcome to MYDV!\n\nDear ${updatedDealer.name},\n\nCongratulations! Your MYDV dealer account has been successfully activated.\n\nYou can now access your dashboard at: ${dashboardUrl}\n\nIf you have any questions, please contact our support team.\n\nBest regards,\nThe MYDV Team`
          });
          
          if (emailResult.success) {
            console.log('✅ Welcome email sent successfully to:', updatedDealer.email);
          } else {
            console.warn('⚠️ Failed to send welcome email:', emailResult.error);
          }
        } catch (emailError) {
          console.error('❌ Error sending welcome email:', emailError);
        }
        
        console.log('🎉 Onboarded dealer setup completed for:', extractedData.email);
        return;
      } else {
        console.log('ℹ️ Dealer found but already has real Clerk ID:', dealer.clerkUserId);
      }
    }

    // If not a team member or onboarded dealer, check if this user has a pending store config (store owner)
    console.log('🔄 Looking for store config with email:', extractedData.email);
    const storeConfigs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.email, extractedData.email))
      .limit(1);

    if (storeConfigs.length === 0) {
      console.log('ℹ️ No store config or team member record found for email:', extractedData.email, '- user might be a regular signup');
      
      // Still update user metadata for regular users to help with redirect
      console.log('🔄 Setting basic metadata for regular user...');
      const client = await clerkClient();
      await client.users.updateUserMetadata(extractedData.clerkUserId, {
        publicMetadata: {
          role: 'store_owner',
          userType: 'store_owner'
        }
      });
      console.log('✅ Basic metadata set for regular user');
      return;
    }

    const config = storeConfigs[0];
    console.log('✅ Found store config:', {
      id: config.id,
      email: config.email,
      storeName: config.storeName,
      invitationStatus: config.invitationStatus,
      clerkUserId: config.clerkUserId
    });

    // Update the store config with the Clerk user ID and mark as accepted
    console.log('🔄 Updating store config with Clerk user ID...');
    const [updatedConfig] = await db
      .update(storeConfig)
      .set({
        clerkUserId: extractedData.clerkUserId,
        invitationStatus: 'accepted',
        updatedAt: new Date()
      })
      .where(eq(storeConfig.id, config.id))
      .returning();

    console.log('✅ Store config updated successfully:', {
      id: updatedConfig.id,
      clerkUserId: updatedConfig.clerkUserId,
      invitationStatus: updatedConfig.invitationStatus,
      email: updatedConfig.email,
      storeName: updatedConfig.storeName
    });

    // Update the user's metadata in Clerk to mark them as a store owner
    console.log('🔄 Updating Clerk user metadata for store owner...');
    const client = await clerkClient();
    
    const metadata = {
      role: 'store_owner',
      userType: 'store_owner',
      storeConfigId: config.id,
      storeName: config.storeName
    };
    
    console.log('📝 Setting metadata:', metadata);
    
    await client.users.updateUserMetadata(extractedData.clerkUserId, {
      publicMetadata: metadata
    });

    console.log('✅ Clerk user metadata updated successfully for store owner');
    console.log('🎉 Store owner setup completed for:', extractedData.email);
    
    // Log final verification
    console.log('🔍 Final verification - checking updated user metadata...');
    const verifyUser = await client.users.getUser(extractedData.clerkUserId);
    console.log('✅ Updated user metadata:', verifyUser.publicMetadata);

  } catch (error) {
    console.error('❌ Error in handleUserCreated:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type',
      userData: userData
    });
    throw error;
  }
}

async function handleUserUpdated(userData: ClerkWebhookEvent['data']) {
  try {
    console.log('🔄 Processing user.updated event for user:', userData.id);
    
    const extractedData = extractUserData(userData);
    
    if (!extractedData.email) {
      console.error('❌ No verified email found for user:', userData.id);
      return;
    }

    console.log('📧 User email:', extractedData.email);
    console.log('👤 Updated name:', extractedData.fullName);
    console.log('📱 Updated phone:', extractedData.phone);

    // Check if this is a team member
    const teamMemberRecords = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, extractedData.clerkUserId))
      .limit(1);

    if (teamMemberRecords.length > 0) {
      const teamMember = teamMemberRecords[0];
      console.log('👥 Updating team member data for:', teamMember.name);

      // Prepare update data for team member
      const updateData: Record<string, unknown> = {
        updatedAt: new Date()
      };

      // Update fields that have changed
      if (extractedData.fullName && extractedData.fullName !== 'Unknown User' && extractedData.fullName !== teamMember.name) {
        updateData.name = extractedData.fullName;
        console.log('📝 Updating name from', teamMember.name, 'to', extractedData.fullName);
      }

      if (extractedData.email && extractedData.email !== teamMember.email) {
        updateData.email = extractedData.email;
        console.log('📧 Updating email from', teamMember.email, 'to', extractedData.email);
      }

      if (extractedData.phone && extractedData.phone !== teamMember.phone) {
        updateData.phone = extractedData.phone;
        console.log('📱 Updating phone from', teamMember.phone, 'to', extractedData.phone);
      }

      // Handle account status changes
      if (extractedData.banned && teamMember.status === 'active') {
        updateData.status = 'inactive';
        console.log('🚫 User banned - setting status to inactive');
      } else if (extractedData.locked && teamMember.status === 'active') {
        updateData.status = 'inactive';
        console.log('🔒 User locked - setting status to inactive');
      } else if (!extractedData.banned && !extractedData.locked && teamMember.status === 'inactive') {
        updateData.status = 'active';
        console.log('✅ User unbanned/unlocked - setting status to active');
      }

      // Only update if there are changes
      if (Object.keys(updateData).length > 1) { // More than just updatedAt
        const [updatedTeamMember] = await db
          .update(teamMembers)
          .set(updateData)
          .where(eq(teamMembers.id, teamMember.id))
          .returning();

        console.log('✅ Team member updated successfully:', {
          id: updatedTeamMember.id,
          name: updatedTeamMember.name,
          email: updatedTeamMember.email,
          phone: updatedTeamMember.phone,
          status: updatedTeamMember.status
        });

        // Update Clerk metadata with latest team member data
        const client = await clerkClient();
        const clerkMetadata = {
          role: updatedTeamMember.role,
          userType: 'team_member',
          storeOwnerId: updatedTeamMember.storeOwnerId,
          teamMemberId: updatedTeamMember.id,
          fullName: updatedTeamMember.name,
          phone: updatedTeamMember.phone,
          specialization: updatedTeamMember.specialization,
          status: updatedTeamMember.status,
          invitationStatus: updatedTeamMember.invitationStatus,
          lastUpdated: new Date().toISOString()
        };

        await client.users.updateUserMetadata(extractedData.clerkUserId, {
          publicMetadata: clerkMetadata
        });

        console.log('✅ Clerk metadata updated for team member');
      } else {
        console.log('ℹ️ No changes detected for team member');
      }

      return;
    }

    // Check if this is a store owner
    const storeConfigs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, extractedData.clerkUserId))
      .limit(1);

    if (storeConfigs.length > 0) {
      const config = storeConfigs[0];
      console.log('🏪 Updating store owner data for:', config.storeName);

      // For store owners, we mainly track email changes
      if (extractedData.email && extractedData.email !== config.email) {
        const [updatedConfig] = await db
          .update(storeConfig)
          .set({
            email: extractedData.email,
            updatedAt: new Date()
          })
          .where(eq(storeConfig.id, config.id))
          .returning();

        console.log('✅ Store config email updated:', updatedConfig.email);
      }

      return;
    }

    console.log('ℹ️ User updated but not found in team members or store config');

  } catch (error) {
    console.error('❌ Error in handleUserUpdated:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userData: userData
    });
    throw error;
  }
}

async function handleUserDeleted(userData: ClerkWebhookEvent['data']) {
  try {
    console.log('🔄 Processing user.deleted event for user:', userData.id);

    // Check if this is a team member
    const teamMemberRecords = await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, userData.id))
      .limit(1);

    if (teamMemberRecords.length > 0) {
      const teamMember = teamMemberRecords[0];
      console.log('👥 Deactivating team member:', teamMember.name);

      // Mark team member as inactive instead of deleting
      const [updatedTeamMember] = await db
        .update(teamMembers)
        .set({
          status: 'inactive',
          invitationStatus: 'revoked',
          updatedAt: new Date()
        })
        .where(eq(teamMembers.id, teamMember.id))
        .returning();

      console.log('✅ Team member deactivated:', {
        id: updatedTeamMember.id,
        name: updatedTeamMember.name,
        status: updatedTeamMember.status,
        invitationStatus: updatedTeamMember.invitationStatus
      });

      // Send notification email about account deletion
      try {
        await EmailService.sendCustomEmail({
          to: updatedTeamMember.email,
          subject: 'Account Deactivated',
          html: `
            <h2>Account Deactivated</h2>
            <p>Dear ${updatedTeamMember.name},</p>
            <p>Your team member account has been deactivated. If you believe this is an error, please contact your administrator.</p>
            <p>Best regards,<br>MYDV Team</p>
          `,
          text: `Account Deactivated\n\nDear ${updatedTeamMember.name},\n\nYour team member account has been deactivated. If you believe this is an error, please contact your administrator.\n\nBest regards,\nMYDV Team`
        });

        console.log('✅ Account deactivation email sent to:', updatedTeamMember.email);
      } catch (emailError) {
        console.error('❌ Failed to send deactivation email:', emailError);
      }

      return;
    }

    // Check if this is a store owner
    const storeConfigs = await db
      .select()
      .from(storeConfig)
      .where(eq(storeConfig.clerkUserId, userData.id))
      .limit(1);

    if (storeConfigs.length > 0) {
      const config = storeConfigs[0];
      console.log('🏪 Marking store config as inactive for:', config.storeName);

      // Mark store config as inactive
      await db
        .update(storeConfig)
        .set({
          invitationStatus: 'revoked',
          updatedAt: new Date()
        })
        .where(eq(storeConfig.id, config.id));

      console.log('✅ Store config marked as inactive');
      return;
    }

    console.log('ℹ️ User deleted but not found in team members or store config');

  } catch (error) {
    console.error('❌ Error in handleUserDeleted:', error);
    console.error('❌ Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      userData: userData
    });
    throw error;
  }
} 