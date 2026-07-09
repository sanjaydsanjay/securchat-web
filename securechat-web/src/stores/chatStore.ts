import { create } from 'zustand'
import type { Chat } from '@/types/chat'
import type { Message } from '@/types/message'

interface ChatStore {
  chats: Chat[]
  activeChatId: string | null
  messages: Record<string, Message[]>
  typingUsers: Record<string, { userId: number; displayName: string }[]>
  onlineUserIds: number[]
  searchQuery: string
  searchResults: Message[]
  setChats: (chats: Chat[]) => void
  addChat: (chat: Chat) => void
  updateChat: (chatId: string, updates: Partial<Chat>) => void
  setActiveChatId: (chatId: string | null) => void
  setMessages: (chatId: string, messages: Message[]) => void
  addMessage: (chatId: string, message: Message) => void
  updateMessage: (chatId: string, messageId: string, updates: Partial<Message>) => void
  removeMessage: (chatId: string, messageId: string) => void
  setTypingUsers: (chatId: string, users: { userId: number; displayName: string }[]) => void
  setOnlineUserIds: (ids: number[]) => void
  setSearchQuery: (query: string) => void
  setSearchResults: (results: Message[]) => void
  reset: () => void
}

export const useChatStore = create<ChatStore>((set) => ({
  chats: [],
  activeChatId: null,
  messages: {},
  typingUsers: {},
  onlineUserIds: [],
  searchQuery: '',
  searchResults: [],
  setChats: (chats) => set({
    chats: [...chats].sort((a, b) => {
      const aTime = a.last_message_time || a.created_at
      const bTime = b.last_message_time || b.created_at
      return new Date(bTime).getTime() - new Date(aTime).getTime()
    }),
  }),
  addChat: (chat) => set((state) => {
    if (state.chats.some((c) => c.id === chat.id)) return state
    return {
      chats: [...state.chats, chat].sort((a, b) => {
        const aTime = a.last_message_time || a.created_at
        const bTime = b.last_message_time || b.created_at
        return new Date(bTime).getTime() - new Date(aTime).getTime()
      }),
    }
  }),
  updateChat: (chatId, updates) =>
    set((state) => ({
      chats: state.chats
        .map((c) => (c.id === chatId ? { ...c, ...updates } : c))
        .sort((a, b) => {
          const aTime = a.last_message_time || a.created_at
          const bTime = b.last_message_time || b.created_at
          return new Date(bTime).getTime() - new Date(aTime).getTime()
        }),
    })),
  setActiveChatId: (chatId) => set({ activeChatId: chatId }),
  setMessages: (chatId, messages) =>
    set((state) => ({ messages: { ...state.messages, [chatId]: messages } })),
  addMessage: (chatId, message) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: [...(state.messages[chatId] || []), message],
      },
    })),
  updateMessage: (chatId, messageId, updates) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).map((m) =>
          m.id === messageId ? { ...m, ...updates } : m
        ),
      },
    })),
  removeMessage: (chatId, messageId) =>
    set((state) => ({
      messages: {
        ...state.messages,
        [chatId]: (state.messages[chatId] || []).filter((m) => m.id !== messageId),
      },
    })),
  setTypingUsers: (chatId, users) =>
    set((state) => ({ typingUsers: { ...state.typingUsers, [chatId]: users } })),
  setOnlineUserIds: (ids) => set({ onlineUserIds: ids }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results) => set({ searchResults: results }),
  reset: () =>
    set({ chats: [], activeChatId: null, messages: {}, typingUsers: {}, onlineUserIds: [], searchQuery: '', searchResults: [] }),
}))
