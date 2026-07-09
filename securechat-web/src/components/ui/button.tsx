import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button className={cn(
        'inline-flex items-center justify-center rounded-[14px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]',
        {
          'bg-black text-white hover:bg-gray-800 shadow-button dark:bg-white dark:text-black dark:hover:bg-gray-200': variant === 'default',
          'bg-danger text-white hover:bg-red-600 shadow-sm': variant === 'destructive',
          'border border-border dark:border-dark-border bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800': variant === 'outline',
          'bg-gray-100 text-text-primary hover:bg-gray-200 dark:bg-gray-800 dark:text-dark-text': variant === 'secondary',
          'hover:bg-gray-100 dark:hover:bg-gray-800': variant === 'ghost',
          'text-black dark:text-white underline-offset-4 hover:underline': variant === 'link',
        },
        {
          'h-10 px-4 py-2 text-sm': size === 'default',
          'h-9 rounded-[12px] px-3 text-xs': size === 'sm',
          'h-11 rounded-[16px] px-8 text-base': size === 'lg',
          'h-10 w-10': size === 'icon',
        },
        className
      )} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'
