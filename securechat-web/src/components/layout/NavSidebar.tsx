import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import { Home, MessageSquare, TrendingUp, User, Crown, Clock, LogOut } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'

const navItems = [
  { id: 'home', icon: Home, path: '/intro', label: 'Home' },
  { id: 'chats', icon: MessageSquare, path: '/', label: 'Messages' },
  { id: 'premium', icon: TrendingUp, path: '/premium', label: 'Premium' },
]

export function NavSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const handleNavClick = (path: string) => {
    navigate(path)
  }

  const handleLogout = async () => {
    if (user) {
      await authService.signOut()
      useAuthStore.getState().reset()
    }
    navigate('/login')
  }

  const trialEnd = user?.trial_end_date ? parseISO(user.trial_end_date) : null
  const daysRemaining = trialEnd ? Math.max(0, differenceInDays(trialEnd, new Date())) : 0
  const isTrialActive = user?.is_trial_active && daysRemaining > 0
  const isPremium = user?.is_premium

  return (
    <nav className="hidden md:flex w-[80px] flex-col bg-[#132238] shrink-0 h-full py-8 items-center justify-between z-20 rounded-[16px]">
      <div className="flex flex-col gap-[35px] w-full items-center">
        {navItems.map((item) => {
          const active = isActive(item.path) && item.id !== 'home'
          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  'w-11 h-11 flex items-center justify-center rounded-xl transition-all',
                  active ? 'bg-[#5c7cfa] text-white' : 'text-white/40 hover:text-white hover:bg-white/10'
                )}
                title={item.label}
              >
                <item.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              </button>
            </div>
          )
        })}
        
        {/* Logout Button */}
        <div className="relative">
          <button
            onClick={handleLogout}
            className="w-11 h-11 flex items-center justify-center rounded-xl transition-all text-white/40 hover:text-white hover:bg-white/10"
            title="Logout"
          >
            <LogOut className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-2">
        {isPremium && (
          <span className="text-[10px] text-yellow-400 font-medium flex items-center gap-1">
            <Crown className="w-3 h-3" /> PREMIUM
          </span>
        )}
        {isTrialActive && !isPremium && (
          <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> {daysRemaining}d
          </span>
        )}
        <button
          onClick={() => user ? navigate('/profile') : navigate('/login')}
          className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors relative"
          title="Profile"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <User className="w-5 h-5" />
          )}
        </button>
      </div>
    </nav>
  )
}