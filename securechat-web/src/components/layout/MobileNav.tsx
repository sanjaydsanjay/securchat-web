import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Home, MessageSquare, Menu, TrendingUp, User, LogOut, X } from 'lucide-react'

export function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [showMenu, setShowMenu] = useState(false)

  const isActive = (path?: string) => {
    if (!path) return false
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleLogout = async () => {
    setShowMenu(false)
    if (user) {
      await authService.signOut()
      useAuthStore.getState().reset()
    }
    navigate('/login')
  }

  const handleNav = (path: string) => {
    setShowMenu(false)
    navigate(path)
  }

  return (
    <>
      {showMenu && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setShowMenu(false)}
        />
      )}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#132238] rounded-t-[20px] shadow-premium-md">
        
        {/* Popup Menu */}
        {showMenu && (
          <div className="absolute bottom-20 right-4 bg-[#1e2f4c] rounded-xl shadow-xl overflow-hidden border border-white/10 min-w-[150px] animate-in slide-in-from-bottom-5">
            <div className="flex flex-col">
              <button
                onClick={() => handleNav(user ? '/profile' : '/login')}
                className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                <User className="w-4 h-4" /> Profile
              </button>
              <button
                onClick={() => handleNav('/premium')}
                className="flex items-center gap-3 px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition-colors text-sm border-t border-white/5"
              >
                <TrendingUp className="w-4 h-4" /> Premium
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors text-sm border-t border-white/5"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center justify-around h-16 px-4">
          <button
            onClick={() => handleNav('/intro')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all',
              location.pathname === '/intro' ? 'text-white' : 'text-white/40'
            )}
          >
            <Home className="w-6 h-6" strokeWidth={location.pathname === '/intro' ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">Home</span>
          </button>

          <button
            onClick={() => handleNav('/')}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all',
              location.pathname === '/' ? 'text-white' : 'text-white/40'
            )}
          >
            <MessageSquare className="w-6 h-6" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
            <span className="text-[10px] font-semibold">Chats</span>
          </button>

          <button
            onClick={() => setShowMenu(!showMenu)}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 w-16 py-1.5 rounded-xl transition-all',
              showMenu ? 'text-white' : 'text-white/40'
            )}
          >
            {showMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            <span className="text-[10px] font-semibold">{showMenu ? 'Close' : 'Menu'}</span>
          </button>
        </div>
      </nav>
    </>
  )
}
