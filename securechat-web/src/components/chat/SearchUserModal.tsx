import { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { SearchUser } from './SearchUser'
import { useUIStore } from '@/stores/uiStore'

export function SearchUserModal() {
  const showFabSearch = useUIStore((s) => s.showFabSearch)
  const setShowFabSearch = useUIStore((s) => s.setShowFabSearch)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showFabSearch) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowFabSearch(false) }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [showFabSearch, setShowFabSearch])

  if (!showFabSearch) return null

  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] md:pt-[20vh]"
      onClick={(e) => { if (e.target === overlayRef.current) setShowFabSearch(false) }}
    >
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="relative w-full max-w-md mx-4 rounded-[28px] bg-white dark:bg-dark-surface shadow-premium-lg overflow-hidden animate-scaleIn">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border dark:border-dark-border">
          <h2 className="text-sm font-bold text-text-primary dark:text-dark-text">New Conversation</h2>
          <button onClick={() => setShowFabSearch(false)} className="p-1.5 rounded-[14px] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>
        <div onClick={() => setShowFabSearch(false)}><SearchUser /></div>
      </div>
    </div>
  )
}
