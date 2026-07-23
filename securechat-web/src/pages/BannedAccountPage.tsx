import { Ban, AlertTriangle, ShieldAlert } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

function formatBanReason(reason: string | null | undefined): { title: string; description: string; icon: typeof Ban } {
  if (!reason) {
    return { title: 'Account Blacklisted', description: 'Your account has been permanently suspended due to a violation of our content policy.', icon: Ban }
  }

  const lower = reason.toLowerCase()
  if (lower.includes('blackmail')) {
    return { title: 'Blackmail Attempt Detected', description: 'Your account has been permanently suspended for attempting to send blackmail messages. This is a serious violation of our content policy.', icon: ShieldAlert }
  }
  if (lower.includes('threat') || lower.includes('death') || lower.includes('kill')) {
    return { title: 'Threat Detected', description: 'Your account has been permanently suspended for sending threatening messages. Threats of any kind are strictly prohibited.', icon: ShieldAlert }
  }
  if (lower.includes('harassment') || lower.includes('bully') || lower.includes('hate')) {
    return { title: 'Harassment Detected', description: 'Your account has been permanently suspended for harassment. Harassing other users violates our content policy.', icon: AlertTriangle }
  }
  if (lower.includes('scam') || lower.includes('fraud') || lower.includes('phishing')) {
    return { title: 'Fraudulent Activity Detected', description: 'Your account has been permanently suspended for fraudulent activity. Scams and fraud are strictly prohibited.', icon: ShieldAlert }
  }
  if (lower.includes('child') || lower.includes('exploitation')) {
    return { title: 'Severe Violation Detected', description: 'Your account has been permanently suspended for severe policy violation. This type of content is strictly prohibited.', icon: ShieldAlert }
  }

  return { title: 'Account Blacklisted', description: reason || 'Your account has been permanently suspended due to a violation of our content policy.', icon: Ban }
}

export function BannedAccountPage() {
  const user = useAuthStore((s) => s.user)
  const { title, description, icon: Icon } = formatBanReason(user?.ban_reason)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-sm text-center space-y-4">
        <div className="w-16 h-16 bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto">
          <Icon className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold text-white">{title}</h1>
        <div className="bg-red-900/20 rounded-xl p-4 border border-red-900/30">
          <p className="text-sm text-red-300">
            {description}
          </p>
        </div>
        <p className="text-xs text-gray-500">
          This decision is final and cannot be appealed.
        </p>
        {user?.ban_reason && (
          <div className="bg-gray-800/50 rounded-lg px-4 py-3">
            <p className="text-xs text-gray-400 font-medium mb-1">Details</p>
            <p className="text-xs text-gray-300">{user.ban_reason}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default BannedAccountPage
