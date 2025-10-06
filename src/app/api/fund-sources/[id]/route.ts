import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { fundSources, dealers } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

// GET - Fetch a specific fund source
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

    // Fetch the specific fund source
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

    return NextResponse.json({ success: true, data: fundSource[0] })
  } catch (error) {
    console.error('Error fetching fund source:', error)
    return NextResponse.json(
      { error: 'Failed to fetch fund source' },
      { status: 500 }
    )
  }
}

// PUT - Update a fund source
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
    if (!body.fundName || !body.amount) {
      return NextResponse.json(
        { error: 'Fund name and amount are required' },
        { status: 400 }
      )
    }

    // Check if fund exists and belongs to dealer
    const existingFund = await db
      .select()
      .from(fundSources)
      .where(
        and(
          eq(fundSources.id, id),
          eq(fundSources.dealerId, dealerId)
        )
      )
      .limit(1)

    if (!existingFund.length) {
      return NextResponse.json({ error: 'Fund source not found' }, { status: 404 })
    }

    // Check if new fund name conflicts with existing funds (excluding current fund)
    if (body.fundName !== existingFund[0].fundName) {
      const nameConflict = await db
        .select()
        .from(fundSources)
        .where(
          and(
            eq(fundSources.dealerId, dealerId),
            eq(fundSources.fundName, body.fundName)
          )
        )
        .limit(1)

      if (nameConflict.length > 0) {
        return NextResponse.json(
          { error: 'A fund with this name already exists' },
          { status: 409 }
        )
      }
    }

    // Update fund source
    const updatedFundSource = await db
      .update(fundSources)
      .set({
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
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(fundSources.id, id),
          eq(fundSources.dealerId, dealerId)
        )
      )
      .returning()

    if (!updatedFundSource.length) {
      return NextResponse.json({ error: 'Failed to update fund source' }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updatedFundSource[0] })
  } catch (error) {
    console.error('Error updating fund source:', error)
    return NextResponse.json(
      { error: 'Failed to update fund source' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a fund source
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

    // Check if fund exists and belongs to dealer
    const existingFund = await db
      .select()
      .from(fundSources)
      .where(
        and(
          eq(fundSources.id, id),
          eq(fundSources.dealerId, dealerId)
        )
      )
      .limit(1)

    if (!existingFund.length) {
      return NextResponse.json({ error: 'Fund source not found' }, { status: 404 })
    }

    // Delete fund source
    await db
      .delete(fundSources)
      .where(
        and(
          eq(fundSources.id, id),
          eq(fundSources.dealerId, dealerId)
        )
      )

    return NextResponse.json({ success: true, message: 'Fund source deleted successfully' })
  } catch (error) {
    console.error('Error deleting fund source:', error)
    return NextResponse.json(
      { error: 'Failed to delete fund source' },
      { status: 500 }
    )
  }
}
