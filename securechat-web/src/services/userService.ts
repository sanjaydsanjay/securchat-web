import { supabase } from '@/lib/supabaseConfig'
import type { UserProfile, UserPublicInfo, UserSettings } from '@/types/user'
import { profileSchema } from '@/utils/validators'

export const userService = {
  async getCurrentUser(): Promise<{ data: UserProfile | null; error: unknown }> {
    const { data: authData } = await supabase.auth.getUser()
    if (!authData?.user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('auth_id', authData.user.id)
      .single()
    return { data: data as UserProfile | null, error }
  },

  async getUserByUniqueId(uniqueId: number): Promise<{ data: UserPublicInfo | null; error: unknown }> {
    try {
      console.log('[userService] Searching for unique_id:', uniqueId)
      const { data, error } = await supabase
        .from('users')
        .select('unique_id, display_name, avatar_url, bio, is_online, last_seen, premium_tier, e2e_enabled, created_at')
        .eq('unique_id', uniqueId)
        .neq('is_banned', true)
        .maybeSingle()

      console.log('[userService] Query result:', { data, error })

      if (error) {
        console.error('[userService] Query error:', error)
        return { data: null, error: 'Unable to search user. Please try again.' }
      }

      console.log('[userService] User found:', data?.display_name || 'none')
      return { data: data as UserPublicInfo | null, error: null }
    } catch (err) {
      console.error('[userService] Unexpected error in getUserByUniqueId:', err)
      return { data: null, error: 'Unable to search user. Please try again.' }
    }
  },

  async searchUsers(query: string): Promise<{ data: UserPublicInfo[] | null; error: unknown }> {
    const { data, error } = await supabase
      .from('users')
      .select('unique_id, display_name, avatar_url, bio, is_online, last_seen, premium_tier, e2e_enabled, created_at')
      .ilike('display_name', `%${query}%`)
      .limit(20)
    return { data: data as UserPublicInfo[] | null, error }
  },

  async updateProfile(userId: string, settings: UserSettings) {
    const parsed = profileSchema.partial().safeParse(settings)
    if (!parsed.success) {
      return { data: null, error: parsed.error.errors[0]?.message || 'Invalid profile data' }
    }

    const { data, error } = await supabase
      .from('users')
      .update(settings)
      .eq('auth_id', userId)
      .select()
      .single()
    return { data: data as UserProfile | null, error }
  },

  async blockUser(currentUserId: string, targetUniqueId: number) {
    const { data: user } = await supabase
      .from('users')
      .select('blocked_users')
      .eq('auth_id', currentUserId)
      .single()

    const blocked = (user?.blocked_users || []) as number[]
    if (blocked.includes(targetUniqueId)) return { error: null }

    const { error } = await supabase
      .from('users')
      .update({ blocked_users: [...blocked, targetUniqueId] })
      .eq('auth_id', currentUserId)
    return { error }
  },

  async unblockUser(currentUserId: string, targetUniqueId: number) {
    const { data: user } = await supabase
      .from('users')
      .select('blocked_users')
      .eq('auth_id', currentUserId)
      .single()

    const blocked = (user?.blocked_users || []) as number[]
    const { error } = await supabase
      .from('users')
      .update({ blocked_users: blocked.filter((id: number) => id !== targetUniqueId) })
      .eq('auth_id', currentUserId)
    return { error }
  },

  async getBlockedUsers(currentUserId: string): Promise<{ data: number[] | null; error: unknown }> {
    const { data, error } = await supabase
      .from('users')
      .select('blocked_users')
      .eq('auth_id', currentUserId)
      .single()
    return { data: (data?.blocked_users as number[]) || null, error }
  },
}
