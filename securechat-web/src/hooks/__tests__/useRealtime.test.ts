import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRealtime } from '../useRealtime'
import { supabase } from '@/lib/supabaseConfig'

const mockChannel = {
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockImplementation((cb) => {
    if (cb) cb('SUBSCRIBED')
    return mockChannel
  }),
  unsubscribe: vi.fn(),
}

vi.mock('@/lib/supabaseConfig', () => ({
  supabase: {
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  }
}))

describe('useRealtime Hook Tests (Realtime Sync)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('subscribes to realtime events on mount', () => {
    const onInsert = vi.fn()
    renderHook(() => useRealtime('messages', 'unique_id=eq.123', onInsert))

    expect(supabase.channel).toHaveBeenCalledWith('realtime:messages:unique_id=eq.123')
    expect(mockChannel.on).toHaveBeenCalledWith('postgres_changes' as never,
      { event: 'INSERT', schema: 'public', table: 'messages', filter: 'unique_id=eq.123' } as never,
      expect.any(Function))
    expect(mockChannel.subscribe).toHaveBeenCalled()
  })

  it('unsubscribes from realtime events on unmount', () => {
    const { unmount } = renderHook(() => useRealtime('messages', 'unique_id=eq.123'))

    unmount()
    expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel)
  })

  it('calls onInsert callback when payload is received', () => {
    const onInsert = vi.fn()
    renderHook(() => useRealtime('messages', 'unique_id=eq.123', onInsert))

    const insertCall = mockChannel.on.mock.calls.find(
      call => call[1]?.event === 'INSERT'
    )
    expect(insertCall).toBeDefined()

    const callback = insertCall[2]
    const mockPayload = { new: { id: '1', content: 'hello' } }
    callback(mockPayload)

    expect(onInsert).toHaveBeenCalledWith({ id: '1', content: 'hello' })
  })
})
