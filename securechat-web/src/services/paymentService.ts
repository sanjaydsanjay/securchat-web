import { supabase } from '@/lib/supabaseConfig'
import type { Payment, CreatePaymentPayload, PremiumPlan } from '@/types/payment'
import { PREMIUM_PLANS } from '@/lib/constants'

export const paymentService = {
  getPlans(): PremiumPlan[] {
    return Object.entries(PREMIUM_PLANS).map(([id, plan]) => ({
      id: id as PremiumPlan['id'],
      name: plan.name,
      price: plan.price,
      currency: 'INR',
      messages_per_month: plan.messages,
      max_file_size_mb: plan.fileSize,
      features: [],
      devices: plan.devices,
    }))
  },

  async createPayment(payload: CreatePaymentPayload): Promise<{ data: Payment | null; error: unknown }> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        plan: payload.plan,
        amount: PREMIUM_PLANS[payload.plan].price,
        currency: 'INR',
        payment_method: payload.payment_method || null,
        screenshot_url: payload.screenshot_url || null,
      })
      .select()
      .single()
    return { data: data as Payment | null, error }
  },

  async getPaymentHistory(): Promise<{ data: Payment[] | null; error: unknown }> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
    return { data: data as Payment[] | null, error }
  },

  async verifyPayment(paymentId: string, adminUserId: string) {
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'verified', verified_by: adminUserId, verified_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single()
    return { data: data as Payment | null, error }
  },

  async rejectPayment(paymentId: string, adminUserId: string) {
    const { data, error } = await supabase
      .from('payments')
      .update({ status: 'failed', verified_by: adminUserId, verified_at: new Date().toISOString() })
      .eq('id', paymentId)
      .select()
      .single()
    return { data: data as Payment | null, error }
  },
}
