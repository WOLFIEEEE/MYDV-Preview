import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';

// In-memory storage for temporary data (in production, use Redis or database)
const tempStorage = new Map<string, { data: any; timestamp: number; userId: string }>();

// Clean up old entries (older than 24 hours) with memory safety
const cleanupOldEntries = () => {
  const twentyFourHoursAgo = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
  const oneHourAgo = Date.now() - (60 * 60 * 1000); // 1 hour for memory pressure
  
  const entriesCount = tempStorage.size;
  
  // If we have too many entries (memory pressure), use shorter expiry
  const expiryTime = entriesCount > 100 ? oneHourAgo : twentyFourHoursAgo;
  
  for (const [key, value] of tempStorage.entries()) {
    if (value.timestamp < expiryTime) {
      tempStorage.delete(key);
    }
  }
  
  console.log(`🧹 Cleanup: ${entriesCount - tempStorage.size} entries removed. Remaining: ${tempStorage.size}`);
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
    
    // Store data with timestamp and user ID
    tempStorage.set(tempId, {
      data: data,
      timestamp: Date.now(),
      userId: user.id
    });
    
    // Clean up old entries
    cleanupOldEntries();
    
    console.log(`✅ Temporary data stored with ID: ${tempId}`);
    console.log(`📊 Data size: ${JSON.stringify(data).length} characters`);
    
    return NextResponse.json({ 
      success: true, 
      tempId: tempId,
      message: 'Data stored temporarily'
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
    
    const storedData = tempStorage.get(tempId);
    
    if (!storedData) {
      return NextResponse.json({ success: false, error: 'Data not found or expired' }, { status: 404 });
    }
    
    // Verify user owns this data
    if (storedData.userId !== user.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }
    
    // Don't delete immediately - let cleanup handle it
    // tempStorage.delete(tempId);
    
    console.log(`✅ Temporary data retrieved and cleaned up: ${tempId}`);
    
    return NextResponse.json({ 
      success: true, 
      data: storedData.data,
      message: 'Data retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error retrieving temporary data:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
