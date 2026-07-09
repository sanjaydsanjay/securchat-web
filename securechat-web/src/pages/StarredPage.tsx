import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Star } from 'lucide-react'
import { messageService } from '@/services/messageService'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import type { Message } from '@/types/message'

export function StarredPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const chats = useChatStore((s) => s.chats)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      const { data } = await messageService.getStarredMessages()
      if (data) setMessages(data)
      setLoading(false)
    }
    load()
  }, [])

  const getChatName = (msg: Message) => {
    if (!user) return 'Unknown'
    const otherId = msg.sender_unique_id === user.unique_id ? msg.receiver_unique_id : msg.sender_unique_id
    const chat = chats.find((c) =>
      (c.participant_1_id === user.unique_id && c.participant_2_id === otherId) ||
      (c.participant_2_id === user.unique_id && c.participant_1_id === otherId)
    )
    return chat?.other_user?.display_name || `User ${otherId}`
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-500" /> Starred Messages
        </h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Loading...</p>
        </div>
      ) : messages.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Star className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No starred messages yet</p>
          <p className="text-xs mt-1">Hover over any message and click the star icon to save it here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className="p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <p className="text-sm">{msg.content}</p>
              <p className="text-xs text-gray-400 mt-1">
                {msg.sender_unique_id === user?.unique_id ? 'You' : getChatName(msg)} ·{' '}
                {new Date(msg.created_at).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default StarredPage
