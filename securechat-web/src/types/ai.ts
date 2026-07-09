import type { AITreatLevel } from './message'

export type AICategory = 'harassment' | 'threats' | 'blackmail' | 'hate_speech' | 'self_harm' | 'sexual_content' | 'spam' | 'misinformation'
export type AIRecommendedAction = 'warn' | 'flag' | 'block'

export interface AIAnalysisResult {
  threat_level: AITreatLevel
  categories: AICategory[]
  confidence: number
  explanation: string
  recommended_action: AIRecommendedAction
}

export interface AIAnalysisRequest {
  message_id: string
  content: string
  sender_unique_id?: number
}

export interface AIAnalysisResponse {
  allow: boolean
  risk: 'none' | 'low' | 'medium' | 'high' | 'critical'
  category: string
  warning: string
  ban?: boolean
}

export interface AIAnalysisStats {
  total_analyzed: number
  threats_detected: number
  by_category: Record<AICategory, number>
  false_positive_rate: number
  api_cost: number
}
