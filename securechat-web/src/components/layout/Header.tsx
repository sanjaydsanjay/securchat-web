import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from './ThemeToggle'
import { useAuthStore } from '@/stores/authStore'
import { useTrial } from '@/hooks/useTrial'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, Bell, Crown, Clock } from 'lucide-react'

export function Header() {
  const user = useAuthStore((s) => s.user)
  const { isPremium, isTrialActive, planName } = useTrial()
  const navigate = useNavigate()

  return (
    <header className="flex items-center justify-between px-4 h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3">
        <Avatar
          src={user?.avatar_url}
          fallback={user?.display_name}
          size="sm"
        />
        <div>
          <h1 className="text-sm font-semibold">SecureChat AI</h1>
          <p className="text-xs text-gray-500">ID: {user?.unique_id}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isPremium && (
          <Badge variant="default" className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
            <Crown className="w-3 h-3" />
            {planName}
          </Badge>
        )}
        {isTrialActive && (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            FREE TRIAL
          </Badge>
        )}
        {!isPremium && !isTrialActive && (
          <Badge variant="destructive" className="flex items-center gap-1 text-xs">
            TRIAL EXPIRED
          </Badge>
        )}
        <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
          <Settings className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" onClick={() => navigate('/premium')}>
          <Crown className="w-5 h-5" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
