import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/db';
import { tempInvoiceData } from '@/db/schema';
import { eq, lt, and } from 'drizzle-orm';

// Clean up expired entries from database
const cleanupExpiredEntries = async () => {
  try {
    const now = new Date();
    const result = await db
      .delete(tempInvoiceData)
      .where(lt(tempInvoiceData.expiresAt, now));
    
    console.log(`🧹 Database cleanup: Removed expired temp data entries`);
  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
  }
};

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    
    // Generate unique ID
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate expiry time (24 hours from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Store data in database
    await db.insert(tempInvoiceData).values({
      tempId,
      userId: user.id,
      data,
      expiresAt
    });
    
    // Clean up expired entries (async, don't wait)
    cleanupExpiredEntries().catch(console.error);
    
    console.log(`✅ Temporary data stored in database with ID: ${tempId}`);
    console.log(`📊 Data size: ${JSON.stringify(data).length} characters`);
    console.log(`⏰ Expires at: ${expiresAt.toISOString()}`);
    
    return NextResponse.json({ 
      success: true, 
      tempId: tempId,
      message: 'Data stored temporarily in database'
    });
    
  } catch (error) {
    console.error('❌ Error storing temporary data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tempId = searchParams.get('tempId');
    
    if (!tempId) {
      return NextResponse.json({ success: false, error: 'Missing tempId parameter' }, { status: 400 });
    }
    
    // Query database for the temp data
    const results = await db
      .select()
      .from(tempInvoiceData)
      .where(
        and(
          eq(tempInvoiceData.tempId, tempId),
          eq(tempInvoiceData.userId, user.id)
        )
      )
      .limit(1);
    
    if (results.length === 0) {
      console.log(`❌ Temp data not found for ID: ${tempId}, User: ${user.id}`);
      return NextResponse.json({ 
        success: false, 
        error: 'Data not found or expired',
        suggestion: 'Please check Invoice Management for your saved invoice'
      }, { status: 404 });
    }
    
    const storedData = results[0];
    
    // Check if data has expired
    if (new Date() > storedData.expiresAt) {
      console.log(`⏰ Temp data expired for ID: ${tempId}`);
      
      // Delete expired data
      await db
        .delete(tempInvoiceData)
        .where(eq(tempInvoiceData.tempId, tempId));
      
      return NextResponse.json({ 
        success: false, 
        error: 'Data has expired',
        suggestion: 'Your invoice has been automatically saved. Please check Invoice Management.'
      }, { status: 404 });
    }
    
    console.log(`✅ Temporary data retrieved from database: ${tempId}`);
    console.log(`📊 Data expires at: ${storedData.expiresAt.toISOString()}`);
    
    return NextResponse.json({ 
      success: true, 
      data: storedData.data,
      message: 'Data retrieved successfully from database'
    });
    
  } catch (error) {
    console.error('❌ Error retrieving temporary data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
