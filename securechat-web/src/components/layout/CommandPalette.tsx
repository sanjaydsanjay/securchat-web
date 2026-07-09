import { useState, useEffect, useRef } from 'react'
import { Search, MessageSquare, Moon, Sun } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useTheme } from '@/hooks/useTheme'

const commands = [
  { id: 'search', icon: Search, label: 'Search user', shortcut: 'Ctrl+K' },
  { id: 'new-chat', icon: MessageSquare, label: 'New chat', shortcut: 'Ctrl+N' },
  { id: 'toggle-theme', icon: Sun, label: 'Toggle theme', shortcut: 'Ctrl+Shift+D' },
]

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUIStore()
  const { toggleTheme } = useTheme()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (commandPaletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setQuery('')
    }
  }, [commandPaletteOpen])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(!commandPaletteOpen)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [commandPaletteOpen])

  if (!commandPaletteOpen) return null

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setCommandPaletteOpen(false)}>
      <div className="fixed inset-0 bg-black/50" />
      <div className="relative w-full max-w-lg rounded-xl bg-white dark:bg-gray-800 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command..."
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <kbd className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">ESC</kbd>
        </div>
        <div className="p-2 max-h-64 overflow-y-auto">
          {filtered.map((cmd) => (
            <button
              key={cmd.id}
              onClick={() => {
                if (cmd.id === 'toggle-theme') toggleTheme()
                setCommandPaletteOpen(false)
              }}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <cmd.icon className="w-4 h-4 text-gray-400" />
              <span>{cmd.label}</span>
              <kbd className="ml-auto text-xs text-gray-400">{cmd.shortcut}</kbd>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
