import { useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatListItem } from './ChatListItem'
import { SearchUser } from './SearchUser'
import { Search, ArrowLeft } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export function ChatList() {
  const { activeChatId, selectChat, searchChats } = useChat()
  const [searchQuery, setSearchQuery] = useState('')
  const setMobileView = useUIStore((s) => s.setMobileView)
  const filteredChats = searchChats(searchQuery)

  const handleSelectChat = (chatId: string) => {
    selectChat(chatId)
    if (window.innerWidth < 768) {
      setMobileView('chat')
    }
  }

  return (
    <div className="h-full flex flex-col bg-white md:rounded-[20px] pb-16 md:pb-0">
      <div className="p-4 md:p-[20px] flex flex-col gap-4 md:gap-[20px]">
        <div className="relative">
          <Search className="absolute left-[15px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a99a8]" />
          <input
            placeholder="Search by unique ID"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-[48px] pl-[45px] pr-4 rounded-[14px] bg-[#fafbfe] border border-[#e2e8f0] text-[14px] text-[#2b3a4a] outline-none"
          />
        </div>
        <SearchUser />
      </div>

      <div className="flex-1 overflow-y-auto px-2 md:px-[4px] space-y-2 md:space-y-[12px] pb-4">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-[#8a99a8] text-sm px-6 text-center">
            <Search className="w-8 h-8 mb-2 opacity-30" />
            {searchQuery ? <p>No chats match "{searchQuery}"</p> : <><p>No chats yet</p><p className="text-xs mt-1 opacity-60">Enter a 6-digit unique ID above to search</p></>}
          </div>
        ) : (
          <div>
            {filteredChats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} active={chat.id === activeChatId} onClick={() => handleSelectChat(chat.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
