import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { dealers, companySettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export interface CompanyInfo {
  name: string;
  logo?: string;
  address: {
    street: string;
    city: string;
    county: string;
    postCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
    website?: string;
  };
  vatNumber?: string;
  businessType?: string;
  registrationNumber?: string; // Added registration number
}

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID from user
    const dealerResult = await db
      .select({ dealerId: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const dealerId = dealerResult[0].dealerId;

    // Fetch company settings
    const companyInfo = await db
      .select({
        companyName: companySettings.companyName,
        businessType: companySettings.businessType,
        registrationNumber: companySettings.registrationNumber, // Added registration number
        vatNumber: companySettings.vatNumber,
        
        // Company Logo
        companyLogoPublicUrl: companySettings.companyLogoPublicUrl,
        
        // Address Information
        addressStreet: companySettings.addressStreet,
        addressCity: companySettings.addressCity,
        addressCounty: companySettings.addressCounty,
        addressPostCode: companySettings.addressPostCode,
        addressCountry: companySettings.addressCountry,
        
        // Contact Information
        contactPhone: companySettings.contactPhone,
        contactEmail: companySettings.contactEmail,
        contactWebsite: companySettings.contactWebsite,
      })
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    if (companyInfo.length === 0) {
      // Return default company info if none found
      return NextResponse.json({
        success: true,
        data: {
          name: 'Your Dealership',
          address: {
            street: '',
            city: '',
            county: '',
            postCode: '',
            country: 'United Kingdom'
          },
          contact: {
            phone: '',
            email: '',
            website: ''
          }
        }
      });
    }

    const settings = companyInfo[0];
    
    const transformedData: CompanyInfo = {
      name: settings.companyName || 'Your Dealership',
      logo: settings.companyLogoPublicUrl || undefined,
      address: {
        street: settings.addressStreet || '',
        city: settings.addressCity || '',
        county: settings.addressCounty || '',
        postCode: settings.addressPostCode || '',
        country: settings.addressCountry || 'United Kingdom'
      },
      contact: {
        phone: settings.contactPhone || '',
        email: settings.contactEmail || '',
        website: settings.contactWebsite || undefined
      },
      vatNumber: settings.vatNumber || undefined,
      businessType: settings.businessType || undefined,
      registrationNumber: settings.registrationNumber || undefined // Added registration number
    };

    return NextResponse.json({
      success: true,
      data: transformedData
    });

  } catch (error) {
    console.error('Error fetching company info:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
