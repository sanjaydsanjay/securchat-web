import { render, screen } from '@/test/render'
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { ChatWindow } from '../ChatWindow'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn()
})

vi.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count, getScrollElement, estimateSize, overscan }: any) => {
    const items = Array.from({ length: count }, (_, i) => ({
      index: i,
      start: i * estimateSize(),
      size: estimateSize(),
      key: i,
      measureElement: vi.fn(),
    }))
    return {
      getVirtualItems: () => items,
      getTotalSize: () => count * estimateSize(),
      scrollToIndex: vi.fn(),
      scrollToOffset: vi.fn(),
      measure: vi.fn(),
    }
  },
}))

const mockMessagesState = vi.hoisted(() => ({
  messages: [] as any[],
  loading: false,
  hasMore: false,
  loadingMore: false,
  loadMore: vi.fn(),
  sendMessage: vi.fn(),
  editMessage: vi.fn(),
  deleteMessage: vi.fn(),
  addReaction: vi.fn(),
  toggleStar: vi.fn(),
  markAllAsRead: vi.fn(),
}))

vi.mock('@/hooks/useMessages', () => ({
  useMessages: () => ({
    messages: mockMessagesState.messages,
    loading: mockMessagesState.loading,
    hasMore: mockMessagesState.hasMore,
    loadingMore: mockMessagesState.loadingMore,
    loadMore: mockMessagesState.loadMore,
    sendMessage: mockMessagesState.sendMessage,
    editMessage: mockMessagesState.editMessage,
    deleteMessage: mockMessagesState.deleteMessage,
    addReaction: mockMessagesState.addReaction,
    toggleStar: mockMessagesState.toggleStar,
    markAllAsRead: mockMessagesState.markAllAsRead,
  }),
}))

vi.mock('../../hooks/useTypingIndicator', () => ({
  useTypingIndicator: () => ({ startTyping: vi.fn() }),
}))

vi.mock('../MessageBubble', () => ({
  MessageBubble: ({ message }: any) => <div data-testid="msg-bubble">{message.content}</div>,
}))

vi.mock('../TypingIndicator', () => ({
  TypingIndicator: ({ chatId }: any) => {
    const typingUsers = useChatStore.getState().typingUsers[chatId]
    return typingUsers?.length ? <div data-testid="typing-indicator">{typingUsers[0].displayName} is typing...</div> : null
  },
}))

describe('Chat Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useChatStore.getState().reset()
    useAuthStore.setState({
      user: { unique_id: 111111, display_name: 'Me' } as any,
    })
    mockMessagesState.messages = []
    mockMessagesState.loading = false
  })

  it('shows loading state when no active chat is selected (handled by AppLayout)', () => {
    const { container } = render(<ChatWindow chatId={null as unknown as string} />)
    expect(container.innerHTML).toContain('Loading conversation')
  })

  it('renders messages and handles typing indicators correctly', () => {
    const store = useChatStore.getState()
    const chatId = 'chat-1'

    store.addChat({ id: chatId, participant_1_id: 111111, participant_2_id: 222222 } as any)
    store.setActiveChatId(chatId)

    mockMessagesState.messages = [
      { id: 'm1', content: 'Hello there', sender_unique_id: 222222 },
      { id: 'm2', content: 'Hi!', sender_unique_id: 111111 },
    ]

    render(<ChatWindow chatId={chatId} />)

    expect(screen.getAllByTestId('msg-bubble')).toHaveLength(2)
    expect(screen.getByText('Hello there')).toBeInTheDocument()
    expect(screen.getByText('Hi!')).toBeInTheDocument()
  })

  it('displays typing indicator when remote user is typing', () => {
    const store = useChatStore.getState()
    const chatId = 'chat-1'

    store.addChat({ id: chatId } as any)
    store.setActiveChatId(chatId)
    store.setTypingUsers(chatId, [{ userId: 222222, displayName: 'Alice' }])

    render(<ChatWindow chatId={chatId} />)

    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument()
    expect(screen.getByText('Alice is typing...')).toBeInTheDocument()
  })
})
