import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { db } from '@/lib/db'
import { storeConfig } from '@/db/schema'
import { eq, or } from 'drizzle-orm'

/**
 * Autotrader Webhook Handler
 * 
 * This endpoint ONLY logs incoming webhooks from Autotrader.
 * Goal: Verify signature and log everything properly.
 * No processing is performed at this time.
 * 
 * Reference: https://help.autotrader.co.uk/hc/en-gb/articles/21846314775453-Introduction-to-Stock-Sync
 * Reference: https://help.autotrader.co.uk/hc/en-gb/articles/21944941459485-Introduction-to-Deal-Sync
 */

interface AutotraderNotification {
  eventType?: string
  advertiserId?: string
  stockId?: string
  dealId?: string
  integrationId?: string
  timestamp?: string
  [key: string]: unknown
}

/**
 * Main webhook handler - Logs everything
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  let notification: AutotraderNotification | null = null
  let rawBody = ''
  
  // Always log the webhook request first, regardless of verification status
  console.log(`\n${'='.repeat(80)}`)
  console.log(`[AUTOTRADER-WEBHOOK] 🔔 WEBHOOK RECEIVED`)
  console.log(`${'='.repeat(80)}`)
  console.log(`[AUTOTRADER-WEBHOOK] 📋 Request ID: ${requestId}`)
  console.log(`[AUTOTRADER-WEBHOOK] ⏰ Received At: ${new Date().toISOString()}`)
  console.log(`[AUTOTRADER-WEBHOOK] 🌐 Method: ${request.method}`)
  console.log(`[AUTOTRADER-WEBHOOK] 📍 URL: ${request.url}`)
  
  // Log all headers first (for debugging even if verification fails)
  console.log(`\n[AUTOTRADER-WEBHOOK] 📋 All Headers:`)
  const allHeaders = Object.fromEntries(request.headers.entries())
  Object.entries(allHeaders).forEach(([key, value]) => {
    // Don't log full signature, just first few chars
    if (key.toLowerCase().includes('signature') || key.toLowerCase().includes('hash')) {
      console.log(`[AUTOTRADER-WEBHOOK]    ${key}: ${value.substring(0, 20)}...`)
    } else {
      console.log(`[AUTOTRADER-WEBHOOK]    ${key}: ${value}`)
    }
  })

  try {
    // Get raw body FIRST (before any verification) so we can log it even if verification fails
    rawBody = await request.text()
    console.log(`\n[AUTOTRADER-WEBHOOK] 📦 Raw Body (Logged BEFORE validation):`)
    console.log(`[AUTOTRADER-WEBHOOK]    Length: ${rawBody.length} bytes`)
    console.log(`[AUTOTRADER-WEBHOOK]    Preview (first 500 chars): ${rawBody.substring(0, 500)}`)
    
    // Try to parse and log payload structure (even if verification fails later)
    try {
      const parsedBody = JSON.parse(rawBody)
      console.log(`[AUTOTRADER-WEBHOOK]    ✅ Valid JSON structure`)
      console.log(`[AUTOTRADER-WEBHOOK]    Event Type: ${parsedBody.eventType || 'Not present'}`)
      console.log(`[AUTOTRADER-WEBHOOK]    Advertiser ID: ${parsedBody.advertiserId || 'Not present'}`)
      console.log(`[AUTOTRADER-WEBHOOK]    Integration ID: ${parsedBody.integrationId || 'Not present'}`)
      if (parsedBody.stockId) console.log(`[AUTOTRADER-WEBHOOK]    Stock ID: ${parsedBody.stockId}`)
      if (parsedBody.dealId) console.log(`[AUTOTRADER-WEBHOOK]    Deal ID: ${parsedBody.dealId}`)
    } catch {
      console.log(`[AUTOTRADER-WEBHOOK]    ⚠️  Invalid JSON or unable to parse`)
    }

    // Use your existing API secret key (NOT a separate webhook secret)
    // Following Autotrader's pattern: webhook signature uses the same API secret
    const SECRET_KEY = process.env.AUTOTRADER_SECRET

    console.log(`\n[AUTOTRADER-WEBHOOK] 📝 Step 1: Authentication Configuration`)
    console.log(`[AUTOTRADER-WEBHOOK]    ✅ API Secret: ${SECRET_KEY ? 'Configured' : 'Missing'}`)
    console.log(`[AUTOTRADER-WEBHOOK]    🔐 Using API secret for webhook signature verification`)

    if (!SECRET_KEY) {
      console.error(`\n[AUTOTRADER-WEBHOOK] ❌ ERROR: AUTOTRADER_SECRET is not set`)
      console.error(`[AUTOTRADER-WEBHOOK]    Request ID: ${requestId}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Webhook logged but cannot be verified due to missing API secret`)
      return NextResponse.json(
        { 
          error: 'API secret not configured',
          message: 'AUTOTRADER_SECRET must be set in environment variables. This is your Autotrader API secret key.',
          requestId
        },
        { status: 500 }
      )
    }
    
    // Get signature from headers (Autotrader sends it as 'autotrader-signature')
    const signatureHeader = 
      request.headers.get('autotrader-signature') ||
      request.headers.get('x-autotrader-signature') ||
      request.headers.get('x-autotrader-hash') ||
      request.headers.get('x-webhook-hash') ||
      request.headers.get('x-signature')

    console.log(`\n[AUTOTRADER-WEBHOOK] 📋 Step 2: Headers Check`)
    console.log(`[AUTOTRADER-WEBHOOK]    Signature Header Found: ${signatureHeader ? 'Yes' : 'No'}`)
    if (signatureHeader) {
      console.log(`[AUTOTRADER-WEBHOOK]    Signature (first 20 chars): ${signatureHeader.substring(0, 20)}...`)
    } else {
      console.log(`[AUTOTRADER-WEBHOOK]    ⚠️  Checked headers: autotrader-signature, x-autotrader-signature, x-autotrader-hash, x-webhook-hash, x-signature`)
    }
    
    // Check for timestamp header
    const timestampHeader = 
      request.headers.get('t') ||
      request.headers.get('x-timestamp') ||
      request.headers.get('timestamp') ||
      request.headers.get('autotrader-timestamp')
    console.log(`[AUTOTRADER-WEBHOOK]    Timestamp Header Found: ${timestampHeader ? 'Yes' : 'No'}`)
    if (timestampHeader) {
      console.log(`[AUTOTRADER-WEBHOOK]    Timestamp Value: ${timestampHeader}`)
    }
    
    console.log(`[AUTOTRADER-WEBHOOK]    Content-Type: ${request.headers.get('content-type') || 'Not set'}`)
    console.log(`[AUTOTRADER-WEBHOOK]    User-Agent: ${request.headers.get('user-agent') || 'Not set'}`)
    console.log(`[AUTOTRADER-WEBHOOK]    X-Forwarded-For: ${request.headers.get('x-forwarded-for') || 'Not set'}`)

    if (!signatureHeader) {
      console.error(`\n[AUTOTRADER-WEBHOOK] ❌ ERROR: Missing signature header`)
      console.error(`[AUTOTRADER-WEBHOOK]    Request ID: ${requestId}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Full raw body was logged above for debugging`)
      console.error(`[AUTOTRADER-WEBHOOK]    Webhook logged but rejected due to missing signature header`)
      return NextResponse.json(
        { 
          error: 'Missing signature header',
          message: 'Webhook request must include autotrader-signature header',
          requestId
        },
        { status: 400 }
      )
    }

    // Get timestamp from headers (Autotrader sends timestamp for hash calculation)
    const timestamp = 
      request.headers.get('t') ||
      request.headers.get('x-timestamp') ||
      request.headers.get('timestamp') ||
      request.headers.get('autotrader-timestamp')

    console.log(`\n[AUTOTRADER-WEBHOOK] 🔐 Step 3: Signature Verification`)
    console.log(`[AUTOTRADER-WEBHOOK]    Timestamp Header Found: ${timestamp ? 'Yes' : 'No'}`)
    if (timestamp) {
      console.log(`[AUTOTRADER-WEBHOOK]    Timestamp Value: ${timestamp}`)
    }

    if (!timestamp) {
      console.error(`\n[AUTOTRADER-WEBHOOK] ❌ ERROR: Missing timestamp header`)
      console.error(`[AUTOTRADER-WEBHOOK]    Request ID: ${requestId}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Autotrader requires timestamp (t) header for signature calculation`)
      console.error(`[AUTOTRADER-WEBHOOK]    Checked headers: t, x-timestamp, timestamp, autotrader-timestamp`)
      console.error(`[AUTOTRADER-WEBHOOK]    Webhook logged but rejected due to missing timestamp header`)
      return NextResponse.json(
        { 
          error: 'Missing timestamp header',
          message: 'Webhook request must include timestamp (t) header for signature verification',
          requestId
        },
        { status: 400 }
      )
    }

    // Verify signature using Autotrader's pattern:
    // Hash = HMAC-SHA256(secret, timestamp + "." + body)
    // Example: "1623882082" + "." + '{"id": "123"}'
    const stringToHash = `${timestamp}.${rawBody}`
    console.log(`[AUTOTRADER-WEBHOOK]    String to hash: ${stringToHash.substring(0, 100)}... (truncated)`)
    
    const expectedSignature = crypto
      .createHmac('sha256', SECRET_KEY)
      .update(stringToHash)
      .digest('hex')

    console.log(`[AUTOTRADER-WEBHOOK]    Calculated Signature (first 20 chars): ${expectedSignature.substring(0, 20)}...`)
    console.log(`[AUTOTRADER-WEBHOOK]    Received Signature (first 20 chars): ${signatureHeader.substring(0, 20)}...`)
    console.log(`[AUTOTRADER-WEBHOOK]    Formula: HMAC-SHA256(secret, "${timestamp}.${rawBody.substring(0, 50)}...")`)

    // Use constant-time comparison to prevent timing attacks
    const isValidSignature = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signatureHeader)
    )

    if (!isValidSignature) {
      console.error(`\n[AUTOTRADER-WEBHOOK] ❌ ERROR: Signature verification failed`)
      console.error(`[AUTOTRADER-WEBHOOK]    Request ID: ${requestId}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Expected: ${expectedSignature}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Received: ${signatureHeader}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Timestamp: ${timestamp}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Body Length: ${rawBody.length} bytes`)
      console.error(`[AUTOTRADER-WEBHOOK]    Full Body: ${rawBody}`)
      console.error(`[AUTOTRADER-WEBHOOK]    String Hashed: ${timestamp}.${rawBody}`)
      console.error(`[AUTOTRADER-WEBHOOK]    ⚠️  Webhook logged but rejected due to signature mismatch`)
      console.error(`[AUTOTRADER-WEBHOOK]    This could indicate:`)
      console.error(`[AUTOTRADER-WEBHOOK]    - Wrong API secret configured`)
      console.error(`[AUTOTRADER-WEBHOOK]    - Wrong timestamp used`)
      console.error(`[AUTOTRADER-WEBHOOK]    - Request not from Autotrader`)
      console.error(`[AUTOTRADER-WEBHOOK]    - Body was modified in transit`)
      return NextResponse.json(
        { 
          error: 'Invalid webhook signature',
          message: 'Webhook signature verification failed. Request did not originate from Autotrader.',
          requestId,
          debug: process.env.NODE_ENV === 'development' ? {
            expectedSignature,
            receivedSignature: signatureHeader,
            timestamp,
            bodyLength: rawBody.length
          } : undefined
        },
        { status: 403 }
      )
    }

    console.log(`[AUTOTRADER-WEBHOOK]    ✅ Signature verified successfully`)

    // Parse notification payload
    console.log(`\n[AUTOTRADER-WEBHOOK] 📄 Step 4: Payload Parsing`)
    try {
      notification = JSON.parse(rawBody) as AutotraderNotification
      console.log(`[AUTOTRADER-WEBHOOK]    ✅ JSON parsed successfully`)
      console.log(`[AUTOTRADER-WEBHOOK]    Event Type: ${notification.eventType || 'Not set'}`)
      console.log(`[AUTOTRADER-WEBHOOK]    Advertiser ID: ${notification.advertiserId || 'Not set'}`)
      console.log(`[AUTOTRADER-WEBHOOK]    Integration ID: ${notification.integrationId || 'Not set'}`)
      if (notification.stockId) {
        console.log(`[AUTOTRADER-WEBHOOK]    Stock ID: ${notification.stockId || 'Not set'}`)
      }
      if (notification.dealId) {
        console.log(`[AUTOTRADER-WEBHOOK]    Deal ID: ${notification.dealId || 'Not set'}`)
      }
      console.log(`[AUTOTRADER-WEBHOOK]    Timestamp: ${notification.timestamp || 'Not set'}`)
    } catch (error) {
      console.error(`\n[AUTOTRADER-WEBHOOK] ❌ ERROR: Failed to parse JSON payload`)
      console.error(`[AUTOTRADER-WEBHOOK]    Request ID: ${requestId}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Error:`, error)
      console.error(`[AUTOTRADER-WEBHOOK]    Full Raw Body: ${rawBody}`)
      console.error(`[AUTOTRADER-WEBHOOK]    ⚠️  Webhook logged but rejected due to invalid JSON`)
      return NextResponse.json(
        { 
          error: 'Invalid JSON payload',
          message: 'Failed to parse webhook payload as JSON',
          requestId
        },
        { status: 400 }
      )
    }

    // Validate required fields
    console.log(`\n[AUTOTRADER-WEBHOOK] ✅ Step 5: Payload Validation`)
    if (!notification.eventType) {
      console.error(`[AUTOTRADER-WEBHOOK]    ❌ Missing required field: eventType`)
      console.error(`[AUTOTRADER-WEBHOOK]    Full Payload:`, JSON.stringify(notification, null, 2))
      console.error(`[AUTOTRADER-WEBHOOK]    ⚠️  Webhook logged but rejected due to missing eventType`)
      return NextResponse.json(
        { 
          error: 'Missing required field: eventType',
          message: 'Webhook payload must include eventType field',
          requestId
        },
        { status: 400 }
      )
    }
    console.log(`[AUTOTRADER-WEBHOOK]    ✅ eventType: ${notification.eventType}`)

    if (!notification.advertiserId) {
      console.error(`[AUTOTRADER-WEBHOOK]    ❌ Missing required field: advertiserId`)
      console.error(`[AUTOTRADER-WEBHOOK]    Full Payload:`, JSON.stringify(notification, null, 2))
      console.error(`[AUTOTRADER-WEBHOOK]    ⚠️  Webhook logged but rejected due to missing advertiserId`)
      return NextResponse.json(
        { 
          error: 'Missing required field: advertiserId',
          message: 'Webhook payload must include advertiserId field',
          requestId
        },
        { status: 400 }
      )
    }
    console.log(`[AUTOTRADER-WEBHOOK]    ✅ advertiserId: ${notification.advertiserId}`)

    // Verify webhook came from your integration
    // Check integrationId in payload matches your stored integration ID
    console.log(`\n[AUTOTRADER-WEBHOOK] 🔍 Step 6: Integration ID Verification`)
    if (notification.integrationId) {
      const integrationIdFromPayload = notification.integrationId
      console.log(`[AUTOTRADER-WEBHOOK]    Integration ID from payload: ${integrationIdFromPayload}`)
      
      // Look up the integration ID for this advertiser
      const dealerConfig = await db
        .select({
          autotraderIntegrationId: storeConfig.autotraderIntegrationId,
        })
        .from(storeConfig)
        .where(
          or(
            eq(storeConfig.primaryAdvertisementId, notification.advertiserId),
            eq(storeConfig.advertisementId, notification.advertiserId)
          )
        )
        .limit(1)

      if (dealerConfig.length > 0 && dealerConfig[0].autotraderIntegrationId) {
        const ownIntegrationId = dealerConfig[0].autotraderIntegrationId
        console.log(`[AUTOTRADER-WEBHOOK]    Stored Integration ID: ${ownIntegrationId}`)
        
        if (integrationIdFromPayload !== ownIntegrationId) {
          console.error(`[AUTOTRADER-WEBHOOK]    ❌ Integration ID mismatch`)
          console.error(`[AUTOTRADER-WEBHOOK]       Received: ${integrationIdFromPayload}`)
          console.error(`[AUTOTRADER-WEBHOOK]       Expected: ${ownIntegrationId}`)
          console.error(`[AUTOTRADER-WEBHOOK]       Full Payload:`, JSON.stringify(notification, null, 2))
          console.error(`[AUTOTRADER-WEBHOOK]    ⚠️  Webhook logged but rejected due to integration ID mismatch`)
          return NextResponse.json(
            { 
              error: 'Integration ID mismatch',
              message: 'Webhook integration ID does not match your integration configuration',
              requestId
            },
            { status: 403 }
          )
        }
        
        console.log(`[AUTOTRADER-WEBHOOK]    ✅ Integration ID verified successfully`)
      } else {
        console.warn(`[AUTOTRADER-WEBHOOK]    ⚠️  No integration ID found in database for advertiser: ${notification.advertiserId}`)
        console.warn(`[AUTOTRADER-WEBHOOK]    ⚠️  Skipping integration ID verification`)
      }
    } else {
      console.warn(`[AUTOTRADER-WEBHOOK]    ⚠️  No integrationId in webhook payload`)
      console.warn(`[AUTOTRADER-WEBHOOK]    ⚠️  Skipping integration ID verification`)
    }

    // Log the complete payload for analysis
    console.log(`\n[AUTOTRADER-WEBHOOK] 📦 Step 7: Complete Payload Log`)
    console.log(`[AUTOTRADER-WEBHOOK]    Full Payload (prettified):`)
    console.log(JSON.stringify(notification, null, 2).split('\n').map(line => `[AUTOTRADER-WEBHOOK]    ${line}`).join('\n'))

    const processingTime = Date.now() - startTime
    console.log(`\n${'='.repeat(80)}`)
    console.log(`[AUTOTRADER-WEBHOOK] ✅ WEBHOOK LOGGED SUCCESSFULLY`)
    console.log(`${'='.repeat(80)}`)
    console.log(`[AUTOTRADER-WEBHOOK] 📋 Request ID: ${requestId}`)
    console.log(`[AUTOTRADER-WEBHOOK] ⏱️  Processing Time: ${processingTime}ms`)
    console.log(`[AUTOTRADER-WEBHOOK] 📅 Completed At: ${new Date().toISOString()}`)
    console.log(`[AUTOTRADER-WEBHOOK] 📦 Event Type: ${notification.eventType}`)
    console.log(`[AUTOTRADER-WEBHOOK] 🏢 Advertiser ID: ${notification.advertiserId}`)
    console.log(`[AUTOTRADER-WEBHOOK] 🔗 Integration ID: ${notification.integrationId || 'Not present'}`)
    console.log(`[AUTOTRADER-WEBHOOK] 📝 Status: Logged and verified - No processing performed`)
    console.log(`${'='.repeat(80)}\n`)

    // Return 2XX status code as required by Autotrader
    return NextResponse.json(
      { 
        success: true,
        message: 'Webhook logged successfully - No processing performed',
        requestId,
        eventType: notification.eventType,
        advertiserId: notification.advertiserId,
        integrationId: notification.integrationId,
        processingTimeMs: processingTime,
        note: 'This webhook was logged but not processed. Check server logs for details.'
      },
      { status: 200 }
    )

  } catch (error: unknown) {
    const processingTime = Date.now() - startTime
    console.error(`\n${'='.repeat(80)}`)
    console.error(`[AUTOTRADER-WEBHOOK] ❌ WEBHOOK LOGGING FAILED`)
    console.error(`${'='.repeat(80)}`)
    console.error(`[AUTOTRADER-WEBHOOK] 📋 Request ID: ${requestId}`)
    console.error(`[AUTOTRADER-WEBHOOK] ⏱️  Processing Time: ${processingTime}ms`)
    console.error(`[AUTOTRADER-WEBHOOK] 📅 Failed At: ${new Date().toISOString()}`)
    console.error(`\n[AUTOTRADER-WEBHOOK] 💥 Error Details:`)
    if (error instanceof Error) {
      console.error(`[AUTOTRADER-WEBHOOK]    Message: ${error.message}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Type: ${error.constructor?.name || 'Error'}`)
      if (error.stack) {
        console.error(`\n[AUTOTRADER-WEBHOOK] 📚 Stack Trace:`)
        console.error(error.stack)
      }
    } else {
      console.error(`[AUTOTRADER-WEBHOOK]    Message: Unknown error`)
      console.error(`[AUTOTRADER-WEBHOOK]    Error:`, error)
    }
    console.error(`\n[AUTOTRADER-WEBHOOK] 📦 Request Info:`)
    console.error(`[AUTOTRADER-WEBHOOK]    URL: ${request.url}`)
    console.error(`[AUTOTRADER-WEBHOOK]    Method: ${request.method}`)
    if (notification) {
      console.error(`[AUTOTRADER-WEBHOOK]    Event Type: ${notification.eventType || 'Unknown'}`)
      console.error(`[AUTOTRADER-WEBHOOK]    Advertiser ID: ${notification.advertiserId || 'Unknown'}`)
    }
    console.error(`[AUTOTRADER-WEBHOOK]    Raw Body Length: ${rawBody.length || 0} bytes`)
    if (rawBody) {
      console.error(`[AUTOTRADER-WEBHOOK]    Raw Body: ${rawBody}`)
    }
    console.error(`${'='.repeat(80)}\n`)

    // Return 500 for internal errors
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: 'Failed to log webhook notification',
        requestId,
        processingTimeMs: processingTime,
        details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * Handle OPTIONS request for CORS preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, autotrader-signature, x-autotrader-signature, x-autotrader-hash, x-webhook-hash, x-signature',
    },
  })
}

/**
 * GET endpoint for webhook status/health check
 */
