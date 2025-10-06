import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealers, customTerms } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer record from Clerk user ID
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dealer record not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult[0].id;

    // Sample terms and conditions based on invoice.md requirements
    const sampleTerms = {
      basicTerms: `BLUEBELL MOTORHOUSE STANDARD LIMITED TERMS AND CONDITIONS

1. The Agreement
These terms and conditions form the basis of the agreement between the customer and Bluebell Motorhouse Limited for the sale of the vehicle specified in the invoice.

2. Payment Terms
Payment must be made in accordance with the agreed terms. Full payment is required before delivery unless alternative arrangements have been agreed in writing.

3. Delivery
The vehicle will be delivered or made available for collection on the agreed date. Any delays will be communicated as soon as possible.

4. Warranty
The warranty terms are as specified in the invoice. This does not affect your statutory rights as a consumer.

5. Consumer Rights
Your statutory rights are not affected by these terms and conditions. You have the right to return goods that are faulty or not as described.

6. Liability
Our liability is limited to the purchase price of the vehicle except where prohibited by law.

7. Data Protection
We process your personal data in accordance with our privacy policy and applicable data protection laws.

8. Governing Law
These terms are governed by English law and subject to the jurisdiction of English courts.`,

      tradeTerms: `TRADE SALE DISCLAIMER

This vehicle is sold as a TRADE SALE and is therefore sold without warranty or guarantee of any kind.

The buyer acknowledges that:
- This is a trade-to-trade transaction
- No consumer rights apply to this sale
- The vehicle is sold "as seen" and "as is"
- No warranty or guarantee is provided
- The buyer has inspected the vehicle and is satisfied with its condition
- No consumer aftercare or statutory rights apply to this sale

The seller excludes all liability for any defects, faults, or issues with the vehicle after the point of sale.

This sale is conducted under trade terms and conditions only.`,

      checklistTerms: `VEHICLE CHECKLIST TERMS AND CONDITIONS

By signing this document, the customer confirms that:

1. The vehicle has been inspected and found to be in satisfactory condition
2. All items listed in the vehicle checklist have been checked and confirmed
3. Any discrepancies or issues have been noted and agreed upon
4. The customer accepts the vehicle in its current condition
5. All keys, manuals, and accessories listed have been provided
6. The customer understands their rights and obligations under this agreement

The dealer confirms that:
1. The vehicle has undergone a pre-delivery inspection
2. All safety-critical items have been checked
3. The vehicle is roadworthy and fit for purpose
4. All documentation is complete and accurate

This checklist forms part of the sales agreement and warranty terms.`,

      inHouseWarrantyTerms: `IN-HOUSE ENGINE & TRANSMISSION WARRANTY

WARRANTY COVERAGE
This warranty covers the engine and transmission components of your vehicle for the period specified in your invoice.

COVERED COMPONENTS:
- Engine block and internal components
- Transmission case and internal components
- Engine management systems directly related to engine operation
- Transmission control systems

EXCLUSIONS:
- Damage due to misuse, neglect, or lack of maintenance
- Consumable items (oil, filters, spark plugs, etc.)
- Electrical components not directly related to engine/transmission operation
- Damage caused by accident, modification, or racing
- Normal wear and tear items

WARRANTY CONDITIONS:
- Regular servicing must be maintained as per manufacturer recommendations
- Only approved oils and parts must be used
- Any modifications may void this warranty
- Claims must be reported within 7 days of discovery
- Repairs must be authorized by the dealer before commencement

CLAIMS PROCESS:
Contact the dealer immediately if you experience any issues. A diagnostic assessment will be carried out to determine if the claim is covered under this warranty.

This warranty is in addition to your statutory rights and does not affect them.`,

      thirdPartyTerms: `EXTERNAL WARRANTY — EVOLUTION WARRANTIES

WARRANTY INFORMATION
Your vehicle is covered by an external warranty provided by Evolution Warranties, one of the UK's leading warranty providers.

COVERAGE DETAILS:
- Comprehensive mechanical and electrical component coverage
- 24/7 breakdown assistance
- UK and European coverage
- Approved repairer network

WHAT'S COVERED:
- Engine and transmission components
- Electrical systems
- Steering and suspension
- Braking systems
- Air conditioning
- And many more components as detailed in your warranty handbook

CLAIMS PROCESS:
To make a claim, contact Evolution Warranties directly on their claims hotline. You will need your warranty certificate and vehicle details.

IMPORTANT NOTES:
- Regular servicing is required to maintain warranty validity
- Claims are subject to terms and conditions in your warranty handbook
- Some components may have specific coverage limitations
- Excess charges may apply to certain claims

For full terms and conditions, please refer to your warranty handbook provided with your vehicle.

Evolution Warranties Ltd | Registered in England | Company Registration: 03234220
Authorised and regulated by the Financial Conduct Authority`
    };

    // Check if terms already exist for this dealer
    const existingTerms = await db
      .select()
      .from(customTerms)
      .where(eq(customTerms.dealerId, dealerId))
      .limit(1);

    if (existingTerms.length > 0) {
      // Update existing terms
      await db
        .update(customTerms)
        .set({
          ...sampleTerms,
          updatedAt: new Date()
        })
        .where(eq(customTerms.dealerId, dealerId));

      return NextResponse.json({
        success: true,
        message: 'Sample terms updated successfully',
        action: 'updated'
      });
    } else {
      // Create new terms
      await db
        .insert(customTerms)
        .values({
          dealerId,
          ...sampleTerms,
          createdBy: user.id,
          createdAt: new Date(),
          updatedAt: new Date()
        });

      return NextResponse.json({
        success: true,
        message: 'Sample terms created successfully',
        action: 'created'
      });
    }

  } catch (error) {
    console.error('Error seeding sample terms:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
