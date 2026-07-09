import { cn } from '@/lib/utils'

export interface TooltipProps {
  content: string
  children: React.ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <div className="relative group inline-flex">
      {children}
      <div className={cn(
        'absolute z-50 hidden group-hover:block px-2 py-1 text-xs text-white bg-gray-900 rounded-md whitespace-nowrap dark:bg-gray-700',
        {
          'bottom-full left-1/2 -translate-x-1/2 mb-2': side === 'top',
          'top-full left-1/2 -translate-x-1/2 mt-2': side === 'bottom',
          'right-full top-1/2 -translate-y-1/2 mr-2': side === 'left',
          'left-full top-1/2 -translate-y-1/2 ml-2': side === 'right',
        }
      )}>
        {content}
      </div>
    </div>
  )
}
