import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import JobCardPDFDocument from '@/components/kanban/JobCardPDFDocument';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealers, companySettings, teamMembers } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Function to get dealer ID from current user (handles both dealers and team members)
const getDealerId = async (): Promise<string | null> => {
  try {
    const user = await currentUser();
    if (!user) return null;

    // First check if user is a dealer
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length > 0) {
      return dealerResult[0].id;
    }

    // If not a dealer, check if they are a team member
    const teamMemberResult = await db
      .select({ storeOwnerId: teamMembers.storeOwnerId })
      .from(teamMembers)
      .where(eq(teamMembers.clerkUserId, user.id))
      .limit(1);

    if (teamMemberResult.length > 0) {
      return teamMemberResult[0].storeOwnerId;
    }

    return null;
  } catch (error) {
    console.error('Error fetching dealer ID:', error);
    return null;
  }
};

// Function to fetch company settings from database (direct DB access)
const fetchCompanySettings = async (dealerId: string) => {
  try {
    console.log('🔍 Fetching company settings for dealer:', dealerId);
    
    const settings = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    if (settings.length > 0) {
      const settingsData = settings[0];
      
      // Transform database structure to match ComprehensiveInvoiceData format
      const transformedSettings = {
        companyName: settingsData.companyName || '',
        companyLogo: settingsData.companyLogoPublicUrl || '', // Use the public URL from Supabase
        businessType: settingsData.businessType || '',
        establishedYear: settingsData.establishedYear || '',
        registrationNumber: settingsData.registrationNumber || '',
        vatNumber: settingsData.vatNumber || '',
        address: {
          street: settingsData.addressStreet || '',
          city: settingsData.addressCity || '',
          county: settingsData.addressCounty || '',
          postCode: settingsData.addressPostCode || '',
          country: settingsData.addressCountry || 'United Kingdom'
        },
        contact: {
          phone: settingsData.contactPhone || '',
          email: settingsData.contactEmail || '',
          website: settingsData.contactWebsite || '',
          fax: settingsData.contactFax || ''
        },
        description: settingsData.description || '',
        mission: settingsData.mission || '',
        vision: settingsData.vision || ''
      };
      
      console.log('✅ Company settings found:', transformedSettings.companyName);
      console.log('📸 Logo URL:', transformedSettings.companyLogo ? 'Available' : 'Not set');
      return transformedSettings;
    } else {
      console.log('⚠️ No company settings found for dealer:', dealerId);
      return null;
    }
  } catch (error) {
    console.error('Error fetching company settings from database:', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const jobCardData = await request.json();
    console.log('📋 Generating job card PDF for:', jobCardData.registration);

    // Get dealer ID and fetch real company settings
    const dealerId = await getDealerId();
    let companyInfo = jobCardData.companyInfo; // Use provided data as fallback

    if (dealerId) {
      console.log('🏢 Fetching company settings for dealer:', dealerId);
      const companySettings = await fetchCompanySettings(dealerId);
      
      if (companySettings) {
        // Use real company data from database - match ComprehensiveInvoiceData structure exactly
        companyInfo = {
          name: companySettings.companyName || 'Your Company Name',
          address: {
            street: companySettings.address.street || '',
            city: companySettings.address.city || '',
            county: companySettings.address.county || '',
            postCode: companySettings.address.postCode || '',
            country: companySettings.address.country || 'United Kingdom'
          },
          contact: {
            phone: companySettings.contact.phone || '',
            email: companySettings.contact.email || '',
            website: companySettings.contact.website || ''
          },
          vatNumber: companySettings.vatNumber || '',
          registrationNumber: companySettings.registrationNumber || '',
          logo: companySettings.companyLogo || '', // Supabase public URL
        };
        console.log('✅ Using real company settings:', companyInfo.name);
        console.log('📍 Address:', `${companyInfo.address.street}, ${companyInfo.address.city}`);
        console.log('📞 Contact:', companyInfo.contact.phone, companyInfo.contact.email);
        console.log('🖼️ Logo available:', !!companyInfo.logo);
      } else {
        console.warn('⚠️ Could not fetch company settings, using fallback data');
      }
    } else {
      console.warn('⚠️ Could not get dealer ID, using fallback company data');
    }

    // Update job card data with real company info
    const updatedJobCardData = {
      ...jobCardData,
      companyInfo
    };

    console.log('🎨 Generating PDF with company info:', {
      name: companyInfo?.name,
      hasLogo: !!companyInfo?.logo,
      hasAddress: !!companyInfo?.address
    });

    // Generate PDF using React PDF on the server
    const pdfBuffer = await renderToBuffer(
      JobCardPDFDocument({ jobCardData: updatedJobCardData })
    );

    console.log(`✅ Job card PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Create filename
    const filename = `JobCard_${jobCardData.registration}_${jobCardData.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`;

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating job card PDF:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate job card PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
