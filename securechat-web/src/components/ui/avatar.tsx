import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface AvatarProps {
  src?: string | null
  alt?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'away'
  className?: string
}

const sizeMap = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm', lg: 'w-12 h-12 text-base', xl: 'w-16 h-16 text-lg' }
const dotSizeMap = { sm: 'w-2.5 h-2.5', md: 'w-3 h-3', lg: 'w-3.5 h-3.5', xl: 'w-4 h-4' }
const statusColors = { online: 'bg-online', offline: 'bg-gray-400', away: 'bg-warning' }

export const Avatar = forwardRef<HTMLDivElement, AvatarProps>(({ src, alt, fallback, size = 'md', status, className }, ref) => {
  const initials = fallback?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

  return (
    <div className={cn('relative inline-flex shrink-0', className)} ref={ref}>
      {src ? (
        <img src={src} alt={alt || fallback || 'Avatar'} className={cn('rounded-[16px] object-cover', sizeMap[size])} />
      ) : (
        <div className={cn('rounded-[16px] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center font-semibold shadow-sm', sizeMap[size])}>
          {initials}
        </div>
      )}
      {status && (
        <span className={cn('absolute -bottom-0.5 -right-0.5 rounded-full border-2 border-white dark:border-dark-surface', dotSizeMap[size], statusColors[status], status === 'online' && 'online-pulse')} />
      )}
    </div>
  )
})
Avatar.displayName = 'Avatar'
