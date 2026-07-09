import { cn } from '@/lib/utils'

interface OnlineStatusProps {
  isOnline: boolean
  lastSeen?: string
  showText?: boolean
  className?: string
}

export function OnlineStatus({ isOnline, lastSeen, showText, className }: OnlineStatusProps) {
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <span className={cn(
        'w-2 h-2 rounded-full',
        isOnline ? 'bg-green-500' : 'bg-gray-400'
      )} />
      {showText && (
        <span className="text-xs text-gray-500">
          {isOnline ? 'Online' : lastSeen ? `Last seen ${new Date(lastSeen).toLocaleString()}` : 'Offline'}
        </span>
      )}
    </div>
  )
}
