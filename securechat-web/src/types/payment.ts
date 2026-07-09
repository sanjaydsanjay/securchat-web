export type PaymentPlan = 'basic' | 'standard' | 'pro'
export type PaymentStatus = 'pending' | 'verified' | 'rejected' | 'failed'
export type PaymentMethod = 'razorpay' | 'upi' | 'phonepay'

export interface PremiumPlan {
  id: PaymentPlan
  name: string
  price: number
  currency: string
  days: number
  messages_per_month: number
  max_file_size_mb: number
  features: string[]
  devices: number
}

export interface Payment {
  id: string
  user_id: string
  amount: number
  plan_name: string
  payment_method: PaymentMethod
  transaction_id: string | null
  razorpay_payment_id: string | null
  razorpay_order_id: string | null
  screenshot_url: string | null
  status: PaymentStatus
  created_at: string
}

export interface CreatePaymentPayload {
  plan_name: string
  amount: number
  payment_method: PaymentMethod
  transaction_id?: string
  screenshot_url?: string
  razorpay_payment_id?: string
  razorpay_order_id?: string
}