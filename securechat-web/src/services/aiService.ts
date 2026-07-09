import { supabase } from '@/lib/supabaseConfig'
import type { AIAnalysisRequest, AIAnalysisResponse, AIAnalysisStats } from '@/types/ai'

export const aiService = {
  async analyzeMessage(payload: AIAnalysisRequest): Promise<{ data: AIAnalysisResponse | null; error: unknown }> {
    const { data, error } = await supabase.functions.invoke('ai-analyze', {
      body: payload,
    })
    return { data: data as AIAnalysisResponse | null, error }
  },

  async getAIAnalysisStats(): Promise<{ data: AIAnalysisStats | null; error: unknown }> {
    const { data, error } = await supabase
      .from('messages')
      .select('ai_threat_level, ai_categories, ai_confidence')
      .not('ai_analyzed', 'is', false)
    const messages = data as Array<{ ai_threat_level: string; ai_categories: string[]; ai_confidence: number | null }> | null

    if (!messages) return { data: null, error }

    const stats: AIAnalysisStats = {
      total_analyzed: messages.length,
      threats_detected: messages.filter((m) => m.ai_threat_level !== 'none').length,
      by_category: { harassment: 0, threats: 0, blackmail: 0, hate_speech: 0, self_harm: 0, sexual_content: 0, spam: 0, misinformation: 0 },
      false_positive_rate: 0,
      api_cost: messages.length * 0.01,
    }

    messages.forEach((m) => {
      m.ai_categories?.forEach((cat) => {
        const key = cat as keyof typeof stats.by_category
        if (key in stats.by_category) stats.by_category[key]++
      })
    })

    return { data: stats, error: null }
  },
}
