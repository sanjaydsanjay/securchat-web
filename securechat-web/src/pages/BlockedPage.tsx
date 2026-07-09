import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { ArrowLeft, Shield, ShieldOff, UserX } from 'lucide-react'
import { useBlock } from '@/hooks/useBlock'
import { useEffect, useState } from 'react'
import type { UserPublicInfo } from '@/types/user'

export function BlockedPage() {
  const { blockedUsers, loadBlocked, unblockUser } = useBlock()
  const [blockedDetails, setBlockedDetails] = useState<UserPublicInfo[]>([])

  useEffect(() => {
    loadBlocked()
  }, [])

  const handleUnblock = async (uniqueId: number) => {
    await unblockUser(uniqueId)
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" /> Blocked Users
        </h1>
      </div>

      {blockedUsers.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ShieldOff className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No blocked users</p>
          <p className="text-xs mt-1">When you block someone, they'll appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {blockedUsers.map((id) => (
            <div key={id} className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <Avatar fallback={`User ${id}`} size="md" />
                <div>
                  <p className="text-sm font-medium">User #{id}</p>
                  <p className="text-xs text-gray-400">Blocked</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => handleUnblock(id)}>
                Unblock
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default BlockedPage
