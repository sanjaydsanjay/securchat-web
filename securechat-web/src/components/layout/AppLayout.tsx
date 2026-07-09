import { useChatStore } from '@/stores/chatStore'
import { useUIStore } from '@/stores/uiStore'
import { usePresence } from '@/hooks/usePresence'
import { useTheme } from '@/hooks/useTheme'
import { ChatList } from '@/components/chat/ChatList'
import { ChatWindow } from '@/components/chat/ChatWindow'
import { EmptyChatState } from '@/components/chat/EmptyChatState'
import { CommandPalette } from './CommandPalette'
import { NavSidebar } from './NavSidebar'
import { MobileNav } from './MobileNav'
import { FabButton } from '@/components/chat/FabButton'
import { SearchUserModal } from '@/components/chat/SearchUserModal'

export function AppLayout() {
  const activeChatId = useChatStore((s) => s.activeChatId)
  const mobileView = useUIStore((s) => s.mobileView)
  const isChatView = mobileView === 'chat' && activeChatId

  usePresence()
  useTheme()

  return (
    <div className="h-screen flex overflow-hidden bg-[#e2e4e6] p-0 md:p-[30px] gap-0 md:gap-[30px]">
      {/* Desktop Left - Navigation Sidebar */}
      <NavSidebar />

      {/* Middle - Chat List */}
      <div className={`
        w-full md:w-[340px] flex-shrink-0 bg-white md:rounded-[20px] overflow-hidden flex flex-col
        md:flex
        ${mobileView === 'chat' ? 'hidden md:flex' : 'flex'}
      `}>
        <ChatList />
      </div>

      {/* Right - Chat Window */}
      <div className={`
        bg-[#f1f3f9] flex-1 min-w-0 flex flex-col overflow-hidden
        md:relative md:rounded-[20px]
        fixed md:static inset-0 z-20 md:z-0
        transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
        ${mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}>
        {activeChatId ? (
          <ChatWindow chatId={activeChatId} />
        ) : (
          <EmptyChatState />
        )}
      </div>

      {/* Mobile bottom nav - hidden in chat view */}
      {!isChatView && <MobileNav />}
      {!isChatView && <FabButton />}
      <SearchUserModal />
      <CommandPalette />
    </div>
  )
}
