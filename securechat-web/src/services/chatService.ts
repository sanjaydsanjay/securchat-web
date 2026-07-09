import { supabase } from '@/lib/supabaseConfig'
import type { Chat, CreateChatPayload } from '@/types/chat'

export const chatService = {
  async getChats(limit = 100): Promise<{ data: Chat[] | null; error: unknown }> {
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) return { data: null, error: 'Not authenticated' }

    const { data: user } = await supabase
      .from('users')
      .select('unique_id')
      .eq('auth_id', currentUser.id)
      .single()

    if (!user) return { data: null, error: 'User not found' }

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .not('deleted_for', 'cs', `{${user.unique_id}}`)
      .order('last_message_time', { ascending: false, nullsFirst: false })
      .limit(limit)
    return { data: data as Chat[] | null, error }
  },

  async getChatById(chatId: string): Promise<{ data: Chat | null; error: unknown }> {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .single()
    return { data: data as Chat | null, error }
  },

  async createChat(payload: CreateChatPayload & { sender_unique_id: number }): Promise<{ data: Chat | null; error: unknown }> {
    const { data: chatId, error } = await supabase
      .rpc('create_chat', {
        p1_unique_id: payload.sender_unique_id,
        p2_unique_id: payload.participant_unique_id,
      })
    if (error) {
      console.error('create_chat RPC failed:', error)
      return { data: null, error }
    }

    const { data: chat } = await supabase
      .from('chats')
      .select('*')
      .eq('id', chatId)
      .maybeSingle()
    if (!chat) {
      return { data: null, error: 'Chat was created but could not be retrieved' }
    }
    return { data: chat as Chat | null, error: null }
  },

  async searchChats(query: string): Promise<{ data: Chat[] | null; error: unknown }> {
    if (!query.trim()) return { data: null, error: null }

    const { data: matchingUsers, error: userError } = await supabase
      .from('users')
      .select('unique_id')
      .ilike('display_name', `%${query}%`)
      .limit(20)

    if (userError || !matchingUsers?.length) {
      return { data: null, error: userError }
    }

    const ids = matchingUsers.map((u: { unique_id: number }) => u.unique_id)
    if (ids.length === 0) return { data: null, error: null }

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .or(`participant_1_id.in.(${ids.join(',')}),participant_2_id.in.(${ids.join(',')})`)
      .order('last_message_time', { ascending: false })
      .limit(50)

    return { data: data as Chat[] | null, error }
  },

  async searchUsersAndChats(query: string): Promise<{ chats: Chat[] | null; error: unknown }> {
    const { data: chats, error } = await supabase
      .from('chats')
      .select('*')
      .textSearch('last_message_preview', query, { type: 'websearch' })
      .order('last_message_time', { ascending: false })
      .limit(50)
    return { chats: chats as Chat[] | null, error }
  },

  async updateChatSettings(chatId: string, settings: Record<string, unknown>) {
    const { data, error } = await supabase
      .from('chats')
      .update(settings)
      .eq('id', chatId)
      .select()
      .single()
    return { data: data as Chat | null, error }
  },

  async deleteChat(chatId: string): Promise<{ error: unknown }> {
    const { error } = await supabase
      .rpc('delete_chat_for_me', { chat_id: chatId })
    return { error }
  },

  async archiveChat(chatId: string) {
    const { error } = await supabase.rpc('archive_chat', { chat_id: chatId })
    return { error }
  },

  async togglePin(chatId: string, pinned: boolean) {
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) return { error: 'Not authenticated' }

    const { data: user } = await supabase
      .from('users')
      .select('unique_id')
      .eq('auth_id', currentUser.id)
      .single()

    if (!user) return { error: 'User not found' }

    const { data: chat } = await supabase
      .from('chats')
      .select('participant_1_id, participant_2_id, participant_1_settings, participant_2_settings')
      .eq('id', chatId)
      .single()

    if (!chat) return { error: 'Chat not found' }

    const isParticipant1 = chat.participant_1_id === user.unique_id
    const settings = isParticipant1 ? chat.participant_1_settings : chat.participant_2_settings

    const { error } = await supabase
      .from('chats')
      .update({
        [isParticipant1 ? 'participant_1_settings' : 'participant_2_settings']: {
          ...(settings as Record<string, unknown>),
          is_pinned: pinned,
        },
      })
      .eq('id', chatId)

    return { error }
  },

  async toggleMute(chatId: string, muted: boolean) {
    const currentUser = (await supabase.auth.getUser()).data.user
    if (!currentUser) return { error: 'Not authenticated' }

    const { data: user } = await supabase
      .from('users')
      .select('unique_id')
      .eq('auth_id', currentUser.id)
      .single()

    if (!user) return { error: 'User not found' }

    const { data: chat } = await supabase
      .from('chats')
      .select('participant_1_id, participant_2_id, participant_1_settings, participant_2_settings')
      .eq('id', chatId)
      .single()

    if (!chat) return { error: 'Chat not found' }

    const isParticipant1 = chat.participant_1_id === user.unique_id
    const settings = isParticipant1 ? chat.participant_1_settings : chat.participant_2_settings

    const { error } = await supabase
      .from('chats')
      .update({
        [isParticipant1 ? 'participant_1_settings' : 'participant_2_settings']: {
          ...(settings as Record<string, unknown>),
          is_muted: muted,
        },
      })
      .eq('id', chatId)

    return { error }
  },

  async resetUnreadCount(chatId: string, userUniqueId: number) {
    const { data: chat } = await supabase
      .from('chats')
      .select('participant_1_id, unread_count_1, unread_count_2')
      .eq('id', chatId)
      .maybeSingle()

    if (!chat) return

    if (chat.participant_1_id === userUniqueId) {
      await supabase.from('chats').update({ unread_count_1: 0 }).eq('id', chatId)
    } else {
      await supabase.from('chats').update({ unread_count_2: 0 }).eq('id', chatId)
    }
  },
}
