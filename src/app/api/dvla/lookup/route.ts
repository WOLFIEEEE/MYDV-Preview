import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { dvlaVehicleData } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/**
 * GET /api/dvla/lookup?registration=ABC123
 * Lookup DVLA data for a specific vehicle registration
 */
export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Registration parameter is required' },
        { status: 400 }
      );
    }

    console.log(`🔍 Looking up DVLA data for registration: ${registration}`);

    // Query the DVLA table
    const dvlaRecord = await db
      .select()
      .from(dvlaVehicleData)
      .where(eq(dvlaVehicleData.registrationNumber, registration.toUpperCase()))
      .limit(1);

    if (dvlaRecord.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'N/A',
        registration: registration.toUpperCase()
      }, { status: 404 });
    }

    const record = dvlaRecord[0];

    return NextResponse.json({
      success: true,
      data: {
        registration: record.registrationNumber,
        make: record.make,
        colour: record.colour,
        fuelType: record.fuelType,
        yearOfManufacture: record.yearOfManufacture,
        engineCapacity: record.engineCapacity,
        co2Emissions: record.co2Emissions,
        motStatus: record.motStatus,
        motExpiryDate: record.motExpiryDate,
        taxStatus: record.taxStatus,
        taxDueDate: record.taxDueDate,
        typeApproval: record.typeApproval,
        wheelplan: record.wheelplan,
        revenueWeight: record.revenueWeight,
        markedForExport: record.markedForExport,
        dateOfLastV5CIssued: record.dateOfLastV5CIssued,
        monthOfFirstRegistration: record.monthOfFirstRegistration,
        dvlaLastChecked: record.dvlaLastChecked,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt
      }
    });

  } catch (error) {
    console.error('❌ Error looking up DVLA data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
