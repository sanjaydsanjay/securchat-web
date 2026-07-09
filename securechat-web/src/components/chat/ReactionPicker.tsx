import { useEffect, useRef } from 'react'
import { REACTION_EMOJIS } from '@/lib/constants'

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

interface ReactionPickerProps {
  onReact: (emoji: string) => void
  onClose: () => void
}

export function ReactionPicker({ onReact, onClose }: ReactionPickerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="flex gap-1 p-1.5 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700"
    >
      {REACTION_EMOJIS.map((key) => (
        <button
          key={key}
          onClick={() => {
            onReact(key)
            onClose()
          }}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-lg transition-transform hover:scale-125"
          title={key.replace('_', ' ')}
        >
          {EMOJI_MAP[key]}
        </button>
      ))}
    </div>
  )
}
