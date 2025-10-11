import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealers, companySettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { 
  createErrorResponse, 
  createInternalErrorResponse, 
  createSuccessResponse,
  ErrorType
} from '@/lib/errorHandler';

// Define proper types for company settings API
interface CompanyAddress {
  street: string;
  city: string;
  county: string;
  postCode: string;
  country: string;
}

interface CompanyContact {
  phone: string;
  email: string;
  website: string;
  fax: string;
}

interface CompanyPayment {
  bankName: string;
  bankSortCode: string;
  bankAccountNumber: string;
  bankAccountName: string;
  bankIban: string;
  bankSwiftCode: string;
}

interface CompanySettingsResponse {
  companyName: string;
  companyLogo: string; // Supabase public URL for frontend
  qrCode: string; // QR code image URL or base64 data
  businessType: string;
  establishedYear: string;
  registrationNumber: string;
  vatNumber: string;
  address: CompanyAddress;
  contact: CompanyContact;
  payment: CompanyPayment;
  description: string;
  mission: string;
  vision: string;
}

interface CompanySettingsRequest {
  companyName?: string;
  businessType?: string;
  establishedYear?: string;
  registrationNumber?: string;
  vatNumber?: string;
  address?: CompanyAddress;
  contact?: CompanyContact;
  payment?: CompanyPayment;
  description?: string;
  mission?: string;
  vision?: string;
  qrCode?: string; // QR code image data (base64 or URL)
  // Logo will be handled separately via upload endpoint
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'company-settings'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const dealerId = searchParams.get('dealerId');

    if (!dealerId) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Dealer ID is required',
        details: 'dealerId parameter must be provided in query string',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'company-settings'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Verify dealer exists
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      const notFoundError = {
        type: ErrorType.NOT_FOUND,
        message: 'Dealer not found',
        details: `No dealer found with ID: ${dealerId}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'company-settings'
      };
      return NextResponse.json(
        createErrorResponse(notFoundError),
        { status: 404 }
      );
    }

    // Get company settings from dedicated table
    const settings = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    // Build response with proper structure
    const settingsData = settings[0];
    const response: CompanySettingsResponse = {
      companyName: settingsData?.companyName || '',
      companyLogo: settingsData?.companyLogoPublicUrl || '',
      qrCode: settingsData?.qrCodePublicUrl || '',
      businessType: settingsData?.businessType || '',
      establishedYear: settingsData?.establishedYear || '',
      registrationNumber: settingsData?.registrationNumber || '',
      vatNumber: settingsData?.vatNumber || '',
      address: {
        street: settingsData?.addressStreet || '',
        city: settingsData?.addressCity || '',
        county: settingsData?.addressCounty || '',
        postCode: settingsData?.addressPostCode || '',
        country: settingsData?.addressCountry || 'United Kingdom'
      },
      contact: {
        phone: settingsData?.contactPhone || '',
        email: settingsData?.contactEmail || '',
        website: settingsData?.contactWebsite || '',
        fax: settingsData?.contactFax || ''
      },
      payment: {
        bankName: settingsData?.bankName || '',
        bankSortCode: settingsData?.bankSortCode || '',
        bankAccountNumber: settingsData?.bankAccountNumber || '',
        bankAccountName: settingsData?.bankAccountName || '',
        bankIban: settingsData?.bankIban || '',
        bankSwiftCode: settingsData?.bankSwiftCode || ''
      },
      description: settingsData?.description || '',
      mission: settingsData?.mission || '',
      vision: settingsData?.vision || ''
    };

    return NextResponse.json(
      createSuccessResponse(response, 'company-settings')
    );

  } catch (error) {
    console.error('Error fetching company settings:', error);
    const internalError = createInternalErrorResponse(error, 'company-settings');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const user = await currentUser();
    if (!user) {
      const authError = {
        type: ErrorType.AUTHENTICATION,
        message: 'User not authenticated',
        details: 'Please sign in to access this resource',
        httpStatus: 401,
        timestamp: new Date().toISOString(),
        endpoint: 'company-settings'
      };
      return NextResponse.json(
        createErrorResponse(authError),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { dealerId, settings } = body;

    if (!dealerId || !settings) {
      const validationError = {
        type: ErrorType.VALIDATION,
        message: 'Dealer ID and settings are required',
        details: 'Both dealerId and settings must be provided in request body',
        httpStatus: 400,
        timestamp: new Date().toISOString(),
        endpoint: 'company-settings'
      };
      return NextResponse.json(
        createErrorResponse(validationError),
        { status: 400 }
      );
    }

    // Verify dealer exists
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.id, dealerId))
      .limit(1);

    if (dealer.length === 0) {
      const notFoundError = {
        type: ErrorType.NOT_FOUND,
        message: 'Dealer not found',
        details: `No dealer found with ID: ${dealerId}`,
        httpStatus: 404,
        timestamp: new Date().toISOString(),
        endpoint: 'company-settings'
      };
      return NextResponse.json(
        createErrorResponse(notFoundError),
        { status: 404 }
      );
    }

    const requestSettings = settings as CompanySettingsRequest;

    // Check if company settings record exists
    const existingSettings = await db
      .select()
      .from(companySettings)
      .where(eq(companySettings.dealerId, dealerId))
      .limit(1);

    const settingsData = {
      dealerId,
      companyName: requestSettings.companyName || null,
      businessType: requestSettings.businessType || null,
      establishedYear: requestSettings.establishedYear || null,
      registrationNumber: requestSettings.registrationNumber || null,
      vatNumber: requestSettings.vatNumber || null,
      addressStreet: requestSettings.address?.street || null,
      addressCity: requestSettings.address?.city || null,
      addressCounty: requestSettings.address?.county || null,
      addressPostCode: requestSettings.address?.postCode || null,
      addressCountry: requestSettings.address?.country || 'United Kingdom',
      contactPhone: requestSettings.contact?.phone || null,
      contactEmail: requestSettings.contact?.email || null,
      contactWebsite: requestSettings.contact?.website || null,
      contactFax: requestSettings.contact?.fax || null,
      bankName: requestSettings.payment?.bankName || null,
      bankSortCode: requestSettings.payment?.bankSortCode || null,
      bankAccountNumber: requestSettings.payment?.bankAccountNumber || null,
      bankAccountName: requestSettings.payment?.bankAccountName || null,
      bankIban: requestSettings.payment?.bankIban || null,
      bankSwiftCode: requestSettings.payment?.bankSwiftCode || null,
      description: requestSettings.description || null,
      mission: requestSettings.mission || null,
      vision: requestSettings.vision || null,
      qrCodePublicUrl: requestSettings.qrCode || null, // Store QR code data
      updatedAt: new Date()
    };

    if (existingSettings.length > 0) {
      // Update existing record
      await db
        .update(companySettings)
        .set(settingsData)
        .where(eq(companySettings.dealerId, dealerId));
    } else {
      // Insert new record
      await db
        .insert(companySettings)
        .values({
          ...settingsData,
          createdAt: new Date()
        });
    }

    return NextResponse.json(
      createSuccessResponse(
        { message: 'Company settings saved successfully' }, 
        'company-settings'
      )
    );

  } catch (error) {
    console.error('Error saving company settings:', error);
    const internalError = createInternalErrorResponse(error, 'company-settings');
    return NextResponse.json(
      createErrorResponse(internalError),
      { status: 500 }
    );
  }
}
