export interface ApiResponse<T = unknown> {
  data: T | null
  error: ApiError | null
}

export interface ApiError {
  message: string
  code: string
  status: number
  details?: unknown
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  has_more: boolean
  cursor: string | null
}

export interface PaginationParams {
  limit?: number
  offset?: number
  cursor?: string
}

export type UserRole = 'super_admin' | 'moderator' | 'support' | 'analyst'

export interface AdminUser {
  id: string
  email: string
  role: UserRole
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  actor_unique_id: number | null
  action: string
  resource_type: string
  resource_id: string | null
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface AnalyticsMetrics {
  dau: number
  mau: number
  messages_sent: number
  ai_analysis_count: number
  premium_conversion_rate: number
  revenue: number
  retention_day_1: number
  retention_day_7: number
  retention_day_30: number
  churn_rate: number
  report_volume: number
}
