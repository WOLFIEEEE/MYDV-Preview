import React from 'react'
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { companySettings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { renderToBuffer } from '@react-pdf/renderer'
import SalesCompletionPDFDocument from '@/components/stock/tabs/actions/SalesCompletionPDFDocument'
import { getDealerIdForUser } from '@/lib/dealerHelper'

// Function to fetch company settings from database
const fetchCompanySettings = async (dealerId: string) => {
  try {
    console.log('🔍 Fetching company settings for dealer:', dealerId)
    
    const settings = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    if (settings.length > 0) {
      const settingsData = settings[0];
      
      // Transform database structure to match PDF format
      const transformedSettings = {
        name: settingsData.companyName || 'Your Company Name',
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
          website: settingsData.contactWebsite || ''
        },
        vatNumber: settingsData.vatNumber || '',
        registrationNumber: settingsData.registrationNumber || '',
        logo: settingsData.companyLogoPublicUrl || '', // Use the public URL from Supabase
      };
      
      console.log('✅ Company settings found:', transformedSettings.name);
      console.log('📸 Logo URL:', transformedSettings.logo ? 'Available' : 'Not set');
      return transformedSettings;
    } else {
      console.log('⚠️ No company settings found for dealer:', dealerId);
      return null;
    }
  } catch (error) {
    console.error('❌ Error fetching company settings:', error);
    return null;
  }
};

export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get dealer ID using helper function
    const dealerIdResult = await getDealerIdForUser(user)
    if (!dealerIdResult.success) {
      return NextResponse.json({ 
        error: dealerIdResult.error || 'Failed to resolve dealer ID' 
      }, { status: 404 })
    }

    const dealerId = dealerIdResult.dealerId!

    const body = await request.json()
    const { stockId, registration, saleDate, customerName, completionData } = body

    if (!stockId) {
      return NextResponse.json({ error: 'Stock ID is required' }, { status: 400 })
    }

    console.log('📋 Generating sales completion PDF for:', registration || stockId)

    // Fetch company settings
    let companyInfo = {
      name: 'Your Company Name',
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
      },
      vatNumber: '',
      registrationNumber: '',
      logo: ''
    };

    if (dealerId) {
      console.log('🏢 Fetching company settings for dealer:', dealerId);
      const companySettings = await fetchCompanySettings(dealerId);
      
      if (companySettings) {
        companyInfo = companySettings;
        console.log('✅ Using real company settings:', companyInfo.name);
        console.log('📍 Address:', `${companyInfo.address.street}, ${companyInfo.address.city}`);
        console.log('📞 Contact:', companyInfo.contact.phone, companyInfo.contact.email);
        console.log('🖼️ Logo available:', !!companyInfo.logo);
      }
    }

    // Prepare PDF data
    const pdfData = {
      stockId,
      registration: registration || 'N/A',
      saleDate: saleDate || new Date().toISOString().split('T')[0],
      customerName: customerName || '', // Empty string instead of 'N/A'
      companyInfo,
      completionData: completionData || {}
    };

    console.log('📄 Generating PDF with data:', {
      stockId: pdfData.stockId,
      registration: pdfData.registration,
      customerName: pdfData.customerName,
      companyName: pdfData.companyInfo.name
    });

    // Generate PDF buffer
    const buffer = await renderToBuffer(
      SalesCompletionPDFDocument({ completionData: pdfData })
    );

    // Return PDF as response
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sales-completion-${registration || stockId}.pdf"`,
        'Content-Length': buffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error generating sales completion PDF:', error)
    return NextResponse.json({ 
      error: 'Failed to generate PDF',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
