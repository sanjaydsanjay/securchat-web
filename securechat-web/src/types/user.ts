export type PremiumTier = 'free' | 'basic' | 'standard' | 'premium' | 'enterprise'
export type OnlineStatus = 'online' | 'recently' | 'away' | 'offline'
export type LastSeenVisibility = 'everyone' | 'contacts' | 'nobody'
export type ThemePreference = 'light' | 'dark' | 'midnight' | 'forest' | 'system'
export type AutoDeleteHours = 0 | 1 | 6 | 24 | 168 | -1

export interface UserProfile {
  id: string
  auth_id: string
  unique_id: number
  display_name: string
  avatar_url: string | null
  bio: string
  email: string
  phone: string | null
  is_online: boolean
  last_seen: string
  premium_tier: PremiumTier
  message_quota: number
  messages_used: number
  quota_resets_at: string
  e2e_enabled: boolean
  e2e_public_key: string | null
  auto_delete_hours: AutoDeleteHours
  theme_preference: ThemePreference
  accent_color: string
  show_online_status: boolean
  show_last_seen: LastSeenVisibility
  show_read_receipts: boolean
  blocked_users: number[]
  settings: Record<string, unknown>
  is_admin: boolean
  is_banned: boolean
  ban_reason: string | null
  ban_expires_at: string | null
  created_at: string
  updated_at: string
}

export interface UserPublicInfo {
  unique_id: number
  display_name: string
  avatar_url: string | null
  bio: string
  is_online: boolean
  last_seen: string
  premium_tier: PremiumTier
  e2e_enabled: boolean
  created_at: string
}

export interface UserSettings {
  display_name?: string
  avatar_url?: string | null
  bio?: string
  auto_delete_hours?: AutoDeleteHours
  theme_preference?: ThemePreference
  accent_color?: string
  show_online_status?: boolean
  show_last_seen?: LastSeenVisibility
  show_read_receipts?: boolean
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  auto_delete_hours: 24,
  theme_preference: 'system',
  accent_color: '#128C7E',
  show_online_status: true,
  show_last_seen: 'everyone',
  show_read_receipts: true,
}

export interface AuthState {
  user: UserProfile | null
  session: unknown | null
  loading: boolean
}
