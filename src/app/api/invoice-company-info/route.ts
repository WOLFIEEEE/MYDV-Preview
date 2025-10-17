import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { companySettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/invoice-company-info - Get company information for invoice generation
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer ID
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: dealerResult.error || 'Dealer not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult.dealerId;

    // Fetch company settings for this dealer
    const companyInfo = await db
      .select({
        companyName: companySettings.companyName,
        businessType: companySettings.businessType,
        establishedYear: companySettings.establishedYear,
        registrationNumber: companySettings.registrationNumber,
        vatNumber: companySettings.vatNumber,
        
        // Company Logo
        companyLogoPublicUrl: companySettings.companyLogoPublicUrl,
        companyLogoFileName: companySettings.companyLogoFileName,
        companyLogoMimeType: companySettings.companyLogoMimeType,
        
        // QR Code
        qrCodePublicUrl: companySettings.qrCodePublicUrl,
        qrCodeFileName: companySettings.qrCodeFileName,
        qrCodeMimeType: companySettings.qrCodeMimeType,
        
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
        contactFax: companySettings.contactFax,
        
        // Payment/Banking Information
        bankName: companySettings.bankName,
        bankSortCode: companySettings.bankSortCode,
        bankAccountNumber: companySettings.bankAccountNumber,
        bankAccountName: companySettings.bankAccountName,
        bankIban: companySettings.bankIban,
        bankSwiftCode: companySettings.bankSwiftCode,
        
        // Additional Information
        description: companySettings.description,
      })
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId!))
      .limit(1);

    if (companyInfo.length === 0) {
      return NextResponse.json({
        success: true,
        companyInfo: {
          companyName: 'Your Company Name',
          businessType: null,
          establishedYear: null,
          registrationNumber: null,
          vatNumber: null,
          companyLogoPublicUrl: null,
          companyLogoFileName: null,
          companyLogoMimeType: null,
          qrCode: null,
          qrCodeFileName: null,
          qrCodeMimeType: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          county: null,
          postcode: null,
          country: 'United Kingdom',
          phone: null,
          email: null,
          website: null,
          fax: null,
          description: null,
        },
        message: 'No company settings found. Please configure your company information in General Settings.'
      });
    }

    const settings = companyInfo[0];

    // Format the company information for invoice use
    const formattedCompanyInfo = {
      companyName: settings.companyName || 'Your Company Name',
      businessType: settings.businessType,
      establishedYear: settings.establishedYear,
      registrationNumber: settings.registrationNumber,
      vatNumber: settings.vatNumber,
      
      // Company Logo
      companyLogo: settings.companyLogoPublicUrl,
      companyLogoFileName: settings.companyLogoFileName,
      companyLogoMimeType: settings.companyLogoMimeType,
      
      // QR Code
      qrCode: settings.qrCodePublicUrl,
      qrCodeFileName: settings.qrCodeFileName,
      qrCodeMimeType: settings.qrCodeMimeType,
      
      // Address Information (formatted for invoice)
      addressLine1: settings.addressStreet,
      addressLine2: null, // Company settings doesn't have addressLine2
      city: settings.addressCity,
      county: settings.addressCounty,
      postcode: settings.addressPostCode,
      country: settings.addressCountry || 'United Kingdom',
      
      // Contact Information
      phone: settings.contactPhone,
      email: settings.contactEmail,
      website: settings.contactWebsite,
      fax: settings.contactFax,
      
      // Payment/Banking Information
      bankName: settings.bankName,
      bankSortCode: settings.bankSortCode,
      bankAccountNumber: settings.bankAccountNumber,
      bankAccountName: settings.bankAccountName,
      bankIban: settings.bankIban,
      bankSwiftCode: settings.bankSwiftCode,
      
      // Additional Information
      description: settings.description,
    };

    return NextResponse.json({
      success: true,
      companyInfo: formattedCompanyInfo
    });

  } catch (error) {
    console.error('Error fetching company info for invoice:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch company information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
