import { memo, useState } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'
import { MessageReactionsDisplay } from './MessageReactions'
import { ReactionPicker } from './ReactionPicker'
import { Check, CheckCheck, Clock, AlertCircle, Lock } from 'lucide-react'
import type { Message } from '@/types/message'
import type { Chat } from '@/types/chat'

interface MessageBubbleProps {
  message: Message
  chat: Chat
  onEdit?: (content: string) => void
  onDelete?: (forEveryone: boolean) => void
  onReact?: (emoji: string) => void
  onStar?: () => void
}

export const MessageBubble = memo(function MessageBubble({ message, chat, onEdit, onDelete, onReact, onStar }: MessageBubbleProps) {
  const user = useAuthStore((s) => s.user)
  const starredMessages = useUserStore((s) => s.starredMessages)
  const isOwn = message.sender_unique_id === user?.unique_id
  const [showActions, setShowActions] = useState(false)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const isStarred = starredMessages.includes(message.id)

  if (message.deleted_for?.includes(user?.unique_id ?? -1)) return null

  if (message.is_deleted) {
    return (
      <div className={`flex mb-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div className="text-xs text-[#8a99a8] italic px-3 py-2 bg-gray-50 rounded-[16px]">This message was deleted</div>
      </div>
    )
  }

  const renderStatus = () => {
    if (!isOwn) return null
    const readCount = message.read_by ? Object.keys(message.read_by).length : 0
    const hasRead = readCount > 1 || (readCount === 1 && !message.read_by?.[user?.unique_id?.toString() || ''])
    const isDelivered = message.delivered_at

    if (message.status === 'sending') return <Clock className="w-3.5 h-3.5 text-white/60" />
    if (message.status === 'failed') return <AlertCircle className="w-3.5 h-3.5 text-red-400" />
    if (hasRead) return <CheckCheck className="w-3.5 h-3.5 text-white/90" />
    if (isDelivered) return <CheckCheck className="w-3.5 h-3.5 text-white/60" />
    return <Check className="w-3.5 h-3.5 text-white/60" />
  }

  const renderContent = () => {
    if (message.media_url) {
      let mediaEl: React.ReactNode = null
      switch (message.content_type) {
        case 'image':
          mediaEl = <img src={message.media_url} alt="Shared image" className="mb-1 max-w-[280px] rounded-[16px] object-cover cursor-pointer" loading="lazy" onClick={() => window.open(message.media_url!, '_blank')} />
          break
        case 'video':
          mediaEl = <video src={message.media_url} controls className="mb-1 max-w-[280px] rounded-[16px]" />
          break
        case 'voice':
          mediaEl = <audio src={message.media_url} controls className="mb-1 w-full max-w-[240px] h-8" />
          break
        case 'document':
          mediaEl = <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="mb-1 flex items-center gap-2 text-sm underline">📎 {message.media_url.split('/').pop()}</a>
          break
      }
      return <>{mediaEl}{message.content && <p className="text-sm mt-1">{message.content}</p>}</>
    }
    return <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">{message.content}</p>
  }

  return (
    <div className={`flex mb-1.5 group ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={`relative max-w-[75%] md:max-w-[65%] px-[18px] py-[14px] text-[13.5px] leading-relaxed ${
        isOwn
          ? 'bg-[#5c7cfa] text-white rounded-[18px] rounded-tr-[4px]'
          : 'bg-white text-[#2b3a4a] rounded-[18px] rounded-tl-[4px]'
      }`}>
        {message.reply_to_id && message.reply_to && (
          <div className={`mb-2 pl-2.5 border-l-2 rounded-sm ${isOwn ? 'border-white/40' : 'border-gray-300'}`}>
            <p className={`text-[11px] font-medium ${isOwn ? 'text-white/80' : 'text-[#8a99a8]'}`}>
              {message.reply_to.sender_unique_id === user?.unique_id ? 'You' : chat.other_user?.display_name || 'User'}
            </p>
            <p className={`text-xs truncate ${isOwn ? 'text-white/60' : 'text-[#8a99a8]'}`}>{message.reply_to.content}</p>
          </div>
        )}
        {message.is_forwarded && (
          <p className={`text-[11px] font-medium mb-1 flex items-center gap-1 ${isOwn ? 'text-white/70' : 'text-[#8a99a8]'}`}>
            <span className="text-[10px]">↪</span> Forwarded
          </p>
        )}
        {message.e2e_encrypted && (
          <p className={`text-[10px] mb-1 flex items-center gap-1 ${isOwn ? 'text-white/50' : 'text-[#8a99a8]'}`}>
            <Lock className="w-2.5 h-2.5" /> Encrypted
          </p>
        )}
        {renderContent()}
        {message.is_edited && <span className={`text-[10px] ${isOwn ? 'text-white/50' : 'text-[#8a99a8]'}`}> (edited)</span>}
        <div className={`flex items-center justify-end gap-1 mt-[5px] text-[10px] ${isOwn ? 'text-white/70' : 'text-[#8a99a8]'}`}>
          <span className="font-medium">
            {new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {renderStatus()}
        </div>
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className="mt-1.5"><MessageReactionsDisplay reactions={message.reactions} onReact={(emoji) => onReact?.(emoji)} /></div>
        )}
        {showReactionPicker && (
          <div className="absolute -top-10 left-0 z-50"><ReactionPicker onReact={(emoji) => onReact?.(emoji)} onClose={() => setShowReactionPicker(false)} /></div>
        )}
        {showActions && (
          <div className={`absolute -top-8 flex gap-0.5 bg-white rounded-[16px] shadow-lg border border-gray-100 px-2 py-1 ${isOwn ? 'right-0' : 'left-0'}`}>
            <button onClick={() => setShowReactionPicker(true)} className="p-0.5 hover:bg-gray-100 rounded-[8px] text-xs">😊</button>
            <button onClick={() => onStar?.()} className={`p-0.5 hover:bg-gray-100 rounded-[8px] text-xs ${isStarred ? 'text-yellow-500' : ''}`}>{isStarred ? '★' : '☆'}</button>
            {isOwn && (
              <>
                <button onClick={() => onEdit?.(message.content)} className="p-0.5 hover:bg-gray-100 rounded-[8px] text-xs">✏️</button>
                <button onClick={() => onDelete?.(false)} className="p-0.5 hover:bg-gray-100 rounded-[8px] text-xs">🗑️</button>
                <button onClick={() => onDelete?.(true)} className="p-0.5 hover:bg-gray-100 rounded-[8px] text-xs">🚫</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
})
