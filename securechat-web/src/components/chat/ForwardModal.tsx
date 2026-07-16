import { Dialog } from '@/components/ui/dialog'
import { useChatStore } from '@/stores/chatStore'
import { useAuthStore } from '@/stores/authStore'
import { messageService } from '@/services/messageService'
import toast from 'react-hot-toast'
import type { Message } from '@/types/message'

interface ForwardModalProps {
  open: boolean
  message: Message | null
  currentChatId: string
  onClose: () => void
}

export function ForwardModal({ open, message, currentChatId, onClose }: ForwardModalProps) {
  const chats = useChatStore((s) => s.chats)
  const user = useAuthStore((s) => s.user)

  const targets = chats.filter((c) => c.id !== currentChatId)

  const handleForward = async (targetChatId: string) => {
    if (!message || !user) return
    const { error } = await messageService.forwardMessage(message.id, targetChatId, user.unique_id)
    if (error) {
      toast.error('Failed to forward message')
    } else {
      toast.success('Message forwarded')
    }
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Forward message" description="Choose a chat to forward this message to.">
      <div className="max-h-[50vh] overflow-y-auto -mx-2">
        {targets.length === 0 ? (
          <p className="text-sm text-[#8a99a8] py-4 text-center">No other chats available</p>
        ) : (
          targets.map((chat) => (
            <button
              key={chat.id}
              onClick={() => handleForward(chat.id)}
              className="w-full flex items-center gap-3 px-3 py-3 text-left rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-[#cbd5e1] flex items-center justify-center text-[#64748b] text-sm font-medium shrink-0">
                {chat.other_user?.display_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-[#2b3a4a] dark:text-gray-200 truncate">
                  {chat.other_user?.display_name || `User ${chat.participant_2_id}`}
                </p>
                <p className="text-xs text-[#8a99a8] truncate">
                  {message?.content || 'Media message'}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </Dialog>
  )
}
