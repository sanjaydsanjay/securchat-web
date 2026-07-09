import { useCallback } from 'react'
import { notificationService } from '@/services/notificationService'

export function useNotifications() {
  const requestPermission = useCallback(async () => {
    return await notificationService.requestPermission()
  }, [])

  const notify = useCallback(async (title: string, options?: NotificationOptions) => {
    await notificationService.showNotification(title, options)
  }, [])

  return { requestPermission, notify }
}
