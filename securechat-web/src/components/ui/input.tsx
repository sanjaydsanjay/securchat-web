import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { error?: string }

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => {
  return (
    <div className="w-full">
      <input className={cn(
        'flex h-10 w-full rounded-[16px] border border-border dark:border-dark-border bg-white dark:bg-gray-800/50 px-4 py-2 text-sm text-text-primary dark:text-dark-text placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black/20 dark:focus:border-white/20 transition-all disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-danger focus:ring-danger/20',
        className
      )} ref={ref} {...props} />
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'
