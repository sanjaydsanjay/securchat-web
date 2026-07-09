import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'
import { createSupabaseAdmin } from '../_shared/supabase.ts'

const BATCH_SIZE = 100

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // 1. Secure the function with CRON_SECRET
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  const supabaseAdmin = createSupabaseAdmin()
  
  try {
    // 2. Atomic selection to prevent duplicate sends (Idempotency + pseudo-transactions)
    // By updating to 'processing' with a RETURNING clause (which .select() handles),
    // we lock these rows for this specific execution context.
    const { data: processingMessages, error: lockError } = await supabaseAdmin
      .from('scheduled_messages')
      .update({ status: 'processing' })
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString())
      .limit(BATCH_SIZE)
      .select()

    if (lockError) {
      throw new Error(`Failed to lock scheduled messages: ${lockError.message}`)
    }

    if (!processingMessages || processingMessages.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        stats: {
          messages_sent: 0,
          execution_time_ms: Date.now() - startTime,
          errors: 0
        },
        message: 'No pending scheduled messages found.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Fetch related chats to determine the receiver IDs
    const chatIds = [...new Set(processingMessages.map(m => m.chat_id))]
    const { data: chats, error: chatsError } = await supabaseAdmin
      .from('chats')
      .select('id, participant_1_id, participant_2_id')
      .in('id', chatIds)

    if (chatsError) {
      throw new Error(`Failed to fetch chats: ${chatsError.message}`)
    }

    const chatMap = new Map(chats?.map(c => [c.id, c]) || [])
    
    const messagesToInsert = []
    const auditLogsToInsert = []
    const processedIds = []
    let errorsCount = 0

    // 4. Prepare data for bulk insert
    for (const sm of processingMessages) {
      const chat = chatMap.get(sm.chat_id)
      if (!chat) {
        console.error(`Chat not found for scheduled message ${sm.id}`)
        errorsCount++
        continue
      }

      const receiverId = chat.participant_1_id === sm.sender_unique_id 
        ? chat.participant_2_id 
        : chat.participant_1_id

      messagesToInsert.push({
        chat_id: sm.chat_id,
        sender_unique_id: sm.sender_unique_id,
        receiver_unique_id: receiverId,
        content: sm.content,
        content_type: sm.content_type || 'text',
        media_url: sm.media_url,
        e2e_encrypted: false, // Scheduled messages currently don't support E2E due to offline derivation needs
      })

      processedIds.push(sm.id)

      auditLogsToInsert.push({
        action: 'message.scheduled_sent',
        resource_type: 'scheduled_message',
        resource_id: sm.id,
        description: 'Scheduled message successfully delivered to chat',
        old_values: sm
      })
    }

    // 5. Insert actual messages
    // Note: Inserting into the public.messages table will automatically trigger 
    // Supabase Realtime for the connected clients listening to that chat_id.
    let insertErrorStr = null
    if (messagesToInsert.length > 0) {
      const { error: insertError } = await supabaseAdmin
        .from('messages')
        .insert(messagesToInsert)
      
      if (insertError) insertErrorStr = insertError.message
    }

    // 6. Finalize Status and Audit Logs
    if (insertErrorStr) {
      // Rollback status to failed if insert failed
      await supabaseAdmin
        .from('scheduled_messages')
        .update({ status: 'failed', error_message: insertErrorStr })
        .in('id', processedIds)
      
      errorsCount += processedIds.length
      console.error('Failed to insert messages:', insertErrorStr)
    } else if (processedIds.length > 0) {
      // Mark as sent
      await supabaseAdmin
        .from('scheduled_messages')
        .update({ status: 'sent' })
        .in('id', processedIds)

      // Log actions to audit_logs
      await supabaseAdmin
        .from('audit_logs')
        .insert(auditLogsToInsert)
    }

    return new Response(JSON.stringify({
      success: true,
      stats: {
        messages_sent: insertErrorStr ? 0 : processedIds.length,
        execution_time_ms: Date.now() - startTime,
        errors: errorsCount
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
 * DEPLOYMENT STEPS
 * ==========================================
 * 1. Set the cron security secret in Supabase:
 *    supabase secrets set CRON_SECRET=your_super_secret_string
 * 2. Deploy Function:
 *    supabase functions deploy scheduled-messages --no-verify-jwt
 * 
 * ==========================================
 * PG_CRON CONFIGURATION (Execute via SQL Editor or Migration)
 * ==========================================
 * To run this function automatically every minute:
 * 
 * SELECT cron.schedule(
 *   'invoke_scheduled_messages_edge_function',
 *   '* * * * *', -- Every minute
 *   $$
 *   SELECT net.http_post(
 *       url:='https://<PROJECT_REF>.supabase.co/functions/v1/scheduled-messages',
 *       headers:='{"Content-Type": "application/json", "Authorization": "Bearer your_super_secret_string"}'::jsonb
 *   )
 *   $$
 * );
 * 
 * Note: Ensure the 'pg_net' extension is enabled.
 */
