import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createSupabaseAdmin } from '../_shared/supabase.ts'
import { getCorsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const supabaseAdmin = createSupabaseAdmin()

  try {
    const { action, ...params } = await req.json()

    switch (action) {
      case 'create-order': {
        const { amount, plan_name } = params

        const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')
        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')

        if (!razorpayKeyId || !razorpayKeySecret) {
          return new Response(
            JSON.stringify({ error: 'Razorpay not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const basicAuth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`)

        const response = await fetch('https://api.razorpay.com/v1/orders', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${basicAuth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount: amount * 100,
            currency: 'INR',
            receipt: `order_${Date.now()}`,
            notes: {
              plan: plan_name,
            },
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          throw new Error(`Razorpay API error: ${response.status} ${errorText}`)
        }

        const order = await response.json()

        const authHeader = req.headers.get('authorization')
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '')
          const { data: { user } } = await supabaseAdmin.auth.getUser(token)
          if (user) {
            await supabaseAdmin.from('razorpay_transactions').insert({
              user_id: user.id,
              order_id: order.id,
              plan_name: plan_name || 'PREMIUM BASIC',
              amount: amount,
              status: 'created',
            })
          }
        }

        return new Response(
          JSON.stringify({ orderId: order.id, amount: order.amount, currency: order.currency }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'verify': {
        const { order_id, payment_id, signature } = params

        const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')
        if (!razorpayKeySecret) {
          return new Response(
            JSON.stringify({ error: 'Razorpay not configured' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const body = `${order_id}|${payment_id}`
        const encoder = new TextEncoder()
        const key = await crypto.subtle.importKey(
          'raw',
          encoder.encode(razorpayKeySecret),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        )
        const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
        const hashArray = Array.from(new Uint8Array(signatureBuffer))
        const expectedSignature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

        if (expectedSignature !== signature) {
          return new Response(
            JSON.stringify({ success: false, error: 'Invalid signature' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const authHeader = req.headers.get('authorization')
        if (authHeader) {
          const token = authHeader.replace('Bearer ', '')
          const { data: { user } } = await supabaseAdmin.auth.getUser(token)
          if (user) {
            const { data: txn } = await supabaseAdmin
              .from('razorpay_transactions')
              .select('plan_name')
              .eq('order_id', order_id)
              .single()

            const planName = txn?.plan_name || 'PREMIUM BASIC'

            await supabaseAdmin.from('razorpay_transactions')
              .update({
                payment_id,
                signature,
                status: 'verified',
              })
              .eq('order_id', order_id)

            const premiumTier = planName === 'PREMIUM BASIC' ? 'premium_basic'
              : planName === 'PREMIUM STANDARD' ? 'premium_standard'
              : 'premium_pro'

            await supabaseAdmin.from('users')
              .update({
                is_premium: true,
                is_trial_active: false,
                premium_tier: premiumTier,
                plan_name: planName,
                payment_status: 'success',
                payment_reference: payment_id,
                payment_method: 'razorpay',
                payment_date: new Date().toISOString(),
                premium_activated_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq('auth_id', user.id)
          }
        }

        return new Response(
          JSON.stringify({ success: true }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Unknown action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
  } catch (error) {
    console.error('Razorpay handler error:', error)
    return handleError(error)
  }
})
