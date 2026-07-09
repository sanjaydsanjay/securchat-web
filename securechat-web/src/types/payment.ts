export type PaymentPlan = 'basic' | 'standard' | 'premium' | 'enterprise'
export type PaymentStatus = 'pending' | 'verified' | 'failed' | 'refunded'
export type PaymentMethod = 'upi' | 'razorpay' | 'card' | 'netbanking'

export interface PremiumPlan {
  id: PaymentPlan
  name: string
  price: number
  currency: string
  messages_per_month: number
  max_file_size_mb: number
  features: string[]
  devices: number
}

export interface Payment {
  id: string
  user_unique_id: number
  plan: PaymentPlan
  amount: number
  currency: string
  status: PaymentStatus
  payment_method: PaymentMethod | null
  screenshot_url: string | null
  transaction_id: string | null
  razorpay_order_id: string | null
  razorpay_payment_id: string | null
  razorpay_signature: string | null
  verified_by: string | null
  verified_at: string | null
  refund_reason: string | null
  refund_amount: number | null
  created_at: string
  updated_at: string
}

export interface CreatePaymentPayload {
  plan: PaymentPlan
  payment_method?: PaymentMethod
  screenshot_url?: string
}
