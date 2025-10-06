import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { dealers, dealerLogos } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { checkAdminAuth } from '@/lib/adminHelper';
import { getDealerIdForUser } from '@/lib/dealerHelper';

// GET - Retrieve dealer logos (admin only)
export async function GET(request: NextRequest) {
  try {
    // Check admin authentication using environment variable
    const adminCheck = await checkAdminAuth();
    if (!adminCheck.success || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error?.message || 'Admin access required' }, 
        { status: adminCheck.error?.httpStatus || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');

    if (dealerId) {
      // Get logo for specific dealer
      const logo = await db
        .select({
          id: dealerLogos.id,
          dealerId: dealerLogos.dealerId,
          logoPublicUrl: dealerLogos.logoPublicUrl,
          logoFileName: dealerLogos.logoFileName,
          isActive: dealerLogos.isActive,
          notes: dealerLogos.notes,
          assignedAt: dealerLogos.assignedAt,
          assignedBy: dealerLogos.assignedBy
        })
        .from(dealerLogos)
        .where(and(
          eq(dealerLogos.dealerId, dealerId),
          eq(dealerLogos.isActive, true)
        ))
        .limit(1);

      return NextResponse.json({
        success: true,
        data: logo[0] || null
      });
    } else {
      // Get all dealer logos
      const logos = await db
        .select({
          id: dealerLogos.id,
          dealerId: dealerLogos.dealerId,
          dealerName: dealers.name,
          dealerEmail: dealers.email,
          logoPublicUrl: dealerLogos.logoPublicUrl,
          logoFileName: dealerLogos.logoFileName,
          isActive: dealerLogos.isActive,
          notes: dealerLogos.notes,
          assignedAt: dealerLogos.assignedAt
        })
        .from(dealerLogos)
        .leftJoin(dealers, eq(dealerLogos.dealerId, dealers.id))
        .where(eq(dealerLogos.isActive, true));

      return NextResponse.json({
        success: true,
        data: logos
      });
    }

  } catch (error) {
    console.error('Error fetching dealer logos:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dealer logos' },
      { status: 500 }
    );
  }
}

// POST - Create or update dealer logo (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin authentication using environment variable
    const adminCheck = await checkAdminAuth();
    if (!adminCheck.success || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error?.message || 'Admin access required' }, 
        { status: adminCheck.error?.httpStatus || 403 }
      );
    }

    const user = adminCheck.user;

    // Get or create admin's dealer record
    let adminId: string | undefined;
    const dealerResult = await getDealerIdForUser(user);
    
    if (dealerResult.success) {
      adminId = dealerResult.dealerId;
    } else {
      // Admin doesn't have a dealer record - create one
      console.log('📝 Admin has no dealer record, creating one for:', user.emailAddresses?.[0]?.emailAddress);
      const userName = user.fullName || 
                      `${user.firstName || ''} ${user.lastName || ''}`.trim() || 
                      'Admin';
      
      const [newAdminDealer] = await db
        .insert(dealers)
        .values({
          clerkUserId: user.id,
          name: userName,
          email: user.emailAddresses?.[0]?.emailAddress || '',
          role: 'admin',
          metadata: {
            isSystemAdmin: true,
            createdForLogoManagement: true,
            createdAt: new Date().toISOString()
          }
        })
        .returning();
      
      adminId = newAdminDealer.id;
      console.log('✅ Admin dealer record created:', adminId);
    }

    if (!adminId) {
      return NextResponse.json({ error: 'Failed to get or create admin dealer record' }, { status: 500 });
    }

    const body = await request.json();
    const { dealerId, logoPublicUrl, logoFileName, logoSupabaseFileName, logoFileSize, logoMimeType, notes } = body;

    if (!dealerId || !logoPublicUrl) {
      return NextResponse.json({ error: 'Dealer ID and logo URL are required' }, { status: 400 });
    }

    // Check if dealer exists
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Check if logo already exists for this dealer
    const existingLogo = await db
      .select()
      .from(dealerLogos)
      .where(and(
        eq(dealerLogos.dealerId, dealerId),
        eq(dealerLogos.isActive, true)
      ))
      .limit(1);

    if (existingLogo.length > 0) {
      // Update existing logo
      const updatedLogo = await db
        .update(dealerLogos)
        .set({
          logoPublicUrl,
          logoFileName,
          logoSupabaseFileName,
          logoFileSize,
          logoMimeType,
          notes,
          assignedBy: adminId,
          assignedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(dealerLogos.id, existingLogo[0].id))
        .returning();

      return NextResponse.json({
        success: true,
        data: updatedLogo[0],
        message: 'Dealer logo updated successfully'
      });
    } else {
      // Create new logo entry
      const newLogo = await db
        .insert(dealerLogos)
        .values({
          dealerId,
          logoPublicUrl,
          logoFileName,
          logoSupabaseFileName,
          logoFileSize,
          logoMimeType,
          notes,
          assignedBy: adminId,
          isActive: true
        })
        .returning();

      return NextResponse.json({
        success: true,
        data: newLogo[0],
        message: 'Dealer logo assigned successfully'
      });
    }

  } catch (error) {
    console.error('Error managing dealer logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to manage dealer logo' },
      { status: 500 }
    );
  }
}

// DELETE - Remove dealer logo (admin only)
export async function DELETE(request: NextRequest) {
  try {
    // Check admin authentication using environment variable
    const adminCheck = await checkAdminAuth();
    if (!adminCheck.success || !adminCheck.user) {
      return NextResponse.json(
        { error: adminCheck.error?.message || 'Admin access required' }, 
        { status: adminCheck.error?.httpStatus || 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');

    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer ID is required' }, { status: 400 });
    }

    // Soft delete by setting isActive to false
    const deletedLogo = await db
      .update(dealerLogos)
      .set({
        isActive: false,
        updatedAt: new Date()
      })
      .where(and(
        eq(dealerLogos.dealerId, dealerId),
        eq(dealerLogos.isActive, true)
      ))
      .returning();

    if (deletedLogo.length === 0) {
      return NextResponse.json({ error: 'No active logo found for this dealer' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Dealer logo removed successfully'
    });

  } catch (error) {
    console.error('Error deleting dealer logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete dealer logo' },
      { status: 500 }
    );
  }
}
