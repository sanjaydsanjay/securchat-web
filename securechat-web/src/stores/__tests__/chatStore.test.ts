import { describe, it, expect, beforeEach } from 'vitest'
import { useChatStore } from '../chatStore'

describe('chatStore Unit Tests', () => {
  beforeEach(() => {
    useChatStore.getState().reset()
  })

  it('should initialize with correct default state', () => {
    const state = useChatStore.getState()
    expect(state.chats).toEqual([])
    expect(state.activeChatId).toBeNull()
    expect(state.messages).toEqual({})
    expect(state.typingUsers).toEqual({})
    expect(state.onlineUserIds).toEqual([])
  })

  it('should add and update messages correctly', () => {
    const store = useChatStore.getState()
    const chatId = 'chat-1'
    const msg1 = { id: 'msg-1', content: 'Hello', status: 'sent' } as any
    const msg2 = { id: 'msg-2', content: 'World', status: 'delivered' } as any

    store.addMessage(chatId, msg1)
    expect(useChatStore.getState().messages[chatId]).toHaveLength(1)

    store.addMessage(chatId, msg2)
    expect(useChatStore.getState().messages[chatId]).toHaveLength(2)

    // Update message status (Read receipt)
    store.updateMessage(chatId, 'msg-1', { status: 'read' })
    const updatedMsg = useChatStore.getState().messages[chatId].find(m => m.id === 'msg-1')
    expect(updatedMsg?.status).toBe('read')
  })

  it('should handle soft deletion of messages', () => {
    const store = useChatStore.getState()
    const chatId = 'chat-1'
    const msg = { id: 'msg-1', content: 'Secret', is_deleted: false } as any

    store.addMessage(chatId, msg)
    store.updateMessage(chatId, 'msg-1', { is_deleted: true, content: 'This message was deleted' })

    const updatedMsg = useChatStore.getState().messages[chatId][0]
    expect(updatedMsg.is_deleted).toBe(true)
    expect(updatedMsg.content).toBe('This message was deleted')
  })

  it('should manage typing indicator state', () => {
    const store = useChatStore.getState()
    const chatId = 'chat-1'
    const typingUsers = [{ userId: 123, displayName: 'John' }]

    store.setTypingUsers(chatId, typingUsers)
    expect(useChatStore.getState().typingUsers[chatId]).toEqual(typingUsers)

    // User stops typing
    store.setTypingUsers(chatId, [])
    expect(useChatStore.getState().typingUsers[chatId]).toEqual([])
  })

  it('should manage online presence state', () => {
    const store = useChatStore.getState()
    
    store.setOnlineUserIds([1, 2, 3])
    expect(useChatStore.getState().onlineUserIds).toEqual([1, 2, 3])
    
    // User 2 goes offline
    store.setOnlineUserIds([1, 3])
    expect(useChatStore.getState().onlineUserIds).toEqual([1, 3])
  })
})
