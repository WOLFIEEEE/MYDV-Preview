import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { fundSources, fundTransactions, dealers } from '@/db/schema'
import { eq, and, sum, sql } from 'drizzle-orm'

// GET - Get fund source summary with transaction totals
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

    // Get fund source details
    const fundSource = await db
      .select()
      .from(fundSources)
      .where(
        and(
          eq(fundSources.id, id),
          eq(fundSources.dealerId, dealerId)
        )
      )
      .limit(1)

    if (!fundSource.length) {
      return NextResponse.json({ error: 'Fund source not found' }, { status: 404 })
    }

    // Get transaction summaries
    const transactionSummary = await db
      .select({
        transactionType: fundTransactions.transactionType,
        totalAmount: sum(fundTransactions.amount).mapWith(Number),
        count: sql<number>`count(*)`.mapWith(Number),
      })
      .from(fundTransactions)
      .where(
        and(
          eq(fundTransactions.fundSourceId, id),
          eq(fundTransactions.dealerId, dealerId),
          eq(fundTransactions.status, 'completed')
        )
      )
      .groupBy(fundTransactions.transactionType)

    // Calculate totals
    let totalUsed = 0
    let totalRepaid = 0
    let totalInterest = 0

    transactionSummary.forEach((summary) => {
      switch (summary.transactionType) {
        case 'usage':
          totalUsed = summary.totalAmount || 0
          break
        case 'repayment':
          totalRepaid = summary.totalAmount || 0
          break
        case 'interest_payment':
          totalInterest = summary.totalAmount || 0
          break
      }
    })

    const originalAmount = Number(fundSource[0].amount)
    const availableAmount = originalAmount - totalUsed + totalRepaid
    const outstandingAmount = totalUsed - totalRepaid

    // Get recent transactions
    const recentTransactions = await db
      .select()
      .from(fundTransactions)
      .where(
        and(
          eq(fundTransactions.fundSourceId, id),
          eq(fundTransactions.dealerId, dealerId)
        )
      )
      .orderBy(sql`${fundTransactions.transactionDate} DESC`)
      .limit(10)

    const summary = {
      fundSource: fundSource[0],
      summary: {
        originalAmount,
        totalUsed,
        totalRepaid,
        totalInterest,
        availableAmount,
        outstandingAmount,
        utilizationPercentage: originalAmount > 0 ? (totalUsed / originalAmount) * 100 : 0,
      },
      transactionBreakdown: transactionSummary,
      recentTransactions,
    }

    return NextResponse.json({ success: true, data: summary })
  } catch (error) {
    console.error('Error fetching fund source summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fund source summary' },
      { status: 500 }
    )
  }
}
