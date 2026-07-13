import { memo } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import { formatChatTime } from '@/utils/formatTime'
import { Check, CheckCheck, Clock, AlertCircle, Trash2 } from 'lucide-react'
import type { Chat } from '@/types/chat'
import type { MessageStatus } from '@/types/message'

interface ChatListItemProps { chat: Chat; active: boolean; onClick: () => void; onDelete?: () => void }

function getLastMessageStatus(chatId: string, currentUserId: number): MessageStatus | null {
  const messages = useChatStore.getState().messages[chatId]
  if (!messages || messages.length === 0) return null
  const lastMsg = messages[messages.length - 1]
  if (lastMsg.sender_unique_id !== currentUserId) return null
  return lastMsg.status || 'sent'
}

export const ChatListItem = memo(function ChatListItem({ chat, active, onClick, onDelete }: ChatListItemProps) {
  const user = useAuthStore((s) => s.user)
  const onlineUserIds = useChatStore((s) => s.onlineUserIds)
  const isOnline = onlineUserIds.includes(chat.other_user?.unique_id ?? -1)

  const unreadCount = chat.participant_1_id === user?.unique_id ? chat.unread_count_1 : chat.unread_count_2
  const lastMessageTime = chat.last_message_time ? formatChatTime(chat.last_message_time) : ''
  const isUnread = unreadCount > 0
  const hasPreview = !!chat.last_message_preview

  let lastMsgStatus: MessageStatus | null = null
  if (user && hasPreview) lastMsgStatus = getLastMessageStatus(chat.id, user.unique_id)

  const renderStatusIcon = () => {
    if (!hasPreview) return null
    switch (lastMsgStatus) {
      case 'sending': return <Clock className="w-3.5 h-3.5 text-[#8a99a8] shrink-0" />
      case 'failed': return <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
      case 'read': return <CheckCheck className="w-3.5 h-3.5 shrink-0" />
      case 'delivered': return <CheckCheck className="w-3.5 h-3.5 text-[#8a99a8] shrink-0" />
      case 'sent': return <Check className="w-3.5 h-3.5 text-[#8a99a8] shrink-0" />
      default: return null
    }
  }

  return (
    <div className={cn('relative group', active ? '' : '')}>
      <button
        onClick={onClick}
        className={cn(
          'w-full flex gap-3 p-4 rounded-[16px] transition-colors text-left',
          active ? 'bg-[#5c7cfa] text-white' : 'bg-[#f1f3f9] hover:bg-[#e8ebf3]'
        )}
      >
        <div className="relative shrink-0">
          <div className="w-[42px] h-[42px] rounded-full bg-[#cbd5e1] flex items-center justify-center text-[#64748b] text-sm font-medium">
            {chat.other_user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          {isOnline && (
            <span className="absolute bottom-0 right-0 w-[10px] h-[10px] bg-[#3cd180] border-2 border-white rounded-full" />
          )}
        </div>
        {onDelete && (
          <span
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/80 hover:bg-red-50 text-[#8a99a8] hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm cursor-pointer"
            title="Delete chat"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onDelete() } }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </span>
        )}
        <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-[4px]">
          <span className={cn('font-semibold text-[14px] truncate', active ? 'text-white' : 'text-[#2b3a4a]')}>
            {chat.other_user?.display_name || `User ${chat.participant_2_id}`}
          </span>
          {lastMessageTime && (
            <span className={cn('text-[11px] shrink-0 ml-2', active ? 'text-white/70' : 'text-[#8a99a8]')}>
              {lastMessageTime}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {renderStatusIcon()}
          <span className={cn('text-[12px] truncate', active ? 'text-white/85' : 'text-[#8a99a8]')}>
            {chat.last_message_preview || 'No messages yet'}
          </span>
        </div>
        <div className="flex justify-end mt-1">
          {isUnread && (
            <span className="bg-[#3cd180] text-white text-[10px] font-bold rounded-[10px] min-w-[20px] h-[18px] flex items-center justify-center px-[6px]">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          {!isUnread && hasPreview && lastMsgStatus && (
            <span className="text-[12px] text-[#8a99a8] flex items-center gap-1">
              {renderStatusIcon()}
            </span>
          )}
        </div>
      </div>
    </button>
    </div>
  )
})
