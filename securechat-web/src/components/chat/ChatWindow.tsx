import { memo, useState, useEffect, useRef, useCallback } from 'react'
import { ChatHeader } from './ChatHeader'
import { MessageBubble } from './MessageBubble'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { Loader } from '@/components/shared/Loader'
import { Input } from '@/components/ui/input'
import { Dialog } from '@/components/ui/dialog'
import { Search, X, Lock, Trash2 } from 'lucide-react'
import { useMessages } from '@/hooks/useMessages'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { useChatStore } from '@/stores/chatStore'
import { useUserStore } from '@/stores/userStore'
import { useAuthStore } from '@/stores/authStore'
import { useIsMobile } from '@/hooks/useIsMobile'
import { messageService } from '@/services/messageService'
import { MessageActionSheet } from './MessageActionSheet'
import { ForwardModal } from './ForwardModal'
import { MessageInfoModal } from './MessageInfoModal'
import { initScreenshotDetection, createScreenshotBlur } from '@/utils/screenshotDetect'
import toast from 'react-hot-toast'
import type { SendMessagePayload } from '@/types/message'
import type { Message } from '@/types/message'

interface ChatWindowProps {
  chatId: string
}

function ChatWindowInner({ chatId }: ChatWindowProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ messageId: string; forEveryone: boolean } | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const [actionMessage, setActionMessage] = useState<Message | null>(null)
  const [actionOpen, setActionOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; content: string } | null>(null)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [forwardMessage, setForwardMessage] = useState<Message | null>(null)
  const [infoMessage, setInfoMessage] = useState<Message | null>(null)
  const isMobile = useIsMobile()
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
    const result = await sendMessage({ ...payload, reply_to_id: replyTo?.id ?? null })
    if (result?.error) {
      console.error('[ChatWindow] Send failed:', result.error)
    } else {
      setReplyTo(null)
    }
  }

  const handleTyping = () => { startTyping() }

  const handleDeleteClick = useCallback((messageId: string, forEveryone: boolean) => {
    setDeleteConfirm({ messageId, forEveryone })
    setDeleteConfirmInput('')
  }, [])

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteConfirm) return
    const { messageId, forEveryone } = deleteConfirm
    setDeleteConfirm(null)
    setDeleteConfirmInput('')
    await deleteMessage(messageId, forEveryone ? 'everyone' : 'me')
  }, [deleteConfirm, deleteMessage])

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

  const handleLongPress = useCallback((message: Message) => {
    setActionMessage(message)
    setActionOpen(true)
  }, [])

  const closeActionSheet = useCallback(() => setActionOpen(false), [])

  const handleActionReply = useCallback((message: Message) => {
    setReplyTo(message)
    setEditing(null)
  }, [])

  const handleActionCopy = useCallback(async (message: Message) => {
    const text = message.content || message.media_url || ''
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied to clipboard')
    } catch {
      toast.error('Could not copy')
    }
  }, [])

  const handleActionForward = useCallback((message: Message) => {
    setForwardMessage(message)
  }, [])

  const handleActionEdit = useCallback((message: Message) => {
    setEditing({ id: message.id, content: message.content })
    setReplyTo(null)
  }, [])

  const handleActionDelete = useCallback(async (message: Message, forEveryone: boolean) => {
    await deleteMessage(message.id, forEveryone ? 'everyone' : 'me')
  }, [deleteMessage])

  const handleSaveEdit = useCallback(async (content: string) => {
    if (!editing) return
    await editMessage(editing.id, content)
    setEditing(null)
  }, [editing, editMessage])

  if (!chat) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-sm">Loading conversation...</div>
  }

  const isOwnAction = actionMessage ? actionMessage.sender_unique_id === user?.unique_id : false

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
        className="flex-1 px-2 md:px-[30px] py-3 md:py-5 overflow-y-auto overflow-x-hidden flex flex-col gap-5 messages-scroll"
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
                  isMobile={isMobile}
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
                  isMobile={isMobile}
                  isSelected={actionOpen && actionMessage?.id === msg.id}
                  onLongPress={isMobile ? handleLongPress : undefined}
                  onEdit={(content) => editMessage(msg.id, content)}
                  onDelete={(forEveryone) => handleDeleteClick(msg.id, forEveryone)}
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
        replyTo={replyTo}
        onReplyClose={() => setReplyTo(null)}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        onSaveEdit={handleSaveEdit}
        onSend={handleSend}
        onTyping={handleTyping}
      />

      {isMobile && (
        <MessageActionSheet
          open={actionOpen}
          message={actionMessage}
          isOwn={isOwnAction}
          onClose={closeActionSheet}
          onReply={handleActionReply}
          onCopy={handleActionCopy}
          onForward={handleActionForward}
          onEdit={handleActionEdit}
          onDelete={handleActionDelete}
          onStar={(m) => handleStar(m.id)}
          onInfo={(m) => setInfoMessage(m)}
        />
      )}

      <ForwardModal
        open={!!forwardMessage}
        message={forwardMessage}
        currentChatId={chatId}
        onClose={() => setForwardMessage(null)}
      />

      <MessageInfoModal
        open={!!infoMessage}
        message={infoMessage}
        isOwn={infoMessage ? infoMessage.sender_unique_id === user?.unique_id : false}
        onClose={() => setInfoMessage(null)}
      />

      <Dialog
        open={!!deleteConfirm}
        onClose={() => { setDeleteConfirm(null); setDeleteConfirmInput('') }}
        title={deleteConfirm?.forEveryone ? 'Delete for everyone' : 'Delete for me'}
        description="Type your unique ID to confirm deletion. This action cannot be undone."
      >
        <div className="space-y-4">
          <Input
            placeholder="Enter your unique ID"
            value={deleteConfirmInput}
            onChange={(e) => setDeleteConfirmInput(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setDeleteConfirm(null); setDeleteConfirmInput('') }}
              className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteConfirm}
              disabled={deleteConfirmInput !== String(user?.unique_id ?? '')}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}

export const ChatWindow = memo(ChatWindowInner)
