import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { fundTransactions, fundSources, dealers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// GET - Fetch a specific fund transaction
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get dealer info
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1)

    if (!dealer.length) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    const dealerId = dealer[0].id

    // Fetch the specific fund transaction with fund source details
    const transaction = await db
      .select({
        transaction: fundTransactions,
        fundSource: {
          id: fundSources.id,
          fundName: fundSources.fundName,
        },
      })
      .from(fundTransactions)
      .leftJoin(fundSources, eq(fundTransactions.fundSourceId, fundSources.id))
      .where(
        and(
          eq(fundTransactions.id, id),
          eq(fundTransactions.dealerId, dealerId)
        )
      )
      .limit(1)

    if (!transaction.length) {
      return NextResponse.json({ error: 'Fund transaction not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: transaction[0] })
  } catch (error) {
    console.error('Error fetching fund transaction:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fund transaction' },
      { status: 500 }
    )
  }
}

// PUT - Update a fund transaction
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get dealer info
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1)

    if (!dealer.length) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    const dealerId = dealer[0].id
    const body = await request.json()

    // Validate required fields
    if (!body.fundSourceId || !body.transactionType || !body.amount) {
      return NextResponse.json(
        { error: 'Fund source ID, transaction type, and amount are required' },
        { status: 400 }
      )
    }

    // Validate transaction type
    const validTypes = ['usage', 'repayment', 'interest_payment']
    if (!validTypes.includes(body.transactionType)) {
      return NextResponse.json(
        { error: 'Invalid transaction type' },
        { status: 400 }
      )
    }

    // Check if transaction exists and belongs to dealer
    const existingTransaction = await db
      .select()
      .from(fundTransactions)
      .where(
        and(
          eq(fundTransactions.id, id),
          eq(fundTransactions.dealerId, dealerId)
        )
      )
      .limit(1)

    if (!existingTransaction.length) {
      return NextResponse.json({ error: 'Fund transaction not found' }, { status: 404 })
    }

    // Verify fund source exists and belongs to dealer
    const fundSource = await db
      .select()
      .from(fundSources)
      .where(
        and(
          eq(fundSources.id, body.fundSourceId),
          eq(fundSources.dealerId, dealerId)
        )
      )
      .limit(1)

    if (!fundSource.length) {
      return NextResponse.json({ error: 'Fund source not found' }, { status: 404 })
    }

    // Update fund transaction
    const updatedTransaction = await db
      .update(fundTransactions)
      .set({
        fundSourceId: body.fundSourceId,
        transactionType: body.transactionType,
        amount: body.amount,
        description: body.description || null,
        referenceNumber: body.referenceNumber || null,
        vehicleStockId: body.vehicleStockId || null,
        transactionDate: body.transactionDate ? new Date(body.transactionDate) : existingTransaction[0].transactionDate,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.status || 'completed',
        notes: body.notes || null,
        attachments: body.attachments || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(fundTransactions.id, id),
          eq(fundTransactions.dealerId, dealerId)
        )
      )
      .returning()

    if (!updatedTransaction.length) {
      return NextResponse.json({ error: 'Failed to update fund transaction' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedTransaction[0] })
  } catch (error) {
    console.error('Error updating fund transaction:', error)
    return NextResponse.json(
      { error: 'Failed to update fund transaction' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a fund transaction
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Get dealer info
    const dealer = await db
      .select()
      .from(dealers)
      .where(eq(dealers.clerkUserId, userId))
      .limit(1)

    if (!dealer.length) {
      return NextResponse.json({ error: 'Dealer not found' }, { status: 404 })
    }

    const dealerId = dealer[0].id

    // Check if transaction exists and belongs to dealer
    const existingTransaction = await db
      .select()
      .from(fundTransactions)
      .where(
        and(
          eq(fundTransactions.id, id),
          eq(fundTransactions.dealerId, dealerId)
        )
      )
      .limit(1)

    if (!existingTransaction.length) {
      return NextResponse.json({ error: 'Fund transaction not found' }, { status: 404 })
    }

    // Delete fund transaction
    await db
      .delete(fundTransactions)
      .where(
        and(
          eq(fundTransactions.id, id),
          eq(fundTransactions.dealerId, dealerId)
        )
      )

    return NextResponse.json({ success: true, message: 'Fund transaction deleted successfully' })
  } catch (error) {
    console.error('Error deleting fund transaction:', error)
    return NextResponse.json(
      { error: 'Failed to delete fund transaction' },
      { status: 500 }
    )
  }
}
