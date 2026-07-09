import { useCallback } from 'react'
import { supabase } from '@/lib/supabaseConfig'
import { useAuthStore } from '@/stores/authStore'
import type { TrialInfo } from '@/types/user'

export function useTrial() {
  const user = useAuthStore((s) => s.user)

  const checkTrialStatus = useCallback(async (): Promise<TrialInfo | null> => {
    try {
      const { data, error } = await supabase.rpc('check_trial_status')
      if (error) {
        console.error('[useTrial] check_trial_status error:', error)
        return null
      }
      if (data && data.length > 0) {
        const trialInfo = data[0] as TrialInfo

        if (trialInfo.is_trial_active !== user?.is_trial_active ||
            trialInfo.plan_name !== user?.plan_name) {
          const { data: freshProfile } = await supabase
            .from('users')
            .select('*')
            .eq('auth_id', user?.auth_id)
            .single()
          if (freshProfile) {
            useAuthStore.getState().setUser(freshProfile as any)
          }
        }
        return trialInfo
      }
      return null
    } catch (err) {
      console.error('[useTrial] check failed:', err)
      return null
    }
  }, [user])

  const activatePremium = useCallback(async (
    planName: string,
    paymentReference?: string,
    paymentMethod?: string
  ) => {
    const { error } = await supabase.rpc('activate_premium', {
      p_plan_name: planName,
      p_payment_reference: paymentReference || null,
      p_payment_method: paymentMethod || null,
    })
    if (!error && user) {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', user.auth_id)
        .single()
      if (data) {
        useAuthStore.getState().setUser(data as any)
      }
    }
    return { error }
  }, [user])

  const isPremium = user?.is_premium ?? false
  const isTrialActive = user?.is_trial_active ?? false
  const isTrialExpired = !user?.is_trial_active && !user?.is_premium && user?.plan_name === 'TRIAL EXPIRED'
  const planName = user?.plan_name || 'FREE'
  const hasAccess = isPremium || isTrialActive

  return {
    checkTrialStatus,
    activatePremium,
    isPremium,
    isTrialActive,
    isTrialExpired,
    planName,
    hasAccess,
  }
}
