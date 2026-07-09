import { supabase } from '@/lib/supabaseConfig'

export interface AnalyzePayload {
  message_id: string
  content: string
  sender_unique_id: number
}

export interface AIAnalysisResponse {
  allow: boolean
  risk: string
  category: string
  warning: string
  ban: boolean
}

export const aiService = {
  async analyzeMessage(payload: AnalyzePayload): Promise<{ data: AIAnalysisResponse | null; error: unknown }> {
    try {
      // Check if user has access to AI features (trial or premium)
      const { data: userData } = await supabase
        .from('users')
        .select('is_trial_active, is_premium')
        .eq('unique_id', payload.sender_unique_id)
        .single()

      const hasAccess = userData?.is_trial_active || userData?.is_premium

      if (!hasAccess) {
        return {
          data: { allow: true, risk: 'none', category: 'none', warning: '', ban: false },
          error: null,
        }
      }

      const { data, error } = await supabase.functions.invoke('ai-analyze', {
        body: payload,
      })

      if (error) {
        console.error('[aiService] analyzeMessage error:', error)
        return { data: null, error }
      }

      return { data: data as AIAnalysisResponse, error: null }
    } catch (err) {
      console.error('[aiService] analyzeMessage exception:', err)
      return {
        data: { allow: true, risk: 'none', category: 'none', warning: '', ban: false },
        error: err,
      }
    }
  },
}
