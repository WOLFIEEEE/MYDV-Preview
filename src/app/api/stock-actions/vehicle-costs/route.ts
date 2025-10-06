import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { vehicleCosts, dealers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// POST - Create or update vehicle costs
export async function POST(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer record from Clerk user ID
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dealer record not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult[0].id;

    const body = await request.json();
    console.log('📝 Vehicle Costs API - Received data:', body);

    const {
      stockId,
      stockReference,
      registration,
      fixedCosts,
      groupedCosts,
      replaceMode = false // New parameter to indicate if we should replace instead of merge
    } = body;

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 });
    }

    // Utility function to round currency values to 2 decimal places
    const roundToCurrency = (amount: number): number => {
      return Math.round(amount * 100) / 100;
    };

    // Define types for cost structures
    interface CostItem {
      description: string;
      amount: string;
    }

    interface GroupedCosts {
      service?: CostItem[];
      parts?: CostItem[];
      repairs?: CostItem[];
      dents?: CostItem[];
      bodyshop?: CostItem[];
    }

    // Calculate totals (removed unused variable)
    // const fixedCostsTotal = roundToCurrency(Object.values(fixedCosts || {}).reduce((sum: number, value: string | null) => {
    //   return sum + (parseFloat(value || '0') || 0);
    // }, 0));

    const calculateGroupedTotal = (groupData: GroupedCosts | null | undefined): number => {
      if (!groupData) return 0;
      const total = Object.values(groupData).reduce((total: number, category: CostItem[] | undefined) => {
        if (!Array.isArray(category)) return total;
        return total + category.reduce((sum: number, item: CostItem) => {
          return sum + (parseFloat(item.amount) || 0);
        }, 0);
      }, 0);
      return roundToCurrency(total);
    };

    // Check if record already exists
    const existingRecord = await db
      .select()
      .from(vehicleCosts)
      .where(and(
        eq(vehicleCosts.stockId, stockId),
        eq(vehicleCosts.dealerId, dealerId)
      ))
      .limit(1);

    // Helper function to merge grouped costs (add new costs to existing ones)
    const mergeGroupedCosts = (existing: GroupedCosts | null, newCosts: GroupedCosts | null): GroupedCosts | null => {
      if (!existing) return newCosts;
      if (!newCosts) return existing;

      const merged: GroupedCosts = { ...existing };
      
      // Merge each category (service, parts, repairs, dents, bodyshop)
      Object.keys(newCosts).forEach(category => {
        const categoryKey = category as keyof GroupedCosts;
        if (!merged[categoryKey]) {
          merged[categoryKey] = [];
        }
        
        // Add new costs to existing category
        if (Array.isArray(newCosts[categoryKey]) && Array.isArray(merged[categoryKey])) {
          merged[categoryKey] = [...(merged[categoryKey] || []), ...(newCosts[categoryKey] || [])];
        }
      });

      return merged;
    };

    // Helper function to add fixed costs (only update if new value provided)
    const mergeFixedCosts = (existingValue: string | null, newValue: string | null) => {
      if (!newValue || newValue === '' || newValue === '0') {
        return existingValue; // Keep existing value if no new value provided
      }
      
      // If existing value exists, add to it; otherwise use new value
      if (existingValue && existingValue !== '0') {
        return (parseFloat(existingValue) + parseFloat(newValue)).toString();
      }
      
      return newValue;
    };

    let mergedExVatCosts = groupedCosts?.exVat || null;
    let mergedIncVatCosts = groupedCosts?.incVat || null;
    let mergedTransportIn = fixedCosts?.transportIn || null;
    let mergedTransportOut = fixedCosts?.transportOut || null;
    let mergedMot = fixedCosts?.mot || null;

    // If record exists, either merge or replace based on replaceMode
    if (existingRecord.length > 0) {
      const existing = existingRecord[0];
      
      if (replaceMode) {
        // Replace mode: Use the new data as-is (for direct Add Costs form usage)
        console.log('🔄 Replace mode: Using new data as-is (direct costs form)');
        // mergedXXX variables already contain the new data, no need to merge
      } else {
        // Merge mode: Add new costs to existing ones (ONLY for Kanban job cards)
        console.log('🔄 Merge mode: Adding new costs to existing ones (from Kanban job cards)');
        
        // Only merge if we have actual new costs to add
        const hasNewExVatCosts = groupedCosts?.exVat && Object.values(groupedCosts.exVat).some(arr => Array.isArray(arr) && arr.length > 0);
        const hasNewIncVatCosts = groupedCosts?.incVat && Object.values(groupedCosts.incVat).some(arr => Array.isArray(arr) && arr.length > 0);
        const hasNewFixedCosts = (fixedCosts?.transportIn && fixedCosts.transportIn !== '0') || 
                                (fixedCosts?.transportOut && fixedCosts.transportOut !== '0') || 
                                (fixedCosts?.mot && fixedCosts.mot !== '0');
        
        if (hasNewExVatCosts || hasNewIncVatCosts || hasNewFixedCosts) {
          // Merge grouped costs
          mergedExVatCosts = mergeGroupedCosts(existing.exVatCosts as GroupedCosts | null, groupedCosts?.exVat || null);
          mergedIncVatCosts = mergeGroupedCosts(existing.incVatCosts as GroupedCosts | null, groupedCosts?.incVat || null);
          
          // Merge fixed costs (add to existing values)
          mergedTransportIn = mergeFixedCosts(existing.transportIn, fixedCosts?.transportIn);
          mergedTransportOut = mergeFixedCosts(existing.transportOut, fixedCosts?.transportOut);
          mergedMot = mergeFixedCosts(existing.mot, fixedCosts?.mot);
        } else {
          // No new costs to merge, keep existing data
          console.log('🔄 No new costs to merge, keeping existing data');
          mergedExVatCosts = existing.exVatCosts as GroupedCosts | null;
          mergedIncVatCosts = existing.incVatCosts as GroupedCosts | null;
          mergedTransportIn = existing.transportIn;
          mergedTransportOut = existing.transportOut;
          mergedMot = existing.mot;
        }
      }
    }

    // Recalculate totals with merged costs
    const mergedFixedCostsTotal = roundToCurrency([
      parseFloat(mergedTransportIn || '0'),
      parseFloat(mergedTransportOut || '0'),
      parseFloat(mergedMot || '0')
    ].reduce((sum, value) => sum + value, 0));

    const mergedExVatCostsTotal = calculateGroupedTotal(mergedExVatCosts);
    const mergedIncVatCostsTotal = calculateGroupedTotal(mergedIncVatCosts);
    const mergedGrandTotal = roundToCurrency(mergedFixedCostsTotal + mergedExVatCostsTotal + mergedIncVatCostsTotal);

    const costsData = {
      stockId,
      dealerId,
      stockReference,
      registration,
      transportIn: mergedTransportIn,
      transportOut: mergedTransportOut,
      mot: mergedMot,
      exVatCosts: mergedExVatCosts,
      incVatCosts: mergedIncVatCosts,
      fixedCostsTotal: mergedFixedCostsTotal.toString(),
      exVatCostsTotal: mergedExVatCostsTotal.toString(),
      incVatCostsTotal: mergedIncVatCostsTotal.toString(),
      grandTotal: mergedGrandTotal.toString(),
      updatedAt: new Date()
    };

    let result;
    if (existingRecord.length > 0) {
      // Update existing record by merging costs
      console.log('📝 Merging new costs with existing vehicle costs');
      console.log('🔄 Previous grand total:', existingRecord[0].grandTotal);
      console.log('🔄 New grand total:', mergedGrandTotal);
      result = await db
        .update(vehicleCosts)
        .set(costsData)
        .where(and(
          eq(vehicleCosts.stockId, stockId),
          eq(vehicleCosts.dealerId, dealerId)
        ))
        .returning();
    } else {
      // Create new record
      console.log('📝 Creating new vehicle costs record');
      result = await db
        .insert(vehicleCosts)
        .values(costsData)
        .returning();
    }

    console.log('✅ Vehicle Costs saved successfully (merged):', {
      stockId: result[0].stockId,
      registration: result[0].registration,
      grandTotal: result[0].grandTotal,
      fixedCostsTotal: result[0].fixedCostsTotal,
      exVatCostsTotal: result[0].exVatCostsTotal,
      incVatCostsTotal: result[0].incVatCostsTotal
    });

    return NextResponse.json({
      success: true,
      message: existingRecord.length > 0 ? 'Vehicle costs merged successfully' : 'Vehicle costs created successfully',
      data: result[0],
      merged: existingRecord.length > 0
    });

  } catch (error) {
    console.error('❌ Error saving vehicle costs:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Retrieve vehicle costs
export async function GET(request: NextRequest) {
  try {
    // Get current user from Clerk
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get dealer record from Clerk user ID
    const dealerResult = await db
      .select({ id: dealers.id })
      .from(dealers)
      .where(eq(dealers.clerkUserId, user.id))
      .limit(1);

    if (dealerResult.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Dealer record not found' 
      }, { status: 404 });
    }

    const dealerId = dealerResult[0].id;

    const { searchParams } = new URL(request.url);
    const stockId = searchParams.get('stockId');

    if (!stockId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Stock ID is required' 
      }, { status: 400 });
    }

    console.log('📖 Fetching vehicle costs for stockId:', stockId);

    const result = await db
      .select()
      .from(vehicleCosts)
      .where(and(
        eq(vehicleCosts.stockId, stockId),
        eq(vehicleCosts.dealerId, dealerId)
      ))
      .limit(1);

    if (result.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No vehicle costs found',
        data: null
      });
    }

    console.log('✅ Vehicle costs retrieved:', result[0]);

    return NextResponse.json({
      success: true,
      data: result[0]
    });

  } catch (error) {
    console.error('❌ Error fetching vehicle costs:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 