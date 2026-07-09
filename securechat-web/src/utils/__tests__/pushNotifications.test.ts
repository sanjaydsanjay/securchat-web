import { describe, it, expect, vi, beforeEach } from 'vitest'
import { registerServiceWorker, requestNotificationPermission, subscribeToPush, unsubscribeFromPush } from '../pushNotifications'
import { supabase } from '@/lib/supabaseConfig'

vi.mock('@/lib/supabaseConfig', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    upsert: vi.fn(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
    }
  }
}))

const mockPushManager = {
  getSubscription: vi.fn(),
  subscribe: vi.fn()
}

let readyResolve: (value: unknown) => void
const readyPromise = new Promise((resolve) => { readyResolve = resolve })

const mockServiceWorker = {
  register: vi.fn(),
  ready: readyPromise,
  addEventListener: vi.fn()
}

Object.defineProperty(navigator, 'serviceWorker', {
  value: mockServiceWorker,
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'PushManager', {
  value: {},
  writable: true,
  configurable: true,
})

Object.defineProperty(window, 'Notification', {
  value: {
    requestPermission: vi.fn(),
    permission: 'default',
  },
  writable: true,
  configurable: true,
})

describe('Push Notifications Utility Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers the service worker correctly', async () => {
    mockServiceWorker.register.mockResolvedValue('registered')
    const result = await registerServiceWorker()
    expect(mockServiceWorker.register).toHaveBeenCalledWith('/service-worker.js')
    expect(result).toBe('registered')
  })

  it('requests notification permissions correctly', async () => {
    vi.mocked(window.Notification.requestPermission).mockResolvedValue('granted')
    const result = await requestNotificationPermission()
    expect(window.Notification.requestPermission).toHaveBeenCalled()
    expect(result).toBe('granted')
  })

  it('subscribes to push and upserts to database', async () => {
    mockServiceWorker.register.mockResolvedValue({ pushManager: mockPushManager })
    readyResolve?.({ pushManager: mockPushManager })
    vi.mocked(window.Notification.requestPermission).mockResolvedValue('granted')
    mockPushManager.getSubscription.mockResolvedValue(null)

    const mockNewSubscription = {
      endpoint: 'https://push.example.com/xyz',
      toJSON: () => ({ endpoint: 'https://push.example.com/xyz' }),
      getKey: (key: string) => {
        if (key === 'p256dh') return new ArrayBuffer(16)
        if (key === 'auth') return new ArrayBuffer(16)
        return null
      },
    }
    mockPushManager.subscribe.mockResolvedValue(mockNewSubscription)
    vi.mocked(supabase.upsert).mockResolvedValue({ error: null })

    const dummyVapid = 'BEl6tAMqZEdummykey12345678'

    const success = await subscribeToPush(111111, dummyVapid)

    expect(success).toBe(true)
    expect(mockPushManager.subscribe).toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('web_push_subscriptions')
    expect(supabase.upsert).toHaveBeenCalled()
  })

  it('unsubscribes and deletes from database', async () => {
    const mockSub = {
      endpoint: 'https://push.example.com/xyz',
      toJSON: () => ({ endpoint: 'https://push.example.com/xyz' }),
      unsubscribe: vi.fn().mockResolvedValue(true),
    }
    mockPushManager.getSubscription.mockResolvedValue(mockSub)
    readyResolve?.({ pushManager: mockPushManager })

    await unsubscribeFromPush(111111)

    expect(mockSub.unsubscribe).toHaveBeenCalled()
    expect(supabase.from).toHaveBeenCalledWith('web_push_subscriptions')
    expect(supabase.delete).toHaveBeenCalled()
  })

  it('handles permission denied cleanly', async () => {
    mockServiceWorker.register.mockResolvedValue({ pushManager: mockPushManager })
    readyResolve?.({ pushManager: mockPushManager })
    vi.mocked(window.Notification.requestPermission).mockResolvedValue('denied')

    const success = await subscribeToPush(111111, 'dummyVapid')

    expect(success).toBe(false)
    expect(mockPushManager.subscribe).not.toHaveBeenCalled()
  })
})
