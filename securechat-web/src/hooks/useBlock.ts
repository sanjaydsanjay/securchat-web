import { useCallback } from 'react'
import { userService } from '@/services/userService'
import { useAuthStore } from '@/stores/authStore'
import { useUserStore } from '@/stores/userStore'

export function useBlock() {
  const user = useAuthStore((s) => s.user)
  const { blockedUsers, addBlockedUser, removeBlockedUser, setBlockedUsers } = useUserStore()

  const loadBlocked = useCallback(async () => {
    if (!user?.id) return
    const { data } = await userService.getBlockedUsers(user.id)
    if (data) setBlockedUsers(data)
  }, [user, setBlockedUsers])

  const blockUser = useCallback(async (targetUniqueId: number) => {
    if (!user?.id) return
    const { error } = await userService.blockUser(user.id, targetUniqueId)
    if (!error) addBlockedUser(targetUniqueId)
    return { error }
  }, [user, addBlockedUser])

  const unblockUser = useCallback(async (targetUniqueId: number) => {
    if (!user?.id) return
    const { error } = await userService.unblockUser(user.id, targetUniqueId)
    if (!error) removeBlockedUser(targetUniqueId)
    return { error }
  }, [user, removeBlockedUser])

  const isBlocked = useCallback((uniqueId: number) => {
    return blockedUsers.includes(uniqueId)
  }, [blockedUsers])

  return { blockedUsers, loadBlocked, blockUser, unblockUser, isBlocked }
}
