import { supabase } from '@/lib/supabaseConfig'
import type { Message, SendMessagePayload } from '@/types/message'
import { messageContentSchema } from '@/utils/validators'
import { SEARCH_LIMIT } from '@/lib/constants'

export const messageService = {
  async getMessages(chatId: string, limit = SEARCH_LIMIT, offset = 0): Promise<{ data: Message[] | null; error: unknown }> {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    return { data: (data as Message[])?.reverse() || null, error }
  },

  async sendMessage(payload: SendMessagePayload & { sender_unique_id: number }): Promise<{ data: Message | null; error: unknown }> {
    const parsed = messageContentSchema.safeParse(payload.content)
    if (!parsed.success) {
      return { data: null, error: parsed.error.errors[0]?.message || 'Invalid message content' }
    }

    if (!payload.receiver_unique_id) {
      return { data: null, error: 'Receiver ID is required' }
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: payload.chat_id,
        sender_unique_id: payload.sender_unique_id,
        receiver_unique_id: payload.receiver_unique_id,
        content: parsed.data,
        content_type: payload.content_type || 'text',
        media_url: payload.media_url || null,
        media_metadata: payload.media_metadata || {},
        reply_to_id: payload.reply_to_id || null,
        e2e_encrypted: payload.e2e_encrypted || false,
        e2e_nonce: payload.e2e_nonce || null,
      })
      .select()
      .maybeSingle()
    return { data: data as Message | null, error }
  },

  async editMessage(messageId: string, content: string): Promise<{ data: Message | null; error: unknown }> {
    const { error: rpcError } = await supabase
      .rpc('append_edit_history', { msg_id: messageId, new_content: content })
    if (rpcError) return { data: null, error: rpcError }

    const { data, error } = await supabase
      .from('messages')
      .update({ content, is_edited: true })
      .eq('id', messageId)
      .select()
      .maybeSingle()
    return { data: data as Message | null, error }
  },

  async deleteMessage(messageId: string, deleteFor: 'me' | 'everyone'): Promise<{ error: unknown }> {
    if (deleteFor === 'me') {
      const { error } = await supabase
        .rpc('add_self_to_deleted_for', { msg_id: messageId })
      return { error }
    }
    const { error } = await supabase
      .from('messages')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', messageId)
    return { error }
  },

  async markAsRead(messageIds: string[]) {
    const { error } = await supabase
      .rpc('mark_as_read', { msg_ids: messageIds })
    return { error }
  },

  async addReaction(messageId: string, emoji: string) {
    const { error } = await supabase
      .rpc('toggle_reaction', { msg_id: messageId, reaction_emoji: emoji })
    return { error }
  },

  async forwardMessage(messageId: string, targetChatId: string, senderUniqueId: number) {
    const { data: original } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .maybeSingle()

    if (!original) return { error: new Error('Message not found') }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: targetChatId,
        sender_unique_id: senderUniqueId,
        content: original.content,
        content_type: original.content_type,
        media_url: original.media_url,
        media_metadata: original.media_metadata,
        is_forwarded: true,
        original_sender_id: original.sender_unique_id,
      })
      .select()
      .maybeSingle()

    return { data: data as Message | null, error }
  },

  async searchMessages(chatId: string, query: string): Promise<{ data: Message[] | null; error: unknown }> {
    if (!query.trim()) return { data: null, error: null }
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .textSearch('content', query, { type: 'websearch' })
      .order('created_at', { ascending: false })
      .limit(SEARCH_LIMIT)
    return { data: data as Message[] | null, error }
  },

  async toggleStar(messageId: string): Promise<{ error: unknown }> {
    const { error } = await supabase
      .rpc('toggle_star_message', { msg_id: messageId })
    return { error }
  },

  async getStarredMessages(): Promise<{ data: Message[] | null; error: unknown }> {
    const { data, error } = await supabase
      .rpc('get_starred_messages')
    return { data: data as Message[] | null, error }
  },
}
