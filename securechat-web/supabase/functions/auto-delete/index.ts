import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { handleError } from '../_shared/errors.ts'
import { createSupabaseAdmin } from '../_shared/supabase.ts'

// Security: We intentionally DO NOT verify JWT for this function because 
// it will be invoked by pg_cron (or a secure server-to-server webhook), 
// which doesn't carry a user JWT. We rely on the Supabase Service Role key
// to bypass RLS and perform system-level deletions.

// Maximum number of loops to prevent Edge Function timeout (max 5 minutes)
const MAX_ITERATIONS = 10
const BATCH_SIZE = 100

// Helper to extract bucket and path from a generic media URL
function extractStorageInfo(mediaUrl: string | null) {
  if (!mediaUrl) return null
  if (mediaUrl.includes('chat-media/')) {
    return { bucket: 'chat-media', path: mediaUrl.substring(mediaUrl.indexOf('chat-media/') + 11) }
  } else if (mediaUrl.includes('voice-notes/')) {
    return { bucket: 'voice-notes', path: mediaUrl.substring(mediaUrl.indexOf('voice-notes/') + 12) }
  }
  return null
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // To prevent unauthorized triggers via the public edge function URL,
  // we require a shared secret passed in headers for cron jobs.
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const startTime = Date.now()
  const supabaseAdmin = createSupabaseAdmin()
  
  let messagesDeleted = 0
  let filesDeleted = 0
  let errors = 0
  let isDone = false

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // 1. Fetch expired messages
      const { data: messages, error: fetchError } = await supabaseAdmin
        .from('messages')
        .select('id, chat_id, media_url, content_type')
        .lt('expires_at', new Date().toISOString())
        .limit(BATCH_SIZE)

      if (fetchError) {
        console.error('Fetch error:', fetchError)
        errors++
        break // Stop on DB error
      }

      if (!messages || messages.length === 0) {
        isDone = true
        break // No more expired messages
      }

      // 2. Process media files for deletion
      const filesToDelete = {
        'chat-media': [] as string[],
        'voice-notes': [] as string[]
      }

      messages.forEach(msg => {
        const info = extractStorageInfo(msg.media_url)
        if (info && (info.bucket === 'chat-media' || info.bucket === 'voice-notes')) {
          filesToDelete[info.bucket].push(info.path)
        }
      })

      // Delete from chat-media
      if (filesToDelete['chat-media'].length > 0) {
        const { error: cmError } = await supabaseAdmin.storage
          .from('chat-media')
          .remove(filesToDelete['chat-media'])
        if (cmError) {
          console.error('Failed to delete chat-media files:', cmError)
          errors++
        } else {
          filesDeleted += filesToDelete['chat-media'].length
        }
      }

      // Delete from voice-notes
      if (filesToDelete['voice-notes'].length > 0) {
        const { error: vnError } = await supabaseAdmin.storage
          .from('voice-notes')
          .remove(filesToDelete['voice-notes'])
        if (vnError) {
          console.error('Failed to delete voice-notes:', vnError)
          errors++
        } else {
          filesDeleted += filesToDelete['voice-notes'].length
        }
      }

      // 3. Delete messages from database
      const messageIds = messages.map(m => m.id)
      const { error: deleteError } = await supabaseAdmin
        .from('messages')
        .delete()
        .in('id', messageIds)

      if (deleteError) {
        console.error('Message deletion error:', deleteError)
        errors++
        continue // Skip audit logs for this batch if deletion failed
      }

      messagesDeleted += messages.length

      // 4. Log every deletion to audit_logs in bulk
      const auditLogs = messages.map(msg => ({
        action: 'message.auto_delete',
        resource_type: 'message',
        resource_id: msg.id,
        description: 'Message auto-deleted due to expiration',
        old_values: msg,
        metadata: { batch_run: i + 1 }
      }))

      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert(auditLogs)

      if (auditError) {
        console.error('Audit log insertion error:', auditError)
        errors++
      }
    }

    const executionTimeMs = Date.now() - startTime

    return new Response(JSON.stringify({
      success: true,
      stats: {
        messages_deleted: messagesDeleted,
        files_deleted: filesDeleted,
        execution_time_ms: executionTimeMs,
        errors: errors,
        completed_all: isDone
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
 *    supabase functions deploy auto-delete --no-verify-jwt
 * 
 * ==========================================
 * PG_CRON CONFIGURATION (Execute via SQL Editor or Migration)
 * ==========================================
 * To run this function automatically every hour:
 * 
 * SELECT cron.schedule(
 *   'invoke_auto_delete_edge_function',
 *   '0 * * * *', -- Every hour
 *   $$
 *   SELECT net.http_post(
 *       url:='https://<PROJECT_REF>.supabase.co/functions/v1/auto-delete',
 *       headers:='{"Content-Type": "application/json", "Authorization": "Bearer your_super_secret_string"}'::jsonb
 *   )
 *   $$
 * );
 * 
 * Note: Requires the 'pg_net' extension to be enabled in your database.
 */
