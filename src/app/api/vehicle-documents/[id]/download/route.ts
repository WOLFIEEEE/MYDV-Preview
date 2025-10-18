import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleDocuments, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { getSignedUrl } from '@/lib/storage';
import { createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    // Get or create dealer record using enhanced resolution (supports team member delegation)
    const dealerResult = await getDealerIdForUser(user);
    let dealer;
    
    if (dealerResult.success && dealerResult.dealerId) {
      const fullDealerResult = await db
        .select()
        .from(dealers)
        .where(eq(dealers.id, dealerResult.dealerId))
        .limit(1);
      
      if (fullDealerResult.length > 0) {
        dealer = fullDealerResult[0];
      } else {
        return NextResponse.json({ 
          success: false, 
          message: 'Dealer record not found' 
        }, { status: 400 });
      }
    } else {
      dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
    }
    
    // Await params
    const { id } = await params;
    
    // Find the document
    const document = await db
      .select()
      .from(vehicleDocuments)
      .where(
        and(
          eq(vehicleDocuments.id, id),
          eq(vehicleDocuments.dealerId, dealer.id),
          eq(vehicleDocuments.status, 'active')
        )
      )
      .limit(1);

    if (document.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Document not found' 
      }, { status: 404 });
    }

    const doc = document[0];

    // Get signed URL for secure access
    const { success, signedUrl, error } = await getSignedUrl(
      `vehicle-documents/${doc.supabaseFileName}`,
      'vehicle-documents',
      3600 // 1 hour expiry
    );

    if (!success || !signedUrl) {
      return NextResponse.json({ 
        success: false, 
        message: error || 'Failed to generate download URL' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: signedUrl,
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize
      }
    });

  } catch (error) {
    console.error('❌ Error generating download URL:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Internal server error' 
    }, { status: 500 });
  }
}
