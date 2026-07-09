import { useCallback, useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from '@/lib/supabaseConfig'
import { messageService } from '@/services/messageService'
import { aiService } from '@/services/aiService'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { importKey, encryptMessage, decryptMessage } from '@/utils/encryption'
import { messageContentSchema } from '@/utils/validators'
import type { Message, SendMessagePayload } from '@/types/message'
import type { AIAnalysisResponse } from '@/types/ai'

const PAGE_SIZE = 50

export function useMessages(chatId: string | null) {
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const { messages, setMessages, addMessage, updateMessage, removeMessage } = useChatStore()
  const user = useAuthStore((s) => s.user)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  // Helper to decrypt E2E messages
  const decryptE2EContent = useCallback(async (msg: Message): Promise<Message> => {
    if (!msg.e2e_encrypted || !msg.e2e_nonce) return msg
    const chats = useChatStore.getState().chats
    const chat = chats.find((c) => c.id === chatId)
    if (!chat?.e2e_shared_secret) return msg
    try {
      const key = await importKey(chat.e2e_shared_secret)
      const decrypted = await decryptMessage(key, msg.content, msg.e2e_nonce)
      return { ...msg, content: decrypted }
    } catch {
      return { ...msg, content: '[Encrypted message]' }
    }
  }, [chatId])

  // Initial load
  const loadMessages = useCallback(async () => {
    if (!chatId) return
    setLoading(true)
    const { data, error } = await messageService.getMessages(chatId, PAGE_SIZE, 0)
    if (data && !error) {
      const blocked = useAuthStore.getState().user?.blocked_users || []
      const filtered = data.filter((m: Message) => !blocked.includes(m.sender_unique_id))
      const validated = filtered.map((m: Message) => {
        const contentCheck = messageContentSchema.safeParse(m.content)
        if (!contentCheck.success) {
          m.content = '[Message content blocked]'
        }
        return m
      })
      const decrypted = await Promise.all(validated.map(decryptE2EContent))
      setMessages(chatId, decrypted)
      setHasMore(data.length >= PAGE_SIZE)

      // Mark messages as delivered if we're the receiver
      const unreadIds = decrypted
        .filter((m: Message) => m.receiver_unique_id === user?.unique_id && !m.delivered_at)
        .map((m) => m.id)

      if (unreadIds.length > 0) {
        await supabase
          .from('messages')
          .update({ delivered_at: new Date().toISOString() })
          .in('id', unreadIds)
      }

      // Mark all incoming messages as read on load
      if (document.hasFocus()) {
        const readIds = decrypted
          .filter((m: Message) =>
            m.receiver_unique_id === user?.unique_id &&
            !m.read_by?.[user?.unique_id?.toString() || '']
          )
          .map((m) => m.id)
        if (readIds.length > 0) {
          supabase.rpc('mark_messages_read', { msg_ids: readIds }).then()
        }
      }
    }
    setLoading(false)
  }, [chatId, user?.unique_id, decryptE2EContent])

  // Load older messages (pagination)
  const loadMore = useCallback(async () => {
    if (!chatId || !hasMore || loadingMore) return
    setLoadingMore(true)

    const currentMsgs = messages[chatId] || []
    const oldest = currentMsgs[0]
    if (!oldest) {
      setLoadingMore(false)
      return
    }

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE)

    if (data && !error) {
      const reversed = data.reverse()
      const blocked = useAuthStore.getState().user?.blocked_users || []
      const filtered = reversed.filter((m: Message) => !blocked.includes(m.sender_unique_id))
      const decrypted = await Promise.all(filtered.map(decryptE2EContent))
      setMessages(chatId, [...decrypted, ...currentMsgs])
      setHasMore(data.length >= PAGE_SIZE)
    }
    setLoadingMore(false)
  }, [chatId, hasMore, loadingMore, messages, decryptE2EContent])

  // Realtime subscription
  useEffect(() => {
    if (!chatId) return
    loadMessages()

    const channel = supabase
      .channel(`messages:${chatId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        async (payload: { new: Message }) => {
          const msg = payload.new
          if (msg.is_deleted) return

          const blocked = useAuthStore.getState().user?.blocked_users || []
          if (blocked.includes(msg.sender_unique_id)) return

          // Skip messages from self (already added optimistically)
          if (msg.sender_unique_id === user?.unique_id) return

          // Validate incoming message content
          const contentCheck = messageContentSchema.safeParse(msg.content)
          if (!contentCheck.success) {
            msg.content = '[Message content blocked]'
          }

          // Decrypt E2E messages before displaying
          const displayMsg = await decryptE2EContent(msg)
          addMessage(chatId, displayMsg)

          // Auto-mark as delivered
          if (msg.receiver_unique_id === user?.unique_id && !msg.delivered_at) {
            supabase
              .from('messages')
              .update({ delivered_at: new Date().toISOString() })
              .eq('id', msg.id)
              .then()
          }

          // Mark as read if chat is active
          if (msg.receiver_unique_id === user?.unique_id && document.hasFocus()) {
            markAsRead([msg.id])
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `chat_id=eq.${chatId}`,
        },
        (payload: { new: Message }) => {
          const msg = payload.new
          if (msg.is_deleted || (msg.deleted_for?.includes(user?.unique_id ?? -1))) {
            removeMessage(chatId, msg.id)
          } else {
            updateMessage(chatId, msg.id, msg)
          }
        }
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [chatId, loadMessages])

  // Mark messages as read
  const markAsRead = useCallback(
    async (messageIds: string[]) => {
      if (!messageIds.length || !chatId) return

      const { error } = await supabase.rpc('mark_messages_read', {
        msg_ids: messageIds,
      })

      if (!error) {
        messageIds.forEach((id) => {
          updateMessage(chatId, id, {
            read_by: {
              ...(messages[chatId]?.find((m) => m.id === id)?.read_by || {}),
              [user?.unique_id?.toString() || '']: new Date().toISOString(),
            },
          } as Partial<Message>)
        })
      }
    },
    [chatId, user?.unique_id, messages]
  )

  // Mark all incoming messages as read
  const markAllAsRead = useCallback(() => {
    if (!chatId) return
    const unreadIds = (messages[chatId] || [])
      .filter(
        (m) =>
          m.receiver_unique_id === user?.unique_id &&
          !m.read_by?.[user?.unique_id?.toString() || '']
      )
      .map((m) => m.id)

    if (unreadIds.length > 0) {
      markAsRead(unreadIds)
    }
  }, [chatId, messages, user?.unique_id, markAsRead])

  // Send message with optimistic update
  const sendMessage = useCallback(
    async (payload: SendMessagePayload) => {
      console.log('[useMessages] sendMessage called', { hasUser: !!user, chatId, content: payload.content?.substring(0, 50) })
      if (!chatId || !user) {
        console.log('[useMessages] sendMessage early return: not authenticated', { chatId, hasUser: !!user })
        return { data: null, error: 'Not authenticated' }
      }

      const chat = useChatStore.getState().chats.find((c) => c.id === chatId)
      if (!chat) {
        console.log('[useMessages] sendMessage early return: chat not found', { chatId })
        return { data: null, error: 'Chat not found' }
      }
      const receiverId = chat.participant_1_id === user.unique_id
        ? chat.participant_2_id
        : chat.participant_1_id
      console.log('[useMessages] receiver determined', { receiverId, myId: user.unique_id })

      const tempId = uuidv4()
      const optimistic: Message = {
        id: tempId,
        chat_id: chatId,
        sender_unique_id: user.unique_id,
        receiver_unique_id: receiverId,
        content: payload.content,
        content_type: payload.content_type || 'text',
        media_url: payload.media_url || null,
        media_metadata: payload.media_metadata || {},
        reply_to_id: payload.reply_to_id || null,
        is_edited: false,
        edit_history: [],
        is_deleted: false,
        deleted_for: [],
        deleted_at: null,
        read_by: {},
        delivered_at: null,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_forwarded: false,
        original_sender_id: null,
        reactions: {},
        ai_analyzed: false,
        ai_threat_level: 'none',
        ai_categories: [],
        ai_confidence: null,
        e2e_encrypted: false,
        e2e_nonce: null,
        status: 'sending',
      }

      addMessage(chatId, optimistic)

      let sendPayload = { ...payload, chat_id: chatId, receiver_unique_id: receiverId, sender_unique_id: user.unique_id }
      if (chat?.is_e2e_enabled && chat?.e2e_shared_secret) {
        try {
          const key = await importKey(chat.e2e_shared_secret)
          const { ciphertext, iv } = await encryptMessage(key, payload.content)
          sendPayload = { ...sendPayload, content: ciphertext, e2e_encrypted: true, e2e_nonce: iv }
        } catch {
          // Fall back to unencrypted if encryption fails
        }
      }

      console.log('[useMessages] calling messageService.sendMessage')
      try {
        const { data, error } = await messageService.sendMessage(sendPayload)
        console.log('[useMessages] sendMessage result:', JSON.stringify({ hasData: !!data, error }))

        if (error || !data) {
          console.log('[useMessages] sendMessage failed, transitioning to failed state', { tempId, error })
          updateMessage(chatId, tempId, { status: 'failed' } as Partial<Message>)
          return { data: null, error: error || 'Failed to send message' }
        }

        console.log('[useMessages] sendMessage success, replacing optimistic message', { tempId, realId: data.id })
        removeMessage(chatId, tempId)
        let displayData: Message = { ...data, receiver_unique_id: receiverId, status: 'sent' }
        if (data.e2e_encrypted && chat?.e2e_shared_secret) {
          try {
            const key = await importKey(chat.e2e_shared_secret)
            displayData.content = await decryptMessage(key, data.content, data.e2e_nonce!)
          } catch {
            displayData.content = '[Encrypted message]'
          }
        }
        addMessage(chatId, displayData)

        const aiResult = await aiService.analyzeMessage({
          message_id: data.id,
          content: payload.content,
          sender_unique_id: user.unique_id,
        })

        if (aiResult.data) {
          const result = aiResult.data as AIAnalysisResponse
          const updatedMsg = useChatStore.getState().messages[chatId]?.find((m) => m.id === data.id)
          if (updatedMsg) {
            updateMessage(chatId, data.id, {
              ai_analyzed: true,
              ai_threat_level: result.risk === 'critical' ? 'critical' : result.risk === 'high' ? 'high' : result.risk === 'medium' ? 'medium' : result.risk === 'low' ? 'low' : 'none',
              ai_categories: result.category && result.category !== 'none' ? [result.category] : [],
            } as Partial<Message>)
          }

          if (!result.allow) {
            console.warn('[useMessages] Message blocked by AI analysis', {
              messageId: data.id,
              risk: result.risk,
              category: result.category,
              warning: result.warning,
            })
          }

          if (result.ban) {
            console.warn('[useMessages] Account banned due to AI analysis', {
              userId: user.unique_id,
              risk: result.risk,
              category: result.category,
            })

            const bannedUser = { ...user, is_banned: true, ban_reason: result.warning || 'Violation of content policy' }
            useAuthStore.getState().setUser(bannedUser)
          }
        }

        try {
          await supabase
            .from('chats')
            .update({
              last_message_id: data.id,
              last_message_preview: payload.content.slice(0, 100),
              last_message_time: new Date().toISOString(),
            })
            .eq('id', chatId)
        } catch {
          // Non-critical
        }

        return { data, error: null }
      } catch (err) {
        console.log('[useMessages] sendMessage CAUGHT exception:', err instanceof Error ? err.message : String(err))
        updateMessage(chatId, tempId, { status: 'failed' } as Partial<Message>)
        return { data: null, error: err instanceof Error ? err.message : 'Failed to send message' }
      }
    },
    [chatId, user]
  )

  const editMessage = useCallback(
    async (messageId: string, content: string) => {
      if (!chatId) return { data: null, error: 'No chat selected' }
      const { data, error } = await messageService.editMessage(messageId, content)
      if (!error && data) {
        updateMessage(chatId, messageId, data)
      }
      return { data, error }
    },
    [chatId]
  )

  const deleteMessage = useCallback(
    async (messageId: string, deleteFor: 'me' | 'everyone') => {
      if (!chatId) return { error: 'No chat selected' }
      const { error } = await messageService.deleteMessage(messageId, deleteFor)
      if (!error) {
        if (deleteFor === 'everyone') {
          removeMessage(chatId, messageId)
        } else {
          updateMessage(chatId, messageId, {
            deleted_for: [user?.unique_id || 0],
          } as Partial<Message>)
        }
      }
      return { error }
    },
    [chatId, user?.unique_id]
  )

  const addReaction = useCallback(
    async (messageId: string, emoji: string) => {
      if (!chatId) return { error: 'No chat selected' }
      const { error } = await messageService.addReaction(messageId, emoji)
      return { error }
    },
    [chatId]
  )

  const toggleStar = useCallback(
    async (messageId: string) => {
      if (!chatId) return { error: 'No chat selected' }
      const { error } = await messageService.toggleStar(messageId)
      return { error }
    },
    [chatId]
  )

  const currentMessages = chatId ? messages[chatId] || [] : []

  return {
    messages: currentMessages,
    loading,
    hasMore,
    loadingMore,
    loadMessages,
    loadMore,
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    toggleStar,
    markAllAsRead,
  }
}
