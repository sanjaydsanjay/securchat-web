import { X } from 'lucide-react'
import type { Message } from '@/types/message'

interface ReplyPreviewProps {
  message: Message | null
  onClose: () => void
}

export function ReplyPreview({ message, onClose }: ReplyPreviewProps) {
  if (!message) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 border-l-4 border-[#128C7E]">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-[#128C7E]">Replying to message</p>
        <p className="text-sm truncate text-gray-600 dark:text-gray-300">{message.content}</p>
      </div>
      <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
