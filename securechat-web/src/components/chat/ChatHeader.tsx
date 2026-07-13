import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog } from '@/components/ui/dialog'
import { ProfileModal } from '@/components/modals/ProfileModal'
import { ChatExport } from './ChatExport'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { useBlock } from '@/hooks/useBlock'
import { useChat } from '@/hooks/useChat'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Search, ChevronLeft, Trash2, Download, Flag, Shield, UserCircle, Star, MessageSquare } from 'lucide-react'
import type { Chat } from '@/types/chat'

interface ChatHeaderProps {
  chat: Chat
  onSearchToggle?: () => void
  showSearch?: boolean
}

export function ChatHeader({ chat, onSearchToggle, showSearch }: ChatHeaderProps) {
  const onlineUserIds = useChatStore((s) => s.onlineUserIds)
  const user = useAuthStore((s) => s.user)
  const { selectChat } = useChat()
  const { blockUser } = useBlock()
  const navigate = useNavigate()
  const isOnline = onlineUserIds.includes(chat.other_user?.unique_id ?? -1)
  const [menuOpen, setMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleBack = () => selectChat(null)

  const handleBlock = async () => {
    if (!chat.other_user?.unique_id) return
    await blockUser(chat.other_user.unique_id)
    setShowBlockModal(false)
  }

  const handleClearChat = () => {
    useChatStore.getState().setMessages(chat.id, [])
    setShowClearConfirm(false)
  }

  const handleDeleteChat = () => {
    const store = useChatStore.getState()
    store.setChats(store.chats.filter((c) => c.id !== chat.id))
    if (store.activeChatId === chat.id) selectChat(null)
    setShowDeleteConfirm(false)
  }

  const menuItems = [
    { icon: <UserCircle className="w-4 h-4" />, label: 'View Profile', onClick: () => { setMenuOpen(false); setShowProfile(true) } },
    { icon: <Star className="w-4 h-4" />, label: 'Starred Messages', onClick: () => { setMenuOpen(false); navigate('/starred') } },
    { icon: <MessageSquare className="w-4 h-4" />, label: 'Clear Chat', onClick: () => { setMenuOpen(false); setShowClearConfirm(true) } },
    { icon: <Download className="w-4 h-4" />, label: 'Export Chat', onClick: () => { setMenuOpen(false); setShowExport(true) } },
    { icon: <Flag className="w-4 h-4" />, label: 'Report User', onClick: () => { setMenuOpen(false); setShowReportModal(true) } },
    { icon: <Shield className="w-4 h-4" />, label: 'Block User', onClick: () => { setMenuOpen(false); setShowBlockModal(true) } },
    { icon: <Trash2 className="w-4 h-4 text-red-500" />, label: 'Delete Chat', onClick: () => { setMenuOpen(false); setShowDeleteConfirm(true) }, danger: true },
  ]

  return (
    <>
      <div className="flex items-center justify-between px-4 md:px-[30px] py-3 md:py-5 bg-transparent border-b border-gray-200/50">
        <div className="flex items-center gap-3 min-w-0 cursor-pointer" onClick={() => setShowProfile(true)}>
          <button onClick={(e) => { e.stopPropagation(); handleBack() }} className="md:hidden p-1 -ml-1 text-[#54656F] hover:bg-black/5 rounded-full transition-colors" aria-label="Back">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div className="w-[42px] h-[42px] rounded-full bg-[#cbd5e1] flex items-center justify-center text-[#64748b] text-sm font-medium shrink-0">
            {chat.other_user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0">
            <h2 className="font-semibold text-[15px] md:text-[16px] text-[#2b3a4a] truncate max-w-[120px] md:max-w-none">
              {chat.other_user?.display_name || `User ${chat.participant_2_id}`}
            </h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isOnline ? (
                <span className="text-[12px] md:text-[13px] text-[#8a99a8]">online</span>
              ) : chat.other_user?.unique_id ? (
                <span className="text-[12px] md:text-[13px] text-[#8a99a8]">ID: {chat.other_user.unique_id}</span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-5 text-[#8a99a8]">
          <button onClick={onSearchToggle} className="hover:text-[#2b3a4a] transition-colors">
            <Search className="w-5 h-5" />
          </button>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!menuOpen)} className="hover:text-[#2b3a4a] transition-colors">
              <MoreVertical className="w-5 h-5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-56 z-50 rounded-lg bg-white shadow-lg border border-gray-100 py-2 overflow-hidden">
                {menuItems.map((item) => (
                    <button
                      key={item.label}
                      onClick={item.onClick}
                      className={`w-full flex items-center gap-3 px-5 py-3 text-[14px] transition-colors ${
                        item.danger ? 'text-red-500 hover:bg-red-50' : 'text-[#2b3a4a] hover:bg-gray-50'
                      }`}
                    >
                      {item.icon}
                      {item.label}
                    </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfileModal open={showProfile} onClose={() => setShowProfile(false)} user={chat.other_user || null} />
      <ChatExport open={showExport} onClose={() => setShowExport(false)} chatId={chat.id} />
      <Dialog open={showClearConfirm} onClose={() => setShowClearConfirm(false)} title="Clear Chat" description="Clear all messages? This cannot be undone.">
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleClearChat}><Trash2 className="w-4 h-4 mr-1.5" />Clear</Button>
        </div>
      </Dialog>
      <Dialog open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete Chat" description="Remove this conversation from your chat list?">
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleDeleteChat}><Trash2 className="w-4 h-4 mr-1.5" />Delete</Button>
        </div>
      </Dialog>
      <Dialog open={showBlockModal} onClose={() => setShowBlockModal(false)} title="Block User" description={`Block ${chat.other_user?.display_name || 'this user'}?`}>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowBlockModal(false)}>Cancel</Button>
          <Button variant="destructive" onClick={handleBlock}><Shield className="w-4 h-4 mr-1.5" />Block</Button>
        </div>
      </Dialog>
      <Dialog open={showReportModal} onClose={() => setShowReportModal(false)} title="Report User" description={`Report ${chat.other_user?.display_name || 'this user'}?`}>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setShowReportModal(false)}>Cancel</Button>
          <Button variant="destructive" onClick={() => setShowReportModal(false)}><Flag className="w-4 h-4 mr-1.5" />Report</Button>
        </div>
      </Dialog>
    </>
  )
}
