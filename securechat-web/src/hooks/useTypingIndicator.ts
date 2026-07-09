import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabaseConfig'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { TYPING_TIMEOUT_MS } from '@/lib/constants'

export function useTypingIndicator(chatId: string | null) {
  const user = useAuthStore((s) => s.user)
  const setTypingUsers = useChatStore((s) => s.setTypingUsers)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const isTypingRef = useRef(false)

  // Listen for typing events from the other participant
  useEffect(() => {
    if (!chatId || !user) return

    const channel = supabase.channel(`typing:${chatId}`, {
      config: { broadcast: { ack: false, self: false } },
    })

    channel.on('broadcast', { event: 'typing:start' }, (payload) => {
      if (payload.payload.userId !== user.unique_id) {
        setTypingUsers(chatId, [
          { userId: payload.payload.userId, displayName: payload.payload.displayName },
        ])
      }
    })

    channel.on('broadcast', { event: 'typing:stop' }, (payload) => {
      if (payload.payload.userId !== user.unique_id) {
        setTypingUsers(chatId, [])
      }
    })

    channel.subscribe()
    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      setTypingUsers(chatId, [])
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [chatId, user?.unique_id])

  // Emit typing start (resets timeout on each call for continuous typing)
  const startTyping = useCallback(() => {
    if (!chatId || !user) return

    if (!isTypingRef.current) {
      isTypingRef.current = true
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing:start',
        payload: { userId: user.unique_id, displayName: user.display_name },
      })
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      stopTyping()
    }, TYPING_TIMEOUT_MS)
  }, [chatId, user])

  // Emit typing stop
  const stopTyping = useCallback(() => {
    if (!chatId || !user || !isTypingRef.current) return
    isTypingRef.current = false

    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing:stop',
      payload: { userId: user.unique_id, displayName: user.display_name },
    })

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
      typingTimeoutRef.current = null
    }
  }, [chatId, user])

  return { startTyping, stopTyping }
}
