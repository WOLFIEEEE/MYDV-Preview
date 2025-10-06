import React from 'react';
import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import JobCardPDFDocument from '@/components/kanban/JobCardPDFDocument';
import type { VehicleJobCard } from '@/db/schema';

// Sample job card data for testing
const sampleJobCard: VehicleJobCard = {
  id: 'test-job-card-001',
  dealerId: 'dealer-001',
  stockId: 'STK001',
  registration: 'AB12 CDE',
  jobType: 'Full Service and Brake Inspection',
  garageDetails: 'Customer reports squeaking brakes and wants full service. Check brake pads, fluid levels, and perform standard service checklist. Also inspect tire tread depth and alignment.',
  jobCategory: 'service_ex_vat',
  status: 'in_progress',
  priority: 'high',
  estimatedHours: 4,
  actualHours: null,
  startedAt: null,
  completedAt: null,
  estimatedCost: '450.00',
  actualCost: null,
  assignedTo: 'user_123',
  createdBy: 'user_admin',
  dueDate: new Date('2024-12-15'),
  costsSubmitted: false,
  costDescription: null,
  costsSubmittedAt: null,
  customerNotes: null,
  notes: null,
  attachments: null,
  createdAt: new Date('2024-12-01T09:00:00Z'),
  updatedAt: new Date('2024-12-02T14:30:00Z'),
  jobs: [
    {
      jobCategory: 'service_ex_vat',
      jobType: 'Oil and Filter Change',
      estimatedHours: 1,
      totalCost: 120
    },
    {
      jobCategory: 'parts_ex_vat',
      jobType: 'Brake Pad Replacement',
      estimatedHours: 2,
      totalCost: 180
    },
    {
      jobCategory: 'service_ex_vat',
      jobType: 'Full Service Inspection',
      estimatedHours: 1,
      totalCost: 150
    }
  ]
};

export async function GET(request: NextRequest) {
  try {
    console.log('Testing professional job card PDF generation with React PDF...');
    
    // Prepare job card data with additional info
    const jobCardData = {
      ...sampleJobCard,
      assignedUserName: 'John Smith (Senior Technician)',
      stockDetails: {
        make: 'BMW',
        model: 'X5',
        derivative: 'xDrive30d M Sport',
        year: 2020,
        colour: 'Carbon Black Metallic',
        mileage: 45000,
        vin: 'WBAXG7106LCJ12345',
        engineSize: '3.0L',
        fuelType: 'Diesel',
        bodyType: 'SUV',
        doors: 5,
        seats: 5,
        transmission: 'Automatic',
        forecourtPrice: 32500,
        totalPrice: 33950,
        lifecycleState: 'Available',
        ownershipCondition: 'Used'
      },
      companyInfo: {
        name: 'MWA Autos Ltd',
        address: {
          street: '3 Elson Street',
          city: 'Nottingham',
          county: 'Nottinghamshire',
          postCode: 'NG7 7HQ',
          country: 'United Kingdom'
        },
        contact: {
          phone: '0115 784 4104',
          email: 'info@mwaautosltd.co.uk',
          website: 'www.mwaautosltd.co.uk'
        },
        vatNumber: '431024648',
        registrationNumber: '12345678',
        logo: '' // No logo for test
      }
    };

    // Generate PDF using React PDF
    const pdfBuffer = await renderToBuffer(
      JobCardPDFDocument({ jobCardData })
    );

    console.log(`Professional React PDF generated successfully, size: ${pdfBuffer.length} bytes`);

    // Return PDF as response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="professional-job-card.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating professional job card PDF:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to generate professional PDF',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
