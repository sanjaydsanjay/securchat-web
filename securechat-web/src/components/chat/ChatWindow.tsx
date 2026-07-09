import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { Loader } from '@/components/shared/Loader'
import { Input } from '@/components/ui/input'
import { Search, X, Lock } from 'lucide-react'
import { useMessages } from '@/hooks/useMessages'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { useChatStore } from '@/stores/chatStore'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { messageService } from '@/services/messageService'
import { initScreenshotDetection, createScreenshotBlur } from '@/utils/screenshotDetect'
import type { SendMessagePayload } from '@/types/message'

interface ChatWindowProps {
  chatId: string
}

function ChatWindowInner({ chatId }: ChatWindowProps) {
  const [showSearch, setShowSearch] = useState(false)
  const { messages, loading, hasMore, loadingMore, loadMore, sendMessage, editMessage, deleteMessage, addReaction, toggleStar, markAllAsRead } = useMessages(chatId)
  const { startTyping } = useTypingIndicator(chatId)
  const chats = useChatStore((s) => s.chats)
  const { searchQuery, setSearchQuery, searchResults, setSearchResults } = useChatStore()
  const { addStarredMessage, removeStarredMessage } = useUserStore()
  const user = useAuthStore((s) => s.user)
  const chat = chats.find((c) => c.id === chatId)
  const scrollRef = useRef<HTMLDivElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const scrollThrottleRef = useRef(false)

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return true
    return el.scrollHeight - el.scrollTop - el.clientHeight < 300
  }, [])

  const scrollToBottom = useCallback(() => {
    if (messages.length === 0) return
    const el = scrollRef.current
    if (!el) return
    requestAnimationFrame(() => { el.scrollTop = el.scrollHeight })
  }, [messages.length])

  useEffect(() => {
    if (!showSearch && messages.length > 0 && isNearBottom()) {
      scrollToBottom()
    }
  }, [messages.length, showSearch, isNearBottom, scrollToBottom])

  useEffect(() => {
    if (chatId) markAllAsRead()
  }, [chatId, markAllAsRead])

  useEffect(() => {
    if (!chatId || !user?.unique_id) return
    createScreenshotBlur()
    const cleanup = initScreenshotDetection(chatId, user.unique_id)
    return cleanup
  }, [chatId, user?.unique_id])

  useEffect(() => {
    if (!loading && messages.length > 0 && scrollRef.current) {
      scrollToBottom()
    }
  }, [loading])

  const handleScroll = () => {
    if (scrollThrottleRef.current) return
    scrollThrottleRef.current = true
    setTimeout(() => { scrollThrottleRef.current = false }, 200)

    const el = scrollRef.current
    if (el && el.scrollTop < 100 && hasMore && !loadingMore) {
      loadMore()
    }
  }

  const handleSearchQuery = useCallback(async (query: string) => {
    setSearchQuery(query)
    if (!chatId || !query.trim()) {
      setSearchResults([])
      return
    }
    const { data } = await messageService.searchMessages(chatId, query)
    if (data) setSearchResults(data)
  }, [chatId, setSearchQuery, setSearchResults])

  const toggleSearch = useCallback(() => {
    const next = !showSearch
    setShowSearch(next)
    if (!next) {
      setSearchQuery('')
      setSearchResults([])
    } else {
      setTimeout(() => searchInputRef.current?.focus(), 100)
    }
  }, [showSearch, setSearchQuery, setSearchResults])

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') toggleSearch()
  }, [toggleSearch])

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchResults([])
    searchInputRef.current?.focus()
  }, [setSearchQuery, setSearchResults])

  const handleSend = async (payload: SendMessagePayload) => {
    const result = await sendMessage(payload)
    if (result?.error) {
      console.error('[ChatWindow] Send failed:', result.error)
    }
  }

  const handleTyping = () => { startTyping() }

  const handleStar = useCallback(async (messageId: string) => {
    const store = useUserStore.getState()
    const isStarred = store.starredMessages.includes(messageId)
    if (isStarred) {
      removeStarredMessage(messageId)
    } else {
      addStarredMessage(messageId)
    }
    const { error } = await toggleStar?.(messageId) || {}
    if (error) {
      if (isStarred) { addStarredMessage(messageId) } else { removeStarredMessage(messageId) }
    }
  }, [addStarredMessage, removeStarredMessage, toggleStar])

  if (!chat) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading conversation...</div>
  }

  return (
    <div className="h-full flex flex-col">
      <ChatHeader chat={chat} onSearchToggle={toggleSearch} showSearch={showSearch} />

      {showSearch && (
        <div className="px-3 md:px-[30px] py-3 bg-white border-b border-gray-200/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a99a8]" />
            <Input
              ref={searchInputRef}
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => handleSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              aria-label="Search messages"
              className="pl-9 pr-9 bg-gray-100 border-none h-9 text-sm rounded-lg"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8a99a8] hover:text-[#2b3a4a]">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-[#8a99a8] mt-1">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
            </p>
          )}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 px-2 md:px-[30px] py-3 md:py-5 overflow-y-auto flex flex-col gap-5"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        tabIndex={0}
      >
        {loadingMore && !showSearch && (
          <div className="flex justify-center py-2" role="status" aria-label="Loading more messages">
            <Loader size="sm" />
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8" role="status" aria-label="Loading messages">
            <Loader />
          </div>
        ) : showSearch ? (
          searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-[#8a99a8] text-sm">
              <Search className="w-8 h-8 mb-2 opacity-50" />
              <p>No messages match &quot;{searchQuery}&quot;</p>
            </div>
          ) : (
            <div role="list" aria-label="Search results" className="space-y-1">
              {searchResults.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  chat={chat}
                  onStar={() => handleStar(msg.id)}
                  onReact={(emoji) => addReaction(msg.id, emoji)}
                />
              ))}
            </div>
          )
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 md:px-8">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-[#5c7cfa]/10 flex items-center justify-center mb-4">
              <Lock className="w-4 h-4 md:w-5 md:h-5 text-[#5c7cfa]" />
            </div>
            <p className="text-[#2b3a4a] font-medium text-sm md:text-base">No messages yet</p>
            <p className="text-xs md:text-sm text-[#8a99a8] mt-1">Say hello to start the conversation</p>
            <p className="text-[10px] mt-4 text-[#8a99a8] flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Messages are end-to-end encrypted
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {messages.map((msg) => (
              <div key={msg.id} className="message-enter">
                <MessageBubble
                  message={msg}
                  chat={chat}
                  onEdit={(content) => editMessage(msg.id, content)}
                  onDelete={(forEveryone) => deleteMessage(msg.id, forEveryone ? 'everyone' : 'me')}
                  onReact={(emoji) => addReaction(msg.id, emoji)}
                  onStar={() => handleStar(msg.id)}
                />
              </div>
            ))}
          </div>
        )}

        {!showSearch && <TypingIndicator chatId={chatId} />}
        <div ref={bottomRef} />
      </div>

      <MessageInput
        chatId={chatId}
        onSend={handleSend}
        onTyping={handleTyping}
      />
    </div>
  )
}

export const ChatWindow = memo(ChatWindowInner)
