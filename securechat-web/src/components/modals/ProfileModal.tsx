import { Dialog } from '@/components/ui/dialog'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Calendar, Shield, Lock, Clock, Crown, AtSign } from 'lucide-react'
import type { UserPublicInfo } from '@/types/user'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
  user: UserPublicInfo | null
}

export function ProfileModal({ open, onClose, user }: ProfileModalProps) {
  if (!user) return null

  const isPremium = user.is_premium
  const isFreeTrial = user.premium_tier === 'free_trial'
  const planName = user.plan_name || (isPremium ? 'PREMIUM' : user.premium_tier === 'free_trial' ? 'FREE TRIAL' : '')

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <div className="text-center space-y-5">
        <Avatar src={user.avatar_url} fallback={user.display_name} size="xl" className="mx-auto" />

        <div>
          <h2 className="text-xl font-semibold">{user.display_name}</h2>
          <div className="flex items-center justify-center gap-1 mt-0.5">
            <AtSign className="w-3 h-3 text-gray-400" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              ID: {user.unique_id}
            </span>
          </div>
        </div>

        {user.bio && (
          <p className="text-sm text-gray-600 dark:text-gray-400 italic">
            &ldquo;{user.bio}&rdquo;
          </p>
        )}

        <div className="flex justify-center gap-2 flex-wrap">
          <Badge
            variant={user.is_online ? 'success' : 'secondary'}
            className="flex items-center gap-1"
          >
            <span className={`w-2 h-2 rounded-full ${user.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
            {user.is_online ? 'Online' : 'Offline'}
          </Badge>
          {isPremium && (
            <Badge variant="default" className="flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
              <Crown className="w-3 h-3" />
              {planName}
            </Badge>
          )}
          {isFreeTrial && !isPremium && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              FREE TRIAL
            </Badge>
          )}
          {user.e2e_enabled && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Lock className="w-3 h-3" />
              E2E
            </Badge>
          )}
        </div>

        <div className="text-left space-y-3 text-sm border-t border-gray-100 dark:border-gray-700 pt-4">
          <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
            <Calendar className="w-4 h-4 shrink-0" />
            <span>Joined {new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>

          {user.last_seen && (
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {user.is_online
                  ? 'Currently online'
                  : `Last seen ${new Date(user.last_seen).toLocaleString()}`}
              </span>
            </div>
          )}

          {user.e2e_enabled && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Shield className="w-4 h-4 shrink-0" />
              <span className="text-xs">Messages are end-to-end encrypted</span>
            </div>
          )}
        </div>
      </div>
    </Dialog>
  )
}
