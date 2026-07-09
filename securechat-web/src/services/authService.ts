import { supabase } from '@/lib/supabaseConfig'
import type { UserProfile } from '@/types/user'
import { signUpSchema, signInSchema, displayNameSchema } from '@/utils/validators'

export const authService = {
  async signUp(email: string, password: string, displayName?: string) {
    const parsed = signUpSchema.safeParse({ email, password, displayName: displayName || email.split('@')[0] })
    if (!parsed.success) {
      return { data: null, error: parsed.error.errors[0]?.message || 'Invalid input' }
    }

    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: {
          display_name: parsed.data.displayName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  async signIn(email: string, password: string) {
    const parsed = signInSchema.safeParse({ email, password })
    if (!parsed.success) {
      return { data: null, error: parsed.error.errors[0]?.message || 'Invalid input' }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    })
    return { data, error }
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    return { error }
  },

  async getSession() {
    const { data, error } = await supabase.auth.getSession()
    return { data, error }
  },

  async refreshSession() {
    const { data, error } = await supabase.auth.refreshSession()
    return { data, error }
  },

  async forgotPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    })
    return { data, error }
  },

  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({ password })
    return { data, error }
  },

  async resendVerificationEmail(email: string) {
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    return { data, error }
  },

  async deleteAccount() {
    const { error } = await supabase.rpc('delete_user_account')
    return { error }
  },

  async getProfile(userId: string, retries = 5): Promise<{ data: UserProfile | null; error: unknown }> {
    // Retry loop: the trigger that creates the profile runs async
    // so the profile may not exist immediately after signup.
    for (let attempt = 0; attempt < retries; attempt++) {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .maybeSingle()

      if (data) {
        return { data: data as UserProfile, error: null }
      }

      if (attempt < retries - 1) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)))
      }
    }

    return { data: null, error: 'Profile not found after multiple retries' }
  },

  async updateDisplayName(displayName: string) {
    const parsed = displayNameSchema.safeParse(displayName)
    if (!parsed.success) {
      return { error: parsed.error.errors[0]?.message || 'Invalid display name' }
    }
    const { error } = await supabase.rpc('update_display_name', { new_name: parsed.data })
    return { error }
  },
}
