import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/lib/db'
import { customTerms } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const dealerId = searchParams.get('dealerId')

    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer ID is required' }, { status: 400 })
    }

    // Get custom terms for the dealer
    const terms = await db
      .select()
      .from(customTerms)
      .where(eq(customTerms.dealerId, dealerId))
      .limit(1)

    const termsData = terms[0] || {
      checklistTerms: '',
      basicTerms: '',
      inHouseWarrantyTerms: '',
      thirdPartyTerms: '',
      tradeTerms: ''
    }

    return NextResponse.json({
      success: true,
      data: termsData
    })

  } catch (error) {
    console.error('Error fetching custom terms:', error)
    return NextResponse.json(
      { error: 'Failed to fetch custom terms' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      dealerId, 
      checklistTerms, 
      basicTerms, 
      inHouseWarrantyTerms, 
      thirdPartyTerms,
      tradeTerms 
    } = body

    if (!dealerId) {
      return NextResponse.json({ error: 'Dealer ID is required' }, { status: 400 })
    }

    // Check if terms already exist for this dealer
    const existingTerms = await db
      .select()
      .from(customTerms)
      .where(eq(customTerms.dealerId, dealerId))
      .limit(1)

    if (existingTerms.length > 0) {
      // Update existing terms
      const updated = await db
        .update(customTerms)
        .set({
          checklistTerms: checklistTerms || '',
          basicTerms: basicTerms || '',
          inHouseWarrantyTerms: inHouseWarrantyTerms || '',
          thirdPartyTerms: thirdPartyTerms || '',
          tradeTerms: tradeTerms || '',
          updatedAt: new Date()
        })
        .where(eq(customTerms.dealerId, dealerId))
        .returning()

      return NextResponse.json({
        success: true,
        data: updated[0],
        message: 'Terms and conditions updated successfully'
      })
    } else {
      // Create new terms
      const created = await db
        .insert(customTerms)
        .values({
          dealerId,
          checklistTerms: checklistTerms || '',
          basicTerms: basicTerms || '',
          inHouseWarrantyTerms: inHouseWarrantyTerms || '',
          thirdPartyTerms: thirdPartyTerms || '',
          tradeTerms: tradeTerms || '',
          createdBy: userId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning()

      return NextResponse.json({
        success: true,
        data: created[0],
        message: 'Terms and conditions created successfully'
      })
    }

  } catch (error) {
    console.error('Error saving custom terms:', error)
    return NextResponse.json(
      { error: 'Failed to save custom terms' },
      { status: 500 }
    )
  }
}
