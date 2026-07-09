import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { MediaPicker } from '@/components/shared/MediaPicker'
import { useMediaUpload } from '@/hooks/useMediaUpload'
import { userService } from '@/services/userService'
import { ArrowLeft, Save, Camera, Loader2, ArrowBigLeft } from 'lucide-react'

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [displayName, setDisplayName] = useState(user?.display_name || '')
  const [bio, setBio] = useState(user?.bio || '')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { uploading, uploadAvatar } = useMediaUpload()

  if (!user) return null

  const handleAvatarSelect = (file: File) => {
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = (e) => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let avatarUrl = user.avatar_url

      if (avatarFile) {
        const { url, error } = await uploadAvatar(avatarFile, user.unique_id)
        if (error) {
          console.error('Avatar upload failed:', error)
          return
        }
        avatarUrl = url
      }

      await userService.updateProfile(user.auth_id, {
        display_name: displayName !== user.display_name ? displayName : undefined,
        bio: bio !== user.bio ? bio : undefined,
        avatar_url: avatarUrl !== user.avatar_url ? avatarUrl : undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  const username = user.email?.split('@')[0] || ''

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-lg mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Profile</h1>
        </div>

        {/* Avatar & Basic Info */}
        <div className="text-center">
          <div className="relative inline-block">
            <Avatar
              src={avatarPreview || user.avatar_url}
              fallback={user.display_name}
              size="xl"
            />
            <MediaPicker contentType="image" onSelect={handleAvatarSelect}>
              <span className="absolute bottom-0 right-0 w-8 h-8 bg-[#128C7E] text-white rounded-full flex items-center justify-center hover:bg-[#0e6b5e] transition-colors cursor-pointer">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </span>
            </MediaPicker>
          </div>
          {avatarFile && (
            <p className="text-xs text-green-600 mt-1">New photo selected</p>
          )}
        </div>

        {/* Profile Details */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-800">
          <DetailRow label="Display Name" value={user.display_name} />
          <DetailRow label="Unique ID" value={user.unique_id.toString()} />
          <DetailRow label="Username" value={username} />
          <DetailRow label="Email" value={user.email} />
          <DetailRow label="About" value={user.bio || 'No bio yet'} />
          <DetailRow
            label="Online Status"
            value={user.is_online ? 'Online' : 'Offline'}
            valueClass={user.is_online ? 'text-green-600' : 'text-gray-500'}
          />
          <DetailRow
            label="Member Since"
            value={new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          />
          <DetailRow label="Plan" value={user.premium_tier} />
        </div>

        {/* Edit Form */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Display Name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={50}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">About</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={200}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{bio.length}/200</p>
          </div>
          <Button
            onClick={handleSave}
            disabled={saving || uploading}
            className="w-full"
          >
            {saving || uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Edit Profile
          </Button>
        </div>
      </div>
    </div>
  )
}

function DetailRow({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-gray-500">{label}</span>
      <span className={`text-sm font-medium ${valueClass || ''}`}>{value}</span>
    </div>
  )
}

export default ProfilePage
