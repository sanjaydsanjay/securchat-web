import { cn } from '@/lib/utils'
import { useQuota } from '@/hooks/useQuota'

export function QuotaBar() {
  const { used, quota, percentage, remaining, level } = useQuota()

  if (quota <= 0) return null

  const barColor = {
    ok: 'bg-[#128C7E]',
    warning_50: 'bg-yellow-400',
    warning_80: 'bg-orange-400',
    warning_90: 'bg-red-400',
    warning_95: 'bg-red-500',
    exhausted: 'bg-red-600',
  }

  return (
    <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
        <span>Messages: {remaining.toLocaleString()} / {quota.toLocaleString()}</span>
        {level !== 'ok' && level !== 'exhausted' && (
          <span className="text-yellow-600 dark:text-yellow-400 font-medium">
            {remaining} remaining
          </span>
        )}
      </div>
      <div className="w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor[level])}
          style={{ width: `${Math.min(percentage * 100, 100)}%` }}
        />
      </div>
    </div>
  )
}
