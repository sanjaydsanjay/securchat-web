import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Search, Loader2 } from 'lucide-react'
import { useChat } from '@/hooks/useChat'
import { useAuthStore } from '@/stores/authStore'
import { userService } from '@/services/userService'
import { isValidUniqueId } from '@/utils/generateUniqueId'

const SEARCH_TIMEOUT = 15000

interface SearchStatus {
  type: 'idle' | 'searching' | 'found' | 'not_found' | 'error' | 'self'
  message?: string
}

export function SearchUser() {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<SearchStatus>({ type: 'idle' })
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const { createChat } = useChat()
  const currentUser = useAuthStore((s) => s.user)
  const myUniqueId = currentUser?.unique_id

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return

    const id = parseInt(trimmed, 10)
    if (!isValidUniqueId(id) || trimmed.length !== 6) {
      setStatus({ type: 'not_found', message: 'Invalid Unique ID' })
      return
    }

    if (id === myUniqueId) {
      setStatus({ type: 'self', message: 'That is your own Unique ID' })
      return
    }

    setStatus({ type: 'searching' })
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timeout = setTimeout(() => {
      controller.abort()
      if (status.type === 'searching') {
        setStatus({ type: 'error', message: 'Search timed out. Please try again.' })
      }
    }, SEARCH_TIMEOUT)

    try {
      const { data, error } = await userService.getUserByUniqueId(id)

      if (controller.signal.aborted) return

      if (error) {
        setStatus({ type: 'error', message: 'Unable to search user. Please try again.' })
        return
      }

      if (!data) {
        setStatus({ type: 'not_found', message: 'Invalid Unique ID' })
        return
      }

      const chat = await createChat({ participant_unique_id: data.unique_id })

      if (controller.signal.aborted) return

      if (chat) {
        setQuery('')
        setStatus({ type: 'idle' })
        toast.success('Chat created!')
      } else {
        console.error('create_chat RPC failed: returned null')
        toast.error('Unable to create chat. Please try again.')
        setStatus({ type: 'error', message: 'Unable to create chat. Please try again.' })
      }
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      console.error('create_chat RPC failed', err)
      toast.error('Unable to create chat. Please try again.')
      setStatus({ type: 'error', message: 'Unable to search user. Please try again.' })
    } finally {
      clearTimeout(timeout)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-[15px] top-1/2 -translate-y-1/2 w-4 h-4 text-[#8a99a8]" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (status.type !== 'idle' && status.type !== 'searching') setStatus({ type: 'idle' })
            }}
            onKeyDown={handleKeyDown}
            placeholder="Enter 6-digit Unique ID"
            maxLength={6}
            className="w-full h-[48px] pl-[45px] pr-4 rounded-[14px] bg-[#fafbfe] border border-[#e2e8f0] text-[14px] text-[#2b3a4a] outline-none"
            aria-label="Enter 6-digit Unique ID"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={status.type === 'searching' || !query.trim()}
          className="h-[48px] px-5 rounded-[14px] bg-[#5c7cfa] text-white text-sm font-medium hover:bg-[#4c6ef5] transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {status.type === 'searching' ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Search'
          )}
        </button>
      </div>

      {status.type === 'not_found' && (
        <p className="text-xs text-red-500 px-1">{status.message}</p>
      )}
      {status.type === 'self' && (
        <p className="text-xs text-yellow-500 px-1">{status.message}</p>
      )}
      {status.type === 'error' && (
        <p className="text-xs text-red-500 px-1">{status.message}</p>
      )}
    </div>
  )
}
