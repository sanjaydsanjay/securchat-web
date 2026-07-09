import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseConfig'
import type { SendMessagePayload, ScheduledMessage } from '@/types/message'

export function useScheduledMessages() {
  const [scheduling, setScheduling] = useState(false)

  const scheduleMessage = useCallback(async (payload: SendMessagePayload & { scheduled_for: string }) => {
    setScheduling(true)
    const { data, error } = await supabase
      .from('scheduled_messages')
      .insert({
        chat_id: payload.chat_id,
        content: payload.content,
        content_type: payload.content_type || 'text',
        scheduled_for: payload.scheduled_for,
      })
      .select()
      .single()
    setScheduling(false)
    return { data: data as ScheduledMessage | null, error }
  }, [])

  return { scheduling, scheduleMessage }
}
