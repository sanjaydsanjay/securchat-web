import { cn } from '@/lib/utils'

export interface DropdownMenuProps {
  trigger: React.ReactNode
  children: React.ReactNode
  align?: 'start' | 'end'
  className?: string
}

export function DropdownMenu({ trigger, children, align = 'start', className }: DropdownMenuProps) {
  return (
    <div className="relative inline-block">
      {trigger}
      <div className={cn(
        'absolute z-50 mt-1 min-w-[8rem] rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800',
        align === 'end' ? 'right-0' : 'left-0',
        className
      )}>
        {children}
      </div>
    </div>
  )
}

export interface DropdownMenuItemProps {
  icon?: React.ReactNode
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
  className?: string
}

export function DropdownMenuItem({ icon, children, onClick, danger, className }: DropdownMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
        danger
          ? 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
        className
      )}
    >
      {icon}
      {children}
    </button>
  )
}
