import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseConfig'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'

export function usePresence() {
  const user = useAuthStore((s) => s.user)
  const setOnlineUserIds = useChatStore((s) => s.setOnlineUserIds)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user?.unique_id) return

    const updateDbStatus = async (isOnline: boolean) => {
      await supabase
        .from('users')
        .update({
          is_online: isOnline,
          last_seen: isOnline ? undefined : new Date().toISOString(),
        })
        .eq('unique_id', user.unique_id)
    }

    const channel = supabase.channel('online-users', {
      config: {
        presence: {
          key: user.unique_id.toString(),
        },
      },
    })

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState()
      const onlineIds = Object.keys(state).map(Number)
      setOnlineUserIds(onlineIds)
    })

    channel.on('presence', { event: 'join' }, ({ key }) => {
      supabase
        .from('users')
        .update({ is_online: true })
        .eq('unique_id', parseInt(key))
        .then()
    })

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      supabase
        .from('users')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('unique_id', parseInt(key))
        .then()
    })

    channel.subscribe(async (status) => {
      if (status !== 'SUBSCRIBED') return

      await channel.track({
        user_id: user.unique_id,
        display_name: user.display_name,
        online_at: new Date().toISOString(),
      })

      await updateDbStatus(true)
    })

    channelRef.current = channel

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        channel.track({
          user_id: user.unique_id,
          display_name: user.display_name,
          online_at: new Date().toISOString(),
        })
        updateDbStatus(true)
      } else {
        updateDbStatus(false)
      }
    }

    const handleBeforeUnload = () => {
      channel.untrack()
      // Use Supabase client (has auth session) instead of raw sendBeacon (no auth headers)
      try {
        void supabase
          .from('users')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('unique_id', user.unique_id)
      } catch {
        // Silently fail - presence:leave event will handle it
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updateDbStatus(false)
    }
  }, [user?.unique_id, user?.display_name, setOnlineUserIds])

  return { channelRef }
}
