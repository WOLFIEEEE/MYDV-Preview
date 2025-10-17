import { NextRequest, NextResponse } from 'next/server';
import { currentUser } from '@clerk/nextjs/server';
import { processDVLABatch } from '@/lib/services/dvlaService';
import { getDealerIdForUser } from '@/lib/dealerHelper';

/**
 * Background DVLA processing endpoint
 * This can be called during stock refresh to update MOT data in the background
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    // Get dealer ID
    const dealerResult = await getDealerIdForUser(user);
    if (!dealerResult.success || !dealerResult.dealerId) {
      return NextResponse.json({
        success: false,
        error: 'Dealer not found'
      }, { status: 400 });
    }

    const dealerId = dealerResult.dealerId;

    // Parse request body
    const body = await request.json();
    const { 
      background = true,
      batchSize = 5, // Smaller batch size for background processing
      maxProcessingTime = 25000 // 25 seconds max (within serverless limits)
    } = body;

    console.log(`🔄 Starting background DVLA processing for dealer: ${dealerId}`);

    if (background) {
      // Start background processing (don't wait for completion)
      // This allows the stock refresh to continue while DVLA data is processed
      setImmediate(async () => {
        try {
          console.log('🚀 Background DVLA processing started');
          
          const startTime = Date.now();
          let totalProcessed = 0;
          
          // Process in smaller batches with time limit
          while (Date.now() - startTime < maxProcessingTime) {
            const result = await processDVLABatch({
              dealerId,
              forceRefresh: false,
              batchSize: Math.min(batchSize, 3) // Even smaller batches for background
            });
            
            totalProcessed += result.processed;
            
            // If no vehicles were processed, we're done
            if (result.processed === 0) {
              break;
            }
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
          console.log(`✅ Background DVLA processing completed. Processed: ${totalProcessed} vehicles`);
          
        } catch (error) {
          console.error('❌ Background DVLA processing error:', error);
        }
      });

      // Return immediately to not block stock refresh
      return NextResponse.json({
        success: true,
        message: 'Background DVLA processing started',
        background: true
      });
      
    } else {
      // Synchronous processing (wait for completion)
      const result = await processDVLABatch({
        dealerId,
        forceRefresh: false,
        batchSize
      });

      return NextResponse.json({
        success: result.success,
        data: {
          processed: result.processed,
          updated: result.updated,
          errors: result.errors
        },
        background: false
      });
    }

  } catch (error) {
    console.error('❌ DVLA integration error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      message: 'DVLA Integration API',
      endpoints: {
        POST: {
          description: 'Start DVLA processing (background or synchronous)',
          parameters: {
            background: 'boolean - Process in background (default: true)',
            batchSize: 'number - Vehicles per batch (default: 5)',
            maxProcessingTime: 'number - Max processing time in ms (default: 25000)'
          }
        }
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}
