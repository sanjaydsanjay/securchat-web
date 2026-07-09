import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'
import { createSupabaseAdmin } from '../_shared/supabase.ts'

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

function getPlanDurationDays(planName: string): number {
  switch (planName.toLowerCase()) {
    case 'premium_basic':
    case 'premium basic': return 25
    case 'premium_standard':
    case 'premium standard': return 45
    case 'premium_pro':
    case 'premium pro': return 60
    default: return 0
  }
}

function getPremiumTier(planName: string): string {
  switch (planName.toLowerCase()) {
    case 'premium_basic':
    case 'premium basic': return 'premium_basic'
    case 'premium_standard':
    case 'premium standard': return 'premium_standard'
    case 'premium_pro':
    case 'premium pro': return 'premium_pro'
    default: return 'free'
  }
}

function getPlanDisplayName(planName: string): string {
  switch (planName.toLowerCase()) {
    case 'premium_basic':
    case 'premium basic': return 'PREMIUM BASIC'
    case 'premium_standard':
    case 'premium standard': return 'PREMIUM STANDARD'
    case 'premium_pro':
    case 'premium pro': return 'PREMIUM PRO'
    default: return planName.toUpperCase()
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

    const isValid = await verifyRazorpaySignature(rawBody, signature, webhookSecret)
    if (!isValid) {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'payment.webhook_failed',
        resource_type: 'webhook',
        description: 'Invalid Razorpay webhook signature received',
        metadata: { ip: req.headers.get('x-forwarded-for') },
      })
      return new Response('Invalid Signature', { status: 400 })
    }

    const payload = JSON.parse(rawBody)
    const event = payload.event
    const paymentEntity = payload.payload.payment?.entity || {}
    const notes = paymentEntity.notes || {}
    const userUniqueId = notes.user_unique_id ? parseInt(notes.user_unique_id, 10) : null
    const planName = notes.plan || 'premium_basic'

    const paymentId = paymentEntity.id
    const orderId = paymentEntity.order_id || ''

    if (!orderId) {
      return new Response('Missing order ID', { status: 400 })
    }

    if (paymentId) {
      const { data: existingPayment } = await supabaseAdmin
        .from('payments')
        .select('status')
        .eq('razorpay_payment_id', paymentId)
        .single()

      if (existingPayment && (existingPayment.status === 'verified' || existingPayment.status === 'failed')) {
        return new Response('Event already processed', { status: 200 })
      }
    }

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
      default:
        return new Response('Event not handled', { status: 200 })
    }

    if (userUniqueId) {
      const { error: upsertError } = await supabaseAdmin
        .from('payments')
        .upsert({
          user_unique_id: userUniqueId,
          plan: getPremiumTier(planName),
          plan_name: getPlanDisplayName(planName),
          amount: paymentEntity.amount ? paymentEntity.amount / 100 : 0,
          currency: paymentEntity.currency || 'INR',
          status: paymentStatus,
          payment_method: 'razorpay',
          razorpay_order_id: orderId,
          razorpay_payment_id: paymentId || orderId,
          razorpay_signature: signature,
          verified_at: paymentStatus === 'verified' ? new Date().toISOString() : null,
        }, { onConflict: 'razorpay_order_id' })

      if (upsertError) throw upsertError

      if (shouldUpgradeUser) {
        const planDisplayName = getPlanDisplayName(planName)
        const newTier = getPremiumTier(planName)

        const { error: userError } = await supabaseAdmin
          .from('users')
          .update({
            is_premium: true,
            is_trial_active: false,
            premium_tier: newTier,
            plan_name: planDisplayName,
            payment_status: 'success',
            payment_reference: paymentId,
            payment_method: 'razorpay',
            payment_date: new Date().toISOString(),
            premium_activated_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('unique_id', userUniqueId)

        if (userError) throw userError
      }
    }

    await supabaseAdmin.from('audit_logs').insert({
      action: `payment.${event}`,
      resource_type: 'payment',
      resource_id: orderId,
      description: `Razorpay webhook processed: ${event} for user ${userUniqueId || 'unknown'}`,
      metadata: { event, payment_id: paymentId, order_id: orderId, status: paymentStatus },
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
