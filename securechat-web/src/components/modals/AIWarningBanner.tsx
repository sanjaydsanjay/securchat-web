import { useState } from 'react'
import { AlertTriangle, Shield, X } from 'lucide-react'
import type { AITreatLevel } from '@/types/message'

interface AIWarningBannerProps {
  threatLevel: AITreatLevel
  categories: string[]
  onDismiss: () => void
}

const levelConfig = {
  none: { color: 'bg-green-50 dark:bg-green-900/20', icon: Shield, text: 'green-700 dark:text-green-300' },
  low: { color: 'bg-yellow-50 dark:bg-yellow-900/20', icon: AlertTriangle, text: 'yellow-700 dark:text-yellow-300' },
  medium: { color: 'bg-orange-50 dark:bg-orange-900/20', icon: AlertTriangle, text: 'orange-700 dark:text-orange-300' },
  high: { color: 'bg-red-50 dark:bg-red-900/20', icon: AlertTriangle, text: 'red-700 dark:text-red-300' },
  critical: { color: 'bg-red-100 dark:bg-red-900/40', icon: AlertTriangle, text: 'red-800 dark:text-red-200' },
}

export function AIWarningBanner({ threatLevel, categories, onDismiss }: AIWarningBannerProps) {
  const [dismissed, setDismissed] = useState(false)
  const config = levelConfig[threatLevel]

  if (dismissed || threatLevel === 'none') return null

  return (
    <div className={`${config.color} px-4 py-2 flex items-start gap-2`}>
      <config.icon className={`w-4 h-4 text-${config.text} mt-0.5 shrink-0`} />
      <div className="flex-1">
        <p className={`text-xs font-medium text-${config.text}`}>
          AI Safety Alert: {threatLevel.charAt(0).toUpperCase() + threatLevel.slice(1)} threat detected
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          Categories: {categories.join(', ')}
        </p>
      </div>
      <button onClick={() => { setDismissed(true); onDismiss() }} className="shrink-0">
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  )
}
