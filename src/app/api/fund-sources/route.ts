import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { fundSources, dealers, fundTransactions } from '@/db/schema'
import { eq, and, desc, sql } from 'drizzle-orm'

// GET - Fetch all fund sources for the authenticated dealer
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

    // Fetch fund sources with transaction summaries
    const sources = await db
      .select({
        id: fundSources.id,
        dealerId: fundSources.dealerId,
        fundName: fundSources.fundName,
        amount: fundSources.amount,
        address: fundSources.address,
        contactPersonName: fundSources.contactPersonName,
        mobileNumber: fundSources.mobileNumber,
        contactEmail: fundSources.contactEmail,
        description: fundSources.description,
        interestRate: fundSources.interestRate,
        repaymentTerms: fundSources.repaymentTerms,
        status: fundSources.status,
        createdAt: fundSources.createdAt,
        updatedAt: fundSources.updatedAt,
      })
      .from(fundSources)
      .where(eq(fundSources.dealerId, dealerId))
      .orderBy(desc(fundSources.createdAt))

    // Get transaction summaries for each fund source
    const sourcesWithSummary = await Promise.all(
      sources.map(async (source) => {
        // Get total used amount
        const usedResult = await db
          .select({
            totalUsed: sql<string>`COALESCE(SUM(CAST(${fundTransactions.amount} AS DECIMAL)), 0)`,
          })
          .from(fundTransactions)
          .where(
            and(
              eq(fundTransactions.fundSourceId, source.id),
              eq(fundTransactions.transactionType, 'usage'),
              eq(fundTransactions.status, 'completed')
            )
          )

        // Get total repaid amount
        const repaidResult = await db
          .select({
            totalRepaid: sql<string>`COALESCE(SUM(CAST(${fundTransactions.amount} AS DECIMAL)), 0)`,
          })
          .from(fundTransactions)
          .where(
            and(
              eq(fundTransactions.fundSourceId, source.id),
              eq(fundTransactions.transactionType, 'repayment'),
              eq(fundTransactions.status, 'completed')
            )
          )

        const totalUsed = parseFloat(usedResult[0]?.totalUsed || '0')
        const totalRepaid = parseFloat(repaidResult[0]?.totalRepaid || '0')
        const totalAmount = parseFloat(source.amount)
        const outstandingAmount = totalUsed - totalRepaid
        const availableAmount = totalAmount - outstandingAmount
        // Utilization should be based on outstanding amount, not total used
        const utilizationPercentage = totalAmount > 0 ? (outstandingAmount / totalAmount) * 100 : 0
        const repaymentPercentage = totalUsed > 0 ? (totalRepaid / totalUsed) * 100 : 0

        return {
          ...source,
          totalUsed,
          totalRepaid,
          outstandingAmount,
          availableAmount,
          utilizationPercentage,
          repaymentPercentage,
        }
      })
    )

    return NextResponse.json({ success: true, data: sourcesWithSummary })
  } catch (error) {
    console.error('Error fetching fund sources:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fund sources' },
      { status: 500 }
    )
  }
}

// POST - Create a new fund source
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
    if (!body.fundName || !body.amount) {
      return NextResponse.json(
        { error: 'Fund name and amount are required' },
        { status: 400 }
      )
    }

    // Check if fund name already exists for this dealer
    const existingFund = await db
      .select()
      .from(fundSources)
      .where(
        and(
          eq(fundSources.dealerId, dealerId),
          eq(fundSources.fundName, body.fundName)
        )
      )
      .limit(1)

    if (existingFund.length > 0) {
      return NextResponse.json(
        { error: 'A fund with this name already exists' },
        { status: 409 }
      )
    }

    // Create new fund source
    const newFundSource = await db
      .insert(fundSources)
      .values({
        dealerId,
        fundName: body.fundName,
        amount: body.amount,
        address: body.address || null,
        contactPersonName: body.contactPersonName || null,
        mobileNumber: body.mobileNumber || null,
        contactEmail: body.contactEmail || null,
        description: body.description || null,
        interestRate: body.interestRate || null,
        repaymentTerms: body.repaymentTerms || null,
        status: body.status || 'active',
      })
      .returning()

    return NextResponse.json(
      { success: true, data: newFundSource[0] },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating fund source:', error)
    return NextResponse.json(
      { error: 'Failed to create fund source' },
      { status: 500 }
    )
  }
}
