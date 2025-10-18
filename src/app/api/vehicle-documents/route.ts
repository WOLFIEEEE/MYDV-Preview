import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { vehicleDocuments, documentCategories, documentAccessLog, dealers } from '@/db/schema';
import { eq, and, desc, ilike, or, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const userId = user.id;

    // Get dealer record using enhanced resolution (supports team member delegation)
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
    
    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const registration = searchParams.get('registration');
    const stockId = searchParams.get('stockId');
    const documentType = searchParams.get('documentType');
    const status = searchParams.get('status') || 'active';
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Build query conditions
    let whereConditions = [eq(vehicleDocuments.dealerId, dealer.id)];

    if (registration) {
      whereConditions.push(eq(vehicleDocuments.registration, registration.toUpperCase()));
    }

    if (stockId) {
      whereConditions.push(eq(vehicleDocuments.stockId, stockId));
    }

    if (documentType) {
      whereConditions.push(eq(vehicleDocuments.documentType, documentType));
    }

    if (status) {
      whereConditions.push(eq(vehicleDocuments.status, status));
    }

    if (search) {
      whereConditions.push(
        or(
          ilike(vehicleDocuments.documentName, `%${search}%`),
          ilike(vehicleDocuments.description, `%${search}%`),
          ilike(vehicleDocuments.fileName, `%${search}%`),
          ilike(vehicleDocuments.registration, `%${search}%`)
        )!
      );
    }

    // Fetch documents
    const documents = await db
      .select()
      .from(vehicleDocuments)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(desc(vehicleDocuments.createdAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: count() })
      .from(vehicleDocuments)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    // Log access for each document viewed
    if (documents.length > 0) {
      const accessLogs = documents.map(doc => ({
        documentId: doc.id,
        userId,
        action: 'view' as const,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        metadata: {
          query: Object.fromEntries(searchParams.entries())
        }
      }));

      // Insert access logs (don't await to avoid slowing down the response)
      db.insert(documentAccessLog).values(accessLogs).catch(console.error);
    }

    return NextResponse.json({
      success: true,
      data: {
        documents,
        pagination: {
          page,
          limit,
          total: totalCountResult[0]?.count || 0,
          totalPages: Math.ceil((totalCountResult[0]?.count || 0) / limit)
        }
      }
    });

  } catch (error: any) {
    console.error('Vehicle documents fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

    const userId = user.id;

    // Get dealer record using enhanced resolution (supports team member delegation)
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
    
    // Parse request body
    const { documentIds } = await request.json();

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'Document IDs are required' 
      }, { status: 400 });
    }

    // Verify ownership and update status to 'deleted'
    const updatedDocuments = await db
      .update(vehicleDocuments)
      .set({ 
        status: 'deleted',
        updatedAt: new Date()
      })
      .where(
        and(
          eq(vehicleDocuments.dealerId, dealer.id),
          // Use IN clause for multiple IDs
          or(...documentIds.map(id => eq(vehicleDocuments.id, id)))
        )
      )
      .returning();

    if (updatedDocuments.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No documents found or you do not have permission to delete them'
      }, { status: 404 });
    }

    // Log deletion actions
    const deletionLogs = updatedDocuments.map(doc => ({
      documentId: doc.id,
      userId,
      action: 'delete' as const,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      metadata: {
        documentName: doc.documentName,
        fileName: doc.fileName,
        registration: doc.registration
      }
    }));

    await db.insert(documentAccessLog).values(deletionLogs);

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${updatedDocuments.length} document(s)`,
      data: {
        deletedCount: updatedDocuments.length,
        deletedDocuments: updatedDocuments.map(doc => ({
          id: doc.id,
          documentName: doc.documentName,
          fileName: doc.fileName,
          registration: doc.registration
        }))
      }
    });

  } catch (error: any) {
    console.error('Vehicle documents deletion error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
