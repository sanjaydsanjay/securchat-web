import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { MessageSquare, Star, Shield, CreditCard, Users, Settings } from 'lucide-react'
import { useState } from 'react'

const navItems = [
  { id: 'chats', icon: MessageSquare, label: 'Chats' },
  { id: 'starred', icon: Star, label: 'Starred' },
  { id: 'premium', icon: CreditCard, label: 'Premium' },
  { id: 'blocked', icon: Shield, label: 'Blocked' },
  { id: 'settings', icon: Settings, label: 'Settings' },
]

export function Sidebar() {
  const [active, setActive] = useState('chats')

  return (
    <nav className="w-16 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col items-center py-3 gap-1">
      {navItems.map((item) => (
        <Button
          key={item.id}
          variant="ghost"
          size="icon"
          onClick={() => setActive(item.id)}
          className={cn(
            'rounded-lg',
            active === item.id
              ? 'bg-[#128C7E]/10 text-[#128C7E]'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
          )}
          title={item.label}
        >
          <item.icon className="w-5 h-5" />
        </Button>
      ))}
    </nav>
  )
}
