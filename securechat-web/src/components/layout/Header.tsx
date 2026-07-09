import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { ThemeToggle } from './ThemeToggle'
import { useAuthStore } from '@/stores/authStore'
import { LogOut, Settings, Bell } from 'lucide-react'

export function Header() {
  const user = useAuthStore((s) => s.user)

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
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon"><Bell className="w-5 h-5" /></Button>
        <ThemeToggle />
        <Button variant="ghost" size="icon"><Settings className="w-5 h-5" /></Button>
        <Button variant="ghost" size="icon"><LogOut className="w-5 h-5" /></Button>
      </div>
    </header>
  )
}
