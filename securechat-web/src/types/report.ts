export type ReportCategory = 'spam' | 'harassment' | 'threats' | 'fake_account' | 'child_safety' | 'other'
export type ReportStatus = 'pending' | 'under_review' | 'resolved' | 'dismissed'
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical'

export interface Report {
  id: string
  reporter_unique_id: number
  reported_unique_id: number
  chat_id: string | null
  category: ReportCategory
  description: string | null
  evidence_message_ids: string[]
  status: ReportStatus
  severity: ReportSeverity
  admin_notes: string | null
  resolved_by: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateReportPayload {
  reported_unique_id: number
  chat_id?: string
  category: ReportCategory
  description?: string
}
