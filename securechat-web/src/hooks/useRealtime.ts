import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseConfig'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useRealtime<T extends Record<string, unknown>>(
  table: string,
  filter: string,
  onInsert?: (payload: T) => void,
  onUpdate?: (payload: T) => void,
  onDelete?: (payload: T) => void
) {
  const channelRef = useRef<ReturnType<typeof supabase.channel>>(undefined)

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:${table}:${filter}`)
      .on('postgres_changes' as never,
        { event: 'INSERT', schema: 'public', table, filter } as never,
        (payload: RealtimePostgresChangesPayload<T>) => onInsert?.(payload.new as T)
      )
      .on('postgres_changes' as never,
        { event: 'UPDATE', schema: 'public', table, filter } as never,
        (payload: RealtimePostgresChangesPayload<T>) => onUpdate?.(payload.new as T)
      )
      .on('postgres_changes' as never,
        { event: 'DELETE', schema: 'public', table, filter } as never,
        () => onDelete?.({} as T)
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
    }
  }, [table, filter])

  return channelRef
}