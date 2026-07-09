import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'
import { createSupabaseAdmin } from '../_shared/supabase.ts'

// Verify Razorpay webhook signature (HMAC SHA256)
async function verifyRazorpaySignature(body: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const hashArray = Array.from(new Uint8Array(signatureBuffer))
  const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  
  return expectedSignature === signature
}

// Calculate messages based on plan
function getPlanMessages(plan: string): number {
  switch (plan.toLowerCase()) {
    case 'basic': return 2500
    case 'standard': return 5000
    case 'premium': return 10000
    case 'enterprise': return 100000
    default: return 0
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createSupabaseAdmin()

  try {
    const rawBody = await req.text()
    const signature = req.headers.get('x-razorpay-signature')
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET')

    if (!signature || !webhookSecret) {
      return new Response('Missing signature or secret', { status: 400 })
    }

    // 1. Verify Signature
    const isValid = await verifyRazorpaySignature(rawBody, signature, webhookSecret)
    if (!isValid) {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'payment.webhook_failed',
        resource_type: 'webhook',
        description: 'Invalid Razorpay webhook signature received',
        metadata: { ip: req.headers.get('x-forwarded-for') }
      })
      return new Response('Invalid Signature', { status: 400 })
    }

    // 2. Parse Payload
    const payload = JSON.parse(rawBody)
    const event = payload.event
    const paymentEntity = payload.payload.payment?.entity || {}
    const subscriptionEntity = payload.payload.subscription?.entity || {}

    // Extract custom notes passed during order creation (contains user_id and plan)
    const notes = paymentEntity.notes || subscriptionEntity.notes || {}
    const userUniqueId = notes.user_unique_id ? parseInt(notes.user_unique_id, 10) : null
    const planName = notes.plan || 'basic'
    
    const paymentId = paymentEntity.id
    const orderId = paymentEntity.order_id || subscriptionEntity.id

    if (!orderId) {
      return new Response('Missing order/subscription ID', { status: 400 })
    }

    // 3. Idempotency Check: Skip if payment ID already verified/processed
    if (paymentId) {
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('status')
        .eq('razorpay_payment_id', paymentId)
        .single()

      if (existingPayment && (existingPayment.status === 'verified' || existingPayment.status === 'failed')) {
        return new Response('Event already processed', { status: 200 }) // Return 200 so Razorpay stops retrying
      }
    }

    // 4. Process Events
    let paymentStatus = 'pending'
    let shouldUpgradeUser = false

    switch (event) {
      case 'payment.captured':
        paymentStatus = 'verified'
        shouldUpgradeUser = true
        break
      case 'payment.failed':
        paymentStatus = 'failed'
        break
      case 'subscription.activated':
      case 'subscription.completed':
        paymentStatus = 'verified'
        shouldUpgradeUser = true
        break
      case 'subscription.cancelled':
        paymentStatus = 'failed'
        shouldUpgradeUser = false
        // In a real app, downgrade user logic might apply here
        break
      default:
        // Acknowledge unhandled events gracefully
        return new Response('Event not handled', { status: 200 })
    }

    // 5. Update or Insert into `payments` table
    if (userUniqueId) {
      const { error: upsertError } = await supabaseAdmin
        .from('payments')
        .upsert({
          user_unique_id: userUniqueId,
          plan: planName,
          amount: paymentEntity.amount ? paymentEntity.amount / 100 : 0, // Razorpay amounts are in paise
          currency: paymentEntity.currency || 'INR',
          status: paymentStatus,
          payment_method: 'razorpay',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId || orderId, // Fallback for pure subscription events
          razorpay_signature: signature,
          verified_at: paymentStatus === 'verified' ? new Date().toISOString() : null
        }, { onConflict: 'razorpay_order_id' })

      if (upsertError) throw upsertError

      // 6. Upgrade User Tier if successful
      if (shouldUpgradeUser) {
        // Fetch current quota to append
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('message_quota')
          .eq('unique_id', userUniqueId)
          .single()

        const currentQuota = user?.message_quota || 0
        const extraMessages = getPlanMessages(planName)

        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({
            premium_tier: planName,
            message_quota: currentQuota + extraMessages
          })
          .eq('unique_id', userUniqueId)

        if (userError) throw userError
      }
    }

    // 7. Audit Log
    await supabaseAdmin.from('audit_logs').insert({
      action: `payment.${event}`,
      resource_type: 'payment',
      resource_id: orderId,
      description: `Razorpay webhook processed: ${event} for user ${userUniqueId || 'unknown'}`,
      metadata: { event, payment_id: paymentId, order_id: orderId, status: paymentStatus }
    })

    return new Response(JSON.stringify({ success: true, event, status: paymentStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Webhook error:', error)
    return handleError(error)
  }
})

/*
 * ==========================================
 * DEPLOYMENT & SETUP INSTRUCTIONS
 * ==========================================
 * 
 * 1. Set the Razorpay Webhook Secret in Supabase:
 *    supabase secrets set RAZORPAY_WEBHOOK_SECRET="your_razorpay_secret"
 * 
 * 2. Deploy the Edge Function:
 *    supabase functions deploy payment-webhook --no-verify-jwt
 * 
 * 3. Configure Razorpay Dashboard:
 *    - Go to Razorpay Dashboard -> Account & Settings -> Webhooks.
 *    - Add Webhook URL: https://<PROJECT_REF>.supabase.co/functions/v1/payment-webhook
 *    - Enter the same Secret you set in step 1.
 *    - Subscribe to these events:
 *      - payment.captured
 *      - payment.failed
 *      - subscription.activated
 *      - subscription.cancelled
 *      - subscription.completed
 * 
 * 4. Pass User Metadata in Frontend:
 *    When creating the Razorpay order/subscription in the frontend, ENSURE you pass 
 *    the user unique ID and plan name in the `notes` object:
 *    {
 *      "notes": {
 *        "user_unique_id": "123456",
 *        "plan": "premium"
 *      }
 *    }
 */
