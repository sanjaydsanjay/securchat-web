import { useChatStore } from '@/stores/chatStore'

interface TypingIndicatorProps { chatId: string }

export function TypingIndicator({ chatId }: TypingIndicatorProps) {
  const typingUsers = useChatStore((s) => s.typingUsers[chatId])
  if (!typingUsers?.length) return null

  const names = typingUsers.map((u) => u.displayName)
  const label = names.length === 1 ? `${names[0]} is typing` : `${names.join(', ')} are typing`

  return (
    <div className="flex items-center gap-2.5 px-4 py-1.5">
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-typing dark:bg-dark-secondary rounded-full typing-dot" />
        <span className="w-2 h-2 bg-typing dark:bg-dark-secondary rounded-full typing-dot" style={{ animationDelay: '0.2s' }} />
        <span className="w-2 h-2 bg-typing dark:bg-dark-secondary rounded-full typing-dot" style={{ animationDelay: '0.4s' }} />
      </div>
      <span className="text-xs text-text-secondary dark:text-dark-secondary font-medium">{label}</span>
    </div>
  )
}
