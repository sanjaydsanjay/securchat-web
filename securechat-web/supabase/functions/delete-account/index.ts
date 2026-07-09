import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.6'
import { corsHeaders } from '../_shared/cors.ts'

interface DeleteAccountRequest {
  confirm: boolean
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid Authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    )

    const jwt = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body: DeleteAccountRequest = await req.json()
    if (!body.confirm) {
      return new Response(JSON.stringify({ error: 'Confirmation required. Set confirm: true.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, unique_id, avatar_url')
      .eq('auth_id', user.id)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const uniqueId = profile.unique_id
    const now = new Date().toISOString()

    // 1. Anonymize all messages sent by this user
    const { error: msgError } = await supabase
      .from('messages')
      .update({
        sender_unique_id: -1,
        content: '[deleted account]',
        media_url: null,
        media_metadata: {},
        is_edited: false,
        edit_history: [],
        is_deleted: false,
        deleted_for: [],
      })
      .eq('sender_unique_id', uniqueId)

    if (msgError) throw new Error(`Failed to anonymize messages: ${msgError.message}`)

    // 2. Remove user from chat_members
    const { error: memberError } = await supabase
      .from('chat_members')
      .delete()
      .eq('user_unique_id', uniqueId)

    if (memberError) throw new Error(`Failed to remove chat members: ${memberError.message}`)

    // 3. Soft-delete the user profile (anonymize PII)
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        display_name: 'Deleted User',
        email: `deleted-${uniqueId}@removed.securechat.app`,
        avatar_url: null,
        bio: '',
        phone: null,
        is_online: false,
        e2e_public_key: null,
        e2e_enabled: false,
        blocked_users: [],
        settings: { deleted_at: now },
      })
      .eq('auth_id', user.id)

    if (userUpdateError) throw new Error(`Failed to update user: ${userUpdateError.message}`)

    // 4. Delete avatar from storage
    if (profile.avatar_url) {
      const avatarPath = profile.avatar_url.replace(/.*\/avatars\//, '')
      if (avatarPath) {
        await supabase.storage.from('avatars').remove([avatarPath])
      }
    }

    // 5. Delete user-owned files from chat-media and voice-notes
    const { data: userChatIds } = await supabase
      .from('chats')
      .select('id')
      .or(`participant_1_id.eq.${uniqueId},participant_2_id.eq.${uniqueId}`)

    if (userChatIds) {
      for (const chat of userChatIds) {
        await supabase.storage.from('chat-media').remove([`${chat.id}`])
        await supabase.storage.from('voice-notes').remove([`${chat.id}`])
      }
    }

    // 6. Revoke all sessions (sign out everywhere) without deleting auth user
    const { error: signOutError } = await supabase.auth.admin.signOut(user.id)
    if (signOutError) throw new Error(`Failed to revoke sessions: ${signOutError.message}`)

    // 7. Log audit event directly (service role bypasses RPC's auth.uid())
    await supabase.from('audit_logs').insert({
      actor_id: user.id,
      actor_unique_id: uniqueId,
      action: 'user.deleted',
      resource_type: 'user',
      resource_id: profile.id,
      description: 'User requested account deletion',
      old_values: { unique_id: uniqueId },
      new_values: { deleted_at: now },
      metadata: { deleted_by: 'user' },
    })

    return new Response(JSON.stringify({ success: true, message: 'Account deleted successfully' }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('delete-account error:', err)
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
