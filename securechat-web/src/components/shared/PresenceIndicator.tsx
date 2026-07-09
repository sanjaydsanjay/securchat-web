import { cn } from '@/lib/utils'

interface PresenceIndicatorProps {
  status: 'online' | 'recently' | 'away' | 'offline'
  className?: string
}

const statusConfig = {
  online: { color: 'bg-green-500', label: 'Online' },
  recently: { color: 'bg-yellow-500', label: 'Recently' },
  away: { color: 'bg-orange-500', label: 'Away' },
  offline: { color: 'bg-gray-400', label: 'Offline' },
}

export function PresenceIndicator({ status, className }: PresenceIndicatorProps) {
  const config = statusConfig[status]
  return (
    <span className={cn('w-2 h-2 rounded-full inline-block', config.color, className)} title={config.label} />
  )
}
