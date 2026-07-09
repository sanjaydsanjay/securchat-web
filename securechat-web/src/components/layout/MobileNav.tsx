import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Home, MessageSquare, Star, TrendingUp, Settings, User } from 'lucide-react'

const navItems = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'chats', icon: MessageSquare, label: 'Chats', path: '/' },
  { id: 'starred', icon: Star, label: 'Starred', path: '/starred' },
  { id: 'premium', icon: TrendingUp, label: 'Premium', path: '/premium' },
  { id: 'settings', icon: Settings, label: 'Settings', path: '/settings' },
]

export function MobileNav() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const isActive = (path?: string) => {
    if (!path) return false
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleHomeClick = async () => {
    if (user) {
      await authService.signOut()
      useAuthStore.getState().reset()
      navigate('/login')
    } else {
      navigate('/login')
    }
  }

  const handleClick = (item: typeof navItems[0]) => {
    if (item.id === 'home') {
      handleHomeClick()
      return
    }
    if (!user && item.path === '/') {
      navigate('/login')
      return
    }
    navigate(item.path!)
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#132238] rounded-t-[20px] shadow-premium-md">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = item.id !== 'home' && isActive(item.path)
          return (
            <button
              key={item.id}
              onClick={() => handleClick(item)}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-12 py-1.5 rounded-xl transition-all',
                active ? 'text-white' : 'text-white/40'
              )}
            >
              <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9px] font-semibold">{item.label}</span>
            </button>
          )
        })}

        <button
          onClick={() => user ? navigate('/profile') : navigate('/login')}
          className={cn(
            'flex flex-col items-center justify-center gap-0.5 w-12 py-1.5 rounded-xl transition-all',
            location.pathname === '/profile' ? 'text-white' : 'text-white/40'
          )}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-semibold">Profile</span>
        </button>
      </div>
    </nav>
  )
}
