import { useState, useCallback, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { useChat } from '@/hooks/useChat'
import { ChatListItem } from './ChatListItem'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Search, Trash2, Loader2, Send, Mic } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { chatService } from '@/services/chatService'
import { userService } from '@/services/userService'
import { isValidUniqueId } from '@/utils/generateUniqueId'

export function ChatList() {
  const { activeChatId, selectChat, searchChats, createChat } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)
  const [deleteConfirmChatId, setDeleteConfirmChatId] = useState<string | null>(null)
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('')
  const setMobileView = useUIStore((s) => s.setMobileView)
  const user = useAuthStore((s) => s.user)
  const filteredChats = searchChats(searchQuery)

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId)
    if (window.innerWidth < 768) {
      setMobileView('chat')
    }
  }

  const doSearch = useCallback(async () => {
    if (searching || !searchQuery.trim()) return

    const trimmed = searchQuery.trim()
    const id = parseInt(trimmed, 10)
    if (!isNaN(id) && isValidUniqueId(id) && trimmed.length === 6) {
      if (id === user?.unique_id) {
        toast.error('That is your own Unique ID')
        return
      }
      setSearching(true)
      const { data } = await userService.getUserByUniqueId(id)
      if (data) {
        const chat = await createChat({ participant_unique_id: data.unique_id })
        if (chat) {
          setSearchQuery('')
          toast.success('Chat created!')
        } else {
          toast.error('Unable to create chat')
        }
      } else {
        toast.error('User not found')
      }
      setSearching(false)
    }
  }, [searchQuery, searching, user?.unique_id, createChat])

  const handleSearchKeyDown = useCallback(async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') doSearch()
  }, [doSearch])

  const toggleListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
      setListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      toast.error('Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      if (result) setSearchQuery(result[0].transcript)
    }

    recognition.onerror = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognition.onend = () => {
      recognitionRef.current = null
      setListening(false)
    }

    recognition.start()
    recognitionRef.current = recognition
    setListening(true)
  }, [])

  useEffect(() => {
    return () => { recognitionRef.current?.abort() }
  }, [])

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmChatId) return
    await chatService.deleteChat(deleteConfirmChatId)
    const store = useChatStore.getState()
    store.setChats(store.chats.filter((c) => c.id !== deleteConfirmChatId))
    if (store.activeChatId === deleteConfirmChatId) selectChat(null)
    setDeleteConfirmChatId(null)
    setDeleteConfirmInput('')
  }

  return (
    <div className="h-full flex flex-col bg-white md:rounded-[20px] pb-16 md:pb-0">
      <div className="p-4 md:p-[20px]">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-[15px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a99a8]" />
            <input
              placeholder="Enter unique ID or search by name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              maxLength={50}
              className="w-full h-[48px] pl-[45px] pr-4 rounded-[14px] bg-[#fafbfe] border border-[#e2e8f0] text-[14px] text-[#2b3a4a] outline-none"
              aria-label="Search peoples"
            />
          </div>
          <button
            onClick={toggleListening}
            className={`h-[48px] w-[48px] flex items-center justify-center rounded-[14px] transition-colors shrink-0 ${
              listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 text-[#8a99a8] hover:bg-gray-200'
            }`}
            title="Voice input"
          >
            <Mic className="w-5 h-5" />
          </button>
          <button
            onClick={doSearch}
            disabled={searching || !/^\d{6}$/.test(searchQuery.trim())}
            className="h-[48px] w-[48px] flex items-center justify-center rounded-[14px] bg-[#5c7cfa] text-white hover:bg-[#4c6ef5] transition-colors disabled:opacity-50 shrink-0"
          >
            {searching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-2 md:px-[4px] space-y-[1px] pb-4">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#8a99a8] text-sm px-6 text-center">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            {searchQuery ? <p>No chats match "{searchQuery}"</p> : <><p>No chats yet</p><p className="text-xs mt-1 opacity-60">Search by name or enter a 6-digit Unique ID</p></>}
          </div>
        ) : (
          <div>
            {filteredChats.map((chat) => (
              <ChatListItem
                key={chat.id}
                chat={chat}
                active={chat.id === activeChatId}
                onClick={() => handleSelectChat(chat.id)}
                onDelete={() => { setDeleteConfirmChatId(chat.id); setDeleteConfirmInput('') }}
              />
            ))}
          </div>
        )}
      </div>

      <Dialog
        open={!!deleteConfirmChatId}
        onClose={() => { setDeleteConfirmChatId(null); setDeleteConfirmInput('') }}
        title="Delete Chat"
        description="Remove this conversation? Type your unique ID to confirm."
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
              onClick={() => { setDeleteConfirmChatId(null); setDeleteConfirmInput('') }}
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
