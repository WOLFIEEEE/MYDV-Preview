import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { dealershipCosts } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { createOrGetDealer } from '@/lib/database';

// GET - Fetch single cost by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const cost = await db
      .select()
      .from(dealershipCosts)
      .where(
        and(
          eq(dealershipCosts.id, parseInt(id)),
          eq(dealershipCosts.dealerId, dealer.id)
        )
      )
      .limit(1);

    if (cost.length === 0) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    return NextResponse.json({
      cost: cost[0],
      success: true
    });

  } catch (error) {
    console.error('Error fetching cost:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cost' },
      { status: 500 }
    );
  }
}

// PUT - Update cost
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
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
      status,
      isPaid,
      paidDate,
      paymentMethod
    } = body;

    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    // Calculate VAT and total if amount changed
    let updateData: any = {
      updatedBy: userId,
      updatedAt: new Date()
    };

    if (description !== undefined) updateData.description = description;
    if (costType !== undefined) updateData.costType = costType;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (category !== undefined) updateData.category = category;
    if (startDate !== undefined) updateData.startDate = startDate;
    if (endDate !== undefined) updateData.endDate = endDate;
    if (dueDate !== undefined) updateData.dueDate = dueDate;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (isPaid !== undefined) updateData.isPaid = isPaid;
    if (paidDate !== undefined) updateData.paidDate = paidDate;
    if (paymentMethod !== undefined) updateData.paymentMethod = paymentMethod;

    if (amount !== undefined || hasVat !== undefined) {
      const numAmount = amount !== undefined ? parseFloat(amount) : undefined;
      if (numAmount !== undefined) {
        const vatAmount = hasVat ? numAmount * 0.2 : 0;
        const totalAmount = numAmount + vatAmount;
        
        updateData.amount = numAmount.toString();
        updateData.hasVat = hasVat || false;
        updateData.vatAmount = vatAmount > 0 ? vatAmount.toString() : null;
        updateData.totalAmount = totalAmount.toString();
      }
    }

    const updatedCost = await db
      .update(dealershipCosts)
      .set(updateData)
      .where(
        and(
          eq(dealershipCosts.id, parseInt(id)),
          eq(dealershipCosts.dealerId, dealer.id)
        )
      )
      .returning();

    if (updatedCost.length === 0) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    return NextResponse.json({
      cost: updatedCost[0],
      success: true,
      message: 'Cost updated successfully'
    });

  } catch (error) {
    console.error('Error updating cost:', error);
    return NextResponse.json(
      { error: 'Failed to update cost' },
      { status: 500 }
    );
  }
}

// DELETE - Delete cost
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const dealer = await createOrGetDealer(userId, 'Unknown', 'unknown@email.com');
    if (!dealer) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 });
    }

    const deletedCost = await db
      .delete(dealershipCosts)
      .where(
        and(
          eq(dealershipCosts.id, parseInt(id)),
          eq(dealershipCosts.dealerId, dealer.id)
        )
      )
      .returning();

    if (deletedCost.length === 0) {
      return NextResponse.json({ error: 'Cost not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Cost deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting cost:', error);
    return NextResponse.json(
      { error: 'Failed to delete cost' },
      { status: 500 }
    );
  }
}
