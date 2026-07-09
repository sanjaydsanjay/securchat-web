import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'
import { verifyAuth } from '../_shared/auth.ts'
import { createSupabaseAdmin } from '../_shared/supabase.ts'
// Deno native npm import for web-push
import webpush from 'npm:web-push@3.6.7'

interface PushRequest {
  receiver_id: number
  chat_id: string
  message_id: string
  content_preview: string // Short preview, no sensitive/encrypted data
  sender_name: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()
  let notificationsSent = 0
  let notificationsFailed = 0

  try {
    // 1. Verify JWT & Security
    const user = await verifyAuth(req)
    const body: PushRequest = await req.json()
    
    if (!body.receiver_id || !body.chat_id || !body.message_id) {
      throw new Error('receiver_id, chat_id, and message_id are required')
    }

    const supabaseAdmin = createSupabaseAdmin()

    // 2. Configure VAPID Details securely via Deno.env
    // These keys must be generated once using webpush.generateVAPIDKeys()
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
    const vapidSubject = Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@securechat.com'

    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('VAPID keys are not configured in environment')
    }

    webpush.setVapidDetails(
      vapidSubject,
      vapidPublicKey,
      vapidPrivateKey
    )

    // 3. Fetch Active Subscriptions for the Receiver
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from('web_push_subscriptions')
      .select('*')
      .eq('user_unique_id', body.receiver_id)
      .eq('is_active', true)

    if (subError) throw subError

    if (!subscriptions || subscriptions.length === 0) {
      // User has no active web push subscriptions, exit gracefully
      return new Response(JSON.stringify({
        success: true,
        stats: { notifications_sent: 0, notifications_failed: 0, execution_time_ms: Date.now() - startTime },
        message: 'No active push subscriptions found for receiver.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 })
    }

    // 4. Construct Push Payload
    // The Service Worker will handle the logic of "don't show if tab is active"
    const pushPayload = JSON.stringify({
      title: `New message from ${body.sender_name}`,
      body: body.content_preview, // Short preview only
      data: {
        chat_id: body.chat_id,
        message_id: body.message_id,
        url: `/chat/${body.chat_id}` // Click action destination
      }
    })

    // 5. Send Web Push to all registered browser instances concurrently
    const pushPromises = subscriptions.map(async (sub) => {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        }
        
        await webpush.sendNotification(pushSubscription, pushPayload)
        
        // Update last_used_at on success
        await supabaseAdmin
          .from('web_push_subscriptions')
          .update({ last_used_at: new Date().toISOString() })
          .eq('id', sub.id)

        notificationsSent++
      } catch (err: any) {
        notificationsFailed++
        
        // If the subscription is gone/expired (410 or 404), mark it inactive or delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from('web_push_subscriptions')
            .delete()
            .eq('id', sub.id)
        } else {
          console.error(`Push failure for endpoint ${sub.endpoint}:`, err)
        }
      }
    })

    await Promise.all(pushPromises)

    // 6. Audit Logging
    if (notificationsSent > 0 || notificationsFailed > 0) {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'notification.web_push_sent',
        resource_type: 'push_subscription',
        resource_id: body.chat_id,
        description: `Sent Web Push: ${notificationsSent} succeeded, ${notificationsFailed} failed`,
        metadata: { receiver_id: body.receiver_id, chat_id: body.chat_id }
      })
    }

    // 7. Return Statistics
    return new Response(JSON.stringify({
      success: true,
      stats: {
        notifications_sent: notificationsSent,
        notifications_failed: notificationsFailed,
        execution_time_ms: Date.now() - startTime
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return handleError(error)
  }
})

/*
 * ==========================================
 * DEPLOYMENT & SETUP INSTRUCTIONS
 * ==========================================
 * 
 * 1. Generate VAPID Keys securely (run this locally in Node.js):
 *    > npx web-push generate-vapid-keys
 * 
 * 2. Set the secrets in Supabase:
 *    > supabase secrets set VAPID_PUBLIC_KEY="your-public-key"
 *    > supabase secrets set VAPID_PRIVATE_KEY="your-private-key"
 *    > supabase secrets set VAPID_SUBJECT="mailto:your-email@securechat.com"
 * 
 * 3. Deploy the Edge Function:
 *    > supabase functions deploy push-notification --no-verify-jwt
 * 
 * Note: --no-verify-jwt is used because we perform strict custom JWT verification 
 * inside the function via `verifyAuth` to ensure proper user identity.
 */
