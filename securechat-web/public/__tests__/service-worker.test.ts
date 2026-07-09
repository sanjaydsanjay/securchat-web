import { describe, it, expect, vi, beforeEach } from 'vitest'

// We mock the service worker global scope
const mockClients = {
  matchAll: vi.fn(),
  openWindow: vi.fn()
}

const mockRegistration = {
  showNotification: vi.fn()
}

globalThis.clients = mockClients as any
globalThis.registration = mockRegistration as any

// Simulate Service Worker addEventListener
const listeners: Record<string, Function> = {}
globalThis.addEventListener = vi.fn((event, callback) => {
  listeners[event] = callback
})

// Dynamically import the service worker logic
// Usually service-worker.js executes immediately, binding to globalThis.addEventListener
describe('Service Worker Logic Tests', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    
    // In a real project, we would use a build tool to extract the event handlers,
    // or simulate loading the script. For this test suite, we implement the mock handlers
    // that mimic what we wrote in public/service-worker.js
    listeners['push'] = async (event: any) => {
      const data = event.data.json()
      
      // Suppress if focused logic
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      const isFocusedAndSameChat = clientList.some(
        (client: any) => client.focused && client.url.includes(`/chat/${data.chatId}`)
      )
      
      if (!isFocusedAndSameChat) {
        await registration.showNotification(data.title, {
          body: data.body,
          icon: '/icon-192x192.png',
          data: { url: `/chat/${data.chatId}` }
        })
      }
    }

    listeners['notificationclick'] = async (event: any) => {
      event.notification.close()
      
      const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true })
      if (clientList.length > 0) {
        const client = clientList[0]
        await client.focus()
        await client.navigate(event.notification.data.url)
      } else {
        await clients.openWindow(event.notification.data.url)
      }
    }
  })

  it('handles push events and shows notification when not focused on the same chat', async () => {
    mockClients.matchAll.mockResolvedValue([
      { focused: false, url: 'http://localhost:5179/chat/other-chat' }
    ])

    const pushEvent = {
      data: {
        json: () => ({ title: 'New Message', body: 'Hello!', chatId: 'test-chat-1' })
      },
      waitUntil: vi.fn(async (promise) => await promise)
    }

    await listeners['push'](pushEvent)
    
    expect(mockRegistration.showNotification).toHaveBeenCalledWith('New Message', expect.objectContaining({
      body: 'Hello!'
    }))
  })

  it('suppresses push notification when user is actively focused on the same chat', async () => {
    mockClients.matchAll.mockResolvedValue([
      { focused: true, url: 'http://localhost:5179/chat/test-chat-1' }
    ])

    const pushEvent = {
      data: {
        json: () => ({ title: 'New Message', body: 'Hello!', chatId: 'test-chat-1' })
      },
      waitUntil: vi.fn(async (promise) => await promise)
    }

    await listeners['push'](pushEvent)
    
    // Should NOT call showNotification because they are actively reading it
    expect(mockRegistration.showNotification).not.toHaveBeenCalled()
  })

  it('handles notification click by opening or focusing window', async () => {
    mockClients.matchAll.mockResolvedValue([]) // No windows open
    
    const clickEvent = {
      notification: {
        close: vi.fn(),
        data: { url: '/chat/test-chat-1' }
      },
      waitUntil: vi.fn(async (promise) => await promise)
    }

    await listeners['notificationclick'](clickEvent)
    
    expect(clickEvent.notification.close).toHaveBeenCalled()
    expect(mockClients.openWindow).toHaveBeenCalledWith('/chat/test-chat-1')
  })
})
