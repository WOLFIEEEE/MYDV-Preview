import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { costCategories } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { createOrGetDealer } from '@/lib/database';
import { initializeDefaultCategories } from '@/lib/costCategories';

// GET - Fetch all cost categories for a dealer
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Check if dealer has any categories, if not, initialize with defaults
    const existingCategories = await db
      .select()
      .from(costCategories)
      .where(eq(costCategories.dealerId, dealer.id));

    if (existingCategories.length === 0) {
      // Initialize default categories for this dealer
      await initializeDefaultCategories(dealer.id);
    }

    // Fetch dealer-specific categories
    const categories = await db
      .select()
      .from(costCategories)
      .where(eq(costCategories.dealerId, dealer.id))
      .orderBy(costCategories.name);

    return NextResponse.json({
      categories,
      success: true
    });

  } catch (error) {
    console.error('Error fetching cost categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

// POST - Create new cost category
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, color, icon } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const newCategory = await db
      .insert(costCategories)
      .values({
        dealerId: dealer.id,
        name,
        description: description || null,
        color: color || '#6B7280',
        icon: icon || null,
        isDefault: false
      })
      .returning();

    return NextResponse.json({
      category: newCategory[0],
      success: true,
      message: 'Category created successfully'
    });

  } catch (error) {
    console.error('Error creating cost category:', error);
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    );
  }
}

