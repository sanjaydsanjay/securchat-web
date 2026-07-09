import { useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabaseConfig'
import { useAuthStore } from '@/stores/authStore'
import { authService } from '@/services/authService'
import type { UserProfile } from '@/types/user'

export function useAuth() {
  const { user, session, loading, initialized, setUser, setSession, setLoading, setInitialized, reset } = useAuthStore()
  const syncRef = useRef(false)

  const syncProfile = useCallback(async (userId: string) => {
    if (syncRef.current) return
    syncRef.current = true
    try {
      const { data: profile } = await authService.getProfile(userId)
      if (profile) {
        setUser(profile)
      }
    } finally {
      syncRef.current = false
    }
  }, [setUser])

  useEffect(() => {
    let mounted = true

    const init = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession()

        if (!mounted) return

        if (currentSession?.user) {
          setSession(currentSession)
          await syncProfile(currentSession.user.id)
        }
      } catch (err) {
        console.error('Auth init failed:', err)
      } finally {
        if (mounted) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }

    init()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return

        setSession(currentSession)

        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (currentSession?.user) {
              await syncProfile(currentSession.user.id)
            }
            break

          case 'SIGNED_OUT':
            reset()
            break

          case 'USER_UPDATED':
            if (currentSession?.user) {
              await syncProfile(currentSession.user.id)
            }
            break
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [syncProfile, setSession, setLoading, setInitialized, reset])

  const signUp = useCallback(async (email: string, password: string, displayName?: string) => {
    const { data, error } = await authService.signUp(email, password, displayName)

    if (data?.user && !error) {
      const userId = data.user.id
      setTimeout(() => syncProfile(userId), 2000)
    }

    return { data, error }
  }, [syncProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await authService.signIn(email, password)
    return { data, error }
  }, [])

  const signOut = useCallback(async () => {
    await authService.signOut()
    reset()
  }, [reset])

  const forgotPassword = useCallback(async (email: string) => {
    return await authService.forgotPassword(email)
  }, [])

  const resendVerification = useCallback(async (email: string) => {
    return await authService.resendVerificationEmail(email)
  }, [])

  return {
    user,
    session,
    loading,
    initialized,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    resendVerification,
  }
}
