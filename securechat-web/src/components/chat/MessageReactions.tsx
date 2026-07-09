import type { MessageReactions } from '@/types/message'

interface MessageReactionsProps {
  reactions: MessageReactions
  onReact: (emoji: string) => void
}

const EMOJI_MAP: Record<string, string> = {
  thumbs_up: '👍',
  heart: '❤️',
  laughing: '😂',
  surprised: '😮',
  sad: '😢',
  pray: '🙏',
  fire: '🔥',
  clap: '👏',
}

export function MessageReactionsDisplay({ reactions, onReact }: MessageReactionsProps) {
  const entries = Object.entries(reactions).filter(([, users]) => users.length > 0)

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {entries.map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => onReact(emoji)}
          className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-xs hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          <span>{EMOJI_MAP[emoji] || emoji}</span>
          <span className="text-gray-500">{users.length}</span>
        </button>
      ))}
    </div>
  )
}
