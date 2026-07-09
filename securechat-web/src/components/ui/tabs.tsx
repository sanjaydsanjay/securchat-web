import { cn } from '@/lib/utils'

export interface TabsProps {
  value: string
  onValueChange: (value: string) => void
  tabs: { value: string; label: string; content: React.ReactNode }[]
  className?: string
}

export function Tabs({ value, onValueChange, tabs, className }: TabsProps) {
  return (
    <div className={className}>
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              'px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
              value === tab.value
                ? 'border-[#128C7E] text-[#128C7E]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs.find((t) => t.value === value)?.content}
      </div>
    </div>
  )
}
