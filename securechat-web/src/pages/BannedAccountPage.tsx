import { Ban } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

export function BannedAccountPage() {
  const user = useAuthStore((s) => s.user)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-16 h-16 bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <Ban className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">Account Blacklisted</h1>
        <div className="bg-red-900/20 rounded-xl p-4 border border-red-900/30">
          <p className="text-sm text-red-300">
            Your account has been permanently suspended due to a violation of our content policy.
          </p>
        </div>
        <p className="text-xs text-gray-500">
          This decision is final and cannot be appealed.
        </p>
        {user?.ban_reason && (
          <div className="bg-gray-800/50 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 font-medium mb-1">Reason</p>
            <p className="text-xs text-gray-300">{user.ban_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BannedAccountPage
