import { useAuthStore } from '@/stores/authStore'
import { QUOTA_WARNING_50, QUOTA_WARNING_80, QUOTA_WARNING_90, QUOTA_WARNING_95 } from '@/lib/constants'

export function useQuota() {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return { used: 0, quota: 0, percentage: 0, remaining: 0, level: 'ok' as const }
  }

  const used = user.messages_used
  const quota = user.message_quota
  const percentage = quota > 0 ? used / quota : 0
  const remaining = Math.max(0, quota - used)

  let level: 'ok' | 'warning_50' | 'warning_80' | 'warning_90' | 'warning_95' | 'exhausted' = 'ok'
  if (remaining <= 0) level = 'exhausted'
  else if (percentage >= QUOTA_WARNING_95) level = 'warning_95'
  else if (percentage >= QUOTA_WARNING_90) level = 'warning_90'
  else if (percentage >= QUOTA_WARNING_80) level = 'warning_80'
  else if (percentage >= QUOTA_WARNING_50) level = 'warning_50'

  return { used, quota, percentage, remaining, level }
}
