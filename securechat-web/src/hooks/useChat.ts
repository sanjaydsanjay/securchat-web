import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseConfig'
import { chatService } from '@/services/chatService'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useUIStore } from '@/stores/uiStore'
import { userService } from '@/services/userService'
import type { Chat, CreateChatPayload } from '@/types/chat'

export function useChat() {
  const { chats, setChats, addChat, updateChat, activeChatId, setActiveChatId } = useChatStore()
  const user = useAuthStore((s) => s.user)
  const pendingChatRef = useRef<Set<string>>(new Set())

  // Enrich chat with other user's info
  const enrichChats = useCallback(
    async (chatList: Chat[]) => {
      return Promise.all(
        chatList.map(async (chat) => {
          const otherId =
            chat.participant_1_id === user?.unique_id
              ? chat.participant_2_id
              : chat.participant_1_id
          const { data: otherUser } = await userService.getUserByUniqueId(otherId)
          return { ...chat, other_user: otherUser || undefined }
        })
      )
    },
    [user]
  )

  // Load chats + realtime subscription for updates
  const loadChats = useCallback(async () => {
    const { data, error } = await chatService.getChats()
    if (data && !error) {
      const enriched = await enrichChats(data)
      const seen = new Set<string>()
      const deduped = enriched.filter((c) => {
        if (seen.has(c.id)) return false
        seen.add(c.id)
        return true
      })
      setChats(deduped)
    }
  }, [enrichChats, setChats])

  useEffect(() => {
    if (!user) return
    loadChats()

    // Subscribe to chat updates (last message, unread counts)
    const channel = supabase
      .channel('chats-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chats',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const chat = payload.new as Chat
            if (pendingChatRef.current.has(chat.id)) {
              pendingChatRef.current.delete(chat.id)
              return
            }
            if (
              chat.participant_1_id === user.unique_id ||
              chat.participant_2_id === user.unique_id
            ) {
              const enriched = await enrichChats([chat])
              addChat(enriched[0])
            }
          } else if (payload.eventType === 'UPDATE') {
            const chat = payload.new as Chat
            if (
              chat.participant_1_id !== user.unique_id &&
              chat.participant_2_id !== user.unique_id
            ) return

            // If current user deleted this chat, remove from store
            if (chat.deleted_for?.includes(user.unique_id)) {
              const store = useChatStore.getState()
              store.setChats(store.chats.filter((c) => c.id !== chat.id))
              if (store.activeChatId === chat.id) store.setActiveChatId(null)
              return
            }
            updateChat(chat.id, chat)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const createChat = useCallback(
    async (payload: CreateChatPayload) => {
      if (!user) return null
      const { data, error } = await chatService.createChat({ ...payload, sender_unique_id: user.unique_id })
      if (data && !error) {
        pendingChatRef.current.add(data.id)
        const enriched = await enrichChats([data])
        addChat(enriched[0])
        setActiveChatId(data.id)
        if (window.innerWidth < 768) {
          useUIStore.getState().setMobileView('chat')
        }
        return data
      }
      return null
    },
    [addChat, setActiveChatId, enrichChats, user]
  )

  const selectChat = useCallback(
    (chatId: string | null) => {
      setActiveChatId(chatId)
      if (chatId && user) {
        chatService.resetUnreadCount(chatId, user.unique_id)
        // On mobile, switch to chat view
        if (window.innerWidth < 768) {
          useUIStore.getState().setMobileView('chat')
        }
      } else {
        // On mobile, switch back to list view
        if (window.innerWidth < 768) {
          useUIStore.getState().setMobileView('list')
        }
      }
    },
    [setActiveChatId, user]
  )

  // Search chats by display name or content preview
  const searchChats = useCallback(
    (query: string) => {
      if (!query.trim()) return chats
      const lower = query.toLowerCase()
      return chats.filter(
        (chat) =>
          chat.other_user?.display_name?.toLowerCase().includes(lower) ||
          chat.last_message_preview?.toLowerCase().includes(lower)
      )
    },
    [chats]
  )

  return { chats, activeChatId, loadChats, createChat, selectChat, searchChats }
}
