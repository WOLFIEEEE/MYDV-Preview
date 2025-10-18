import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';
import { db } from '@/lib/db';
import { documentCategories, dealers } from '@/db/schema';
import { eq, or, isNull, asc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

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
    const includeSystem = searchParams.get('includeSystem') !== 'false'; // Default to true
    const activeOnly = searchParams.get('activeOnly') !== 'false'; // Default to true

    // Build query conditions
    let whereConditions = [];

    if (includeSystem) {
      // Include both system categories (dealerId is null) and dealer-specific categories
      whereConditions.push(
        or(
          isNull(documentCategories.dealerId),
          eq(documentCategories.dealerId, dealer.id)
        )
      );
    } else {
      // Only dealer-specific categories
      whereConditions.push(eq(documentCategories.dealerId, dealer.id));
    }

    if (activeOnly) {
      whereConditions.push(eq(documentCategories.isActive, true));
    }

    // Fetch categories
    const categories = await db
      .select()
      .from(documentCategories)
      .where(whereConditions.length > 1 ? or(...whereConditions) : whereConditions.length === 1 ? whereConditions[0] : undefined)
      .orderBy(asc(documentCategories.sortOrder), asc(documentCategories.displayName));

    return NextResponse.json({
      success: true,
      data: {
        categories,
        systemCategories: categories.filter(cat => cat.isSystem),
        customCategories: categories.filter(cat => !cat.isSystem)
      }
    });

  } catch (error: any) {
    console.error('Document categories fetch error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        message: 'Unauthorized' 
      }, { status: 401 });
    }

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
    const {
      categoryName,
      displayName,
      description,
      isRequired = false,
      hasExpiry = false,
      acceptsMultiple = true,
      allowedMimeTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"],
      maxFileSizeMb = 10,
      sortOrder = 0
    } = await request.json();

    // Validation
    if (!categoryName || !displayName) {
      return NextResponse.json({ 
        success: false, 
        message: 'Category name and display name are required' 
      }, { status: 400 });
    }

    // Check if category name already exists for this dealer
    const existingCategory = await db
      .select()
      .from(documentCategories)
      .where(
        and(
          eq(documentCategories.categoryName, categoryName),
          or(
            eq(documentCategories.dealerId, dealer.id),
            isNull(documentCategories.dealerId)
          )
        )
      )
      .limit(1);

    if (existingCategory.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'A category with this name already exists'
      }, { status: 409 });
    }

    // Create new category
    const newCategory = await db.insert(documentCategories).values({
      dealerId: dealer.id,
      categoryName: categoryName.toLowerCase().replace(/\s+/g, '_'),
      displayName,
      description,
      isRequired,
      hasExpiry,
      acceptsMultiple,
      allowedMimeTypes,
      maxFileSizeMb,
      isSystem: false, // Custom categories are never system categories
      isActive: true,
      sortOrder
    }).returning();

    return NextResponse.json({
      success: true,
      message: 'Document category created successfully',
      data: {
        category: newCategory[0]
      }
    });

  } catch (error: any) {
    console.error('Document category creation error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error',
      error: error.message
    }, { status: 500 });
  }
}
