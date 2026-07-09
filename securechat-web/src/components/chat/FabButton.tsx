import { MessageSquare } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'

export function FabButton() {
  const setShowFabSearch = useUIStore((s) => s.setShowFabSearch)

  return (
    <button onClick={() => setShowFabSearch(true)}
      className="md:hidden fixed bottom-[76px] right-5 z-20 w-14 h-14 rounded-[18px] bg-[#5c7cfa] text-white shadow-premium-lg hover:shadow-premium-md hover:-translate-y-0.5 transition-all flex items-center justify-center"
      aria-label="New chat"
    >
      <MessageSquare className="w-6 h-6" />
    </button>
  )
}
