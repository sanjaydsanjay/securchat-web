import { supabase } from '@/lib/supabaseConfig'
import type { CreateReportPayload, Report } from '@/types/report'
import { reportSchema } from '@/utils/validators'

export const reportService = {
  async createReport(payload: CreateReportPayload): Promise<{ data: Report | null; error: unknown }> {
    const parsed = reportSchema.safeParse(payload)
    if (!parsed.success) {
      return { data: null, error: parsed.error.errors[0]?.message || 'Invalid report data' }
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        reported_unique_id: payload.reported_unique_id,
        chat_id: payload.chat_id || null,
        category: payload.category,
        description: payload.description || null,
      })
      .select()
      .single()

    return { data: data as Report | null, error }
  },

  async getReports(): Promise<{ data: Report[] | null; error: unknown }> {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })

    return { data: data as Report[] | null, error }
  },
}
