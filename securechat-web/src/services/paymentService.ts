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
      days: plan.days,
      messages_per_month: plan.messages,
      max_file_size_mb: plan.fileSize,
      features: [],
      devices: plan.devices,
    }))
  },

  async createPayment(payload: CreatePaymentPayload): Promise<{ data: Payment | null; error: unknown }> {
    const { data: user } = await supabase
      .from('users')
      .select('unique_id')
      .eq('auth_id', (await supabase.auth.getUser()).data.user?.id)
      .single()

    if (!user) return { data: null, error: 'User not found' }

    const { data, error } = await supabase
      .from('payments')
      .insert({
        user_unique_id: user.unique_id,
        plan: payload.plan_name,
        plan_name: payload.plan_name,
        amount: payload.amount,
        payment_method: payload.payment_method,
        transaction_id: payload.transaction_id || null,
        screenshot_url: payload.screenshot_url || null,
        razorpay_payment_id: payload.razorpay_payment_id || null,
        razorpay_order_id: payload.razorpay_order_id || null,
        status: 'pending',
      })
      .select()
      .single()
    return { data: data as Payment | null, error }
  },

  async getPaymentHistory(): Promise<{ data: Payment[] | null; error: unknown }> {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    return { data: data as Payment[] | null, error }
  },

  async getAllPendingPayments(): Promise<{ data: Payment[] | null; error: unknown }> {
    const { data, error } = await supabase
      .from('payments')
      .select('*, users:user_id(display_name, unique_id, email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    return { data: data as any, error }
  },

  async approvePayment(paymentId: string) {
    const { error } = await supabase.rpc('admin_approve_payment', { p_payment_id: paymentId })
    return { error }
  },

  async rejectPayment(paymentId: string) {
    const { error } = await supabase.rpc('admin_reject_payment', { p_payment_id: paymentId })
    return { error }
  },

  async checkTrial(): Promise<{ data: any; error: unknown }> {
    const user = (await supabase.auth.getUser()).data.user
    if (!user) return { data: null, error: 'Not authenticated' }

    const { data, error } = await supabase.rpc('check_and_expire_trials', { p_user_id: user.id })
    return { data, error }
  },
}