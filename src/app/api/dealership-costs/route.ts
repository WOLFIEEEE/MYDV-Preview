import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealershipCosts, costCategories, dealers } from '@/db/schema';
import { eq, and, desc, asc, sql } from 'drizzle-orm';
import { createOrGetDealer } from '@/lib/database';
import { getDealerIdForUser } from '@/lib/dealerHelper';

// GET - Fetch all dealership costs for a dealer
export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const costType = searchParams.get('costType');
    const frequency = searchParams.get('frequency');

    // Get dealer info using enhanced resolution (supports team member delegation)
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
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }
    } else {
      dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
    }

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Build query conditions
    let conditions = [eq(dealershipCosts.dealerId, dealer.id)];
    
    if (category) {
      conditions.push(eq(dealershipCosts.category, category));
    }
    if (status) {
      conditions.push(eq(dealershipCosts.status, status));
    }
    if (costType) {
      conditions.push(eq(dealershipCosts.costType, costType));
    }
    if (frequency) {
      conditions.push(eq(dealershipCosts.frequency, frequency));
    }

    // Fetch costs
    const costs = await db
      .select()
      .from(dealershipCosts)
      .where(and(...conditions))
      .orderBy(desc(dealershipCosts.createdAt));

    // Calculate totals by frequency
    const totals = await db
      .select({
        frequency: dealershipCosts.frequency,
        costType: dealershipCosts.costType,
        total: sql<number>`sum(${dealershipCosts.totalAmount})::numeric`,
        count: sql<number>`count(*)::integer`
      })
      .from(dealershipCosts)
      .where(eq(dealershipCosts.dealerId, dealer.id))
      .groupBy(dealershipCosts.frequency, dealershipCosts.costType);

    return NextResponse.json({
      costs,
      totals,
      success: true
    });

  } catch (error) {
    console.error('Error fetching dealership costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

// POST - Create new dealership cost
export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      description,
      amount,
      hasVat,
      costType,
      frequency,
      category,
      startDate,
      endDate,
      dueDate,
      notes,
      paymentMethod
    } = body;

    // Validation
    if (!description || !amount || !costType || !category) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get dealer info using enhanced resolution (supports team member delegation)
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
        return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
      }
    } else {
      dealer = await createOrGetDealer(user.id, user.fullName || 'Unknown', user.emailAddresses[0]?.emailAddress || 'unknown@email.com');
    }

    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Utility function to round currency values to 2 decimal places
    const roundToCurrency = (amount: number): number => {
      return Math.round(amount * 100) / 100;
    };

    // Calculate VAT and total
    const numAmount = parseFloat(amount);
    const vatAmount = hasVat ? roundToCurrency(numAmount * 0.2) : 0;
    const totalAmount = roundToCurrency(numAmount + vatAmount);

    // Create cost record
    const newCost = await db
      .insert(dealershipCosts)
      .values({
        dealerId: dealer.id,
        description,
        amount: numAmount.toString(),
        hasVat: hasVat || false,
        vatAmount: vatAmount > 0 ? vatAmount.toString() : null,
        totalAmount: totalAmount.toString(),
        costType,
        frequency: frequency || null,
        category,
        startDate: startDate || null,
        endDate: endDate || null,
        dueDate: dueDate || null,
        notes: notes || null,
        paymentMethod: paymentMethod || null,
        createdBy: user.id,
        status: 'active'
      })
      .returning();

    return NextResponse.json({
      cost: newCost[0],
      success: true,
      message: 'Cost created successfully'
    });

  } catch (error) {
    console.error('Error creating dealership cost:', error);
    return NextResponse.json(
      { error: 'Failed to create cost' },
      { status: 500 }
    );
  }
}