export async function GET() {
  return NextResponse.json({
    message: 'Autotrader webhook endpoint (Logging Only)',
    status: 'active',
    mode: 'logging-only',
    note: 'This endpoint only logs webhooks and verifies signatures. No processing is performed.',
    supportedEventTypes: {
      stock: [
        'stock.created',
        'stock.updated',
        'stock.media.updated',
        'stock.price.changed',
        'stock.reserved',
        'stock.sold',
        'stock.deleted',
        'stock.feature.updated'
      ],
      deal: [
        'deal.created',
        'deal.updated',
        'deal.component.changed',
        'deal.cancelled',
        'deal.completed'
      ]
    },
    authentication: {
      method: 'Hash-based (HMAC-SHA256)',
      secretSource: 'API Secret (AUTOTRADER_SECRET)',
      headers: [
        'autotrader-signature (primary)',
        'x-autotrader-signature',
        'x-autotrader-hash',
        'x-webhook-hash',
        'x-signature'
      ],
      apiSecretConfigured: !!process.env.AUTOTRADER_SECRET,
      verification: [
        '1. Extract timestamp from header (t)',
        '2. Concatenate: timestamp + "." + raw_body',
        '3. Verify signature using API secret: HMAC-SHA256(secret, concatenated_string)',
        '4. Verify integrationId in payload matches stored integration ID',
        '5. Verify advertiserId exists in system',
        '6. Log everything to console'
      ],
      example: 'HMAC-SHA256(secret, "1623882082.{\\"id\\": \\"123\\"}")',
      note: 'Uses AUTOTRADER_SECRET (your API secret key) for webhook signature verification'
    },
    logging: {
      enabled: true,
      includes: [
        'All headers',
        'Raw body',
        'Parsed payload',
        'Verification steps',
        'Integration ID verification',
        'Complete payload dump'
      ]
    },
    documentation: {
      stockSync: 'https://help.autotrader.co.uk/hc/en-gb/articles/21846314775453-Introduction-to-Stock-Sync',
      dealSync: 'https://help.autotrader.co.uk/hc/en-gb/articles/21944941459485-Introduction-to-Deal-Sync',
      goLiveChecks: 'https://help.autotrader.co.uk/hc/en-gb/articles/22673947111325-Go-Live-checks-for-Stock-Sync'
    }
  })
}
