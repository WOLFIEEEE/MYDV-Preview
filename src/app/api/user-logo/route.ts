import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { dealers, dealerLogos, companySettings } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // First, get the dealer ID from the dealers table using clerk user ID
    const dealer = await db
      .select({
        id: dealers.id,
        name: dealers.name
      })
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1);

    if (dealer.length === 0) {
      return NextResponse.json({ 
        success: true, 
        data: { 
          logo: null, 
          storeName: null 
        } 
      });
    }

    const dealerId = dealer[0].id;
    const dealerName = dealer[0].name;

    // ONLY use admin-assigned logos - nothing else
    const adminLogo = await db
      .select({
        logoPublicUrl: dealerLogos.logoPublicUrl,
        logoFileName: dealerLogos.logoFileName
      })
      .from(dealerLogos)
      .where(and(
        eq(dealerLogos.dealerId, dealerId),
        eq(dealerLogos.isActive, true)
      ))
      .limit(1);

    let logoUrl = null;
    let storeName = dealerName;
    let logoSource = 'none';

    if (adminLogo.length > 0) {
      // Use admin-assigned logo ONLY
      logoUrl = adminLogo[0].logoPublicUrl;
      logoSource = 'admin';
      console.log('🎨 Using admin-assigned logo for dealer:', dealerId, 'URL:', logoUrl);
    } else {
      // No admin logo - return null (no logo will be shown)
      console.log('❌ No admin-assigned logo for dealer:', dealerId, 'Dealer name:', dealerName);
    }

    // Get company name for store name display
    const companyInfo = await db
      .select({
        companyName: companySettings.companyName
      })
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    if (companyInfo.length > 0 && companyInfo[0].companyName) {
      storeName = companyInfo[0].companyName;
    }

    const responseData = {
      logo: logoUrl,
      storeName: storeName,
      source: logoSource // 'admin' or 'none'
    };

    console.log('📤 Returning logo data for dealer:', dealerId, responseData);

    return NextResponse.json({
      success: true,
      data: responseData
    });

  } catch (error) {
    console.error('Error fetching user logo:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user logo' },
      { status: 500 }
    );
  }
}