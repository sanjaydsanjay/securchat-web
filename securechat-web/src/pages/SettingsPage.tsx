import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/stores/authStore'
import { userService } from '@/services/userService'
import { ArrowLeft, Moon, Bell, Shield, Users, Languages, Lock } from 'lucide-react'

export function SettingsPage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>

        <div className="space-y-2">
          <SettingItem icon={Moon} label="Theme" description={user.theme_preference} />
          <SettingItem icon={Bell} label="Notifications" description="Sound, vibration" />
          <SettingItem icon={Shield} label="Privacy" description="Online status, read receipts" />
          <SettingItem icon={Users} label="Blocked Users" description={`${user.blocked_users?.length || 0} blocked`} />
          <SettingItem icon={Languages} label="Language" description="English" />
          <SettingItem icon={Lock} label="Security" description="Encryption, session" />
        </div>
      </div>
    </div>
  )
}

function SettingItem({ icon: Icon, label, description }: { icon: any; label: string; description: string }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer">
      <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-gray-400 capitalize">{description}</p>
      </div>
    </div>
  )
}

export default SettingsPage
