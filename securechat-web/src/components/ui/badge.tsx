import { cn } from '@/lib/utils'

export interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'
  className?: string
  children: React.ReactNode
}

export function Badge({ variant = 'default', className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-[#128C7E] text-white': variant === 'default',
          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200': variant === 'secondary',
          'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200': variant === 'destructive',
          'border border-gray-300 text-gray-700 dark:border-gray-600 dark:text-gray-300': variant === 'outline',
          'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200': variant === 'success',
          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200': variant === 'warning',
        },
        className
      )}
    >
      {children}
    </span>
  )
}
