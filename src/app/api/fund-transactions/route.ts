import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { fundTransactions, fundSources, dealers } from '@/db/schema'
import { eq, and, desc } from 'drizzle-orm'

// GET - Fetch all fund transactions for the authenticated dealer
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Get query parameters
    const { searchParams } = new URL(request.url)
    const fundSourceId = searchParams.get('fundSourceId')

    // Build where condition
    let whereCondition = eq(fundTransactions.dealerId, dealerId)
    
    // Filter by fund source if specified
    if (fundSourceId) {
      whereCondition = and(
        eq(fundTransactions.dealerId, dealerId),
        eq(fundTransactions.fundSourceId, fundSourceId)
      )!
    }

    // Build query
    const query = db
      .select({
        transaction: fundTransactions,
        fundSource: {
          id: fundSources.id,
          fundName: fundSources.fundName,
        },
      })
      .from(fundTransactions)
      .leftJoin(fundSources, eq(fundTransactions.fundSourceId, fundSources.id))
      .where(whereCondition)

    const transactions = await query.orderBy(desc(fundTransactions.transactionDate))

    return NextResponse.json({ success: true, data: transactions })
  } catch (error) {
    console.error('Error fetching fund transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fund transactions' },
      { status: 500 }
    )
  }
}

// POST - Create a new fund transaction
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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

    // Create new fund transaction
    const newTransaction = await db
      .insert(fundTransactions)
      .values({
        dealerId,
        fundSourceId: body.fundSourceId,
        transactionType: body.transactionType,
        amount: body.amount,
        description: body.description || null,
        referenceNumber: body.referenceNumber || null,
        vehicleStockId: body.vehicleStockId || null,
        transactionDate: body.transactionDate ? new Date(body.transactionDate) : new Date(),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        status: body.status || 'completed',
        notes: body.notes || null,
        attachments: body.attachments || null,
      })
      .returning()

    return NextResponse.json(
      { success: true, data: newTransaction[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating fund transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create fund transaction' },
      { status: 500 }
    )
  }
}
