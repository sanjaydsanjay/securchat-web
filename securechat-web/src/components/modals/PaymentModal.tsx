import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, CheckCircle, Loader2, Crown, Smartphone, CreditCard, QrCode, Wallet } from 'lucide-react'
import { env } from '@/lib/env'
import { paymentService } from '@/services/paymentService'
import { DEV_INFO } from '@/lib/constants'
import toast from 'react-hot-toast'

declare global {
  interface Window {
    Razorpay: any
  }
}

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  plan: string
  amount: number
  planDays?: number
}

export function PaymentModal({ open, onClose, plan, amount, planDays }: PaymentModalProps) {
  const [step, setStep] = useState<'method' | 'razorpay' | 'manual' | 'success'>('method')
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'phonepay' | null>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleRazorpayPayment = async () => {
    if (!window.Razorpay) {
      toast.error('Razorpay SDK not loaded')
      return
    }

    const options = {
      key: env.RAZORPAY_KEY_ID,
      amount: amount * 100,
      currency: 'INR',
      name: 'SecureChat AI',
      description: `${plan} - ${planDays || ''} Days`.trim(),
      handler: async function (response: any) {
        setSubmitting(true)
        try {
          const { error } = await paymentService.createPayment({
            plan_name: plan,
            amount,
            payment_method: 'razorpay',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          })
          if (error) throw error
          setStep('success')
          toast.success('Premium Activated Successfully!')
        } catch (err) {
          toast.error('Payment verification failed')
        } finally {
          setSubmitting(false)
        }
      },
      theme: { color: '#128C7E' },
      modal: {
        ondismiss: () => toast.error('Payment cancelled'),
      },
    }
    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }

  const handleManualSubmit = async () => {
    if (!screenshot || !transactionId.trim()) return
    setSubmitting(true)
    try {
      const { error } = await paymentService.createPayment({
        plan_name: plan,
        amount,
        payment_method: paymentMethod as 'upi' | 'phonepay',
        transaction_id: transactionId,
        screenshot_url: screenshot.name,
      })
      if (error) throw error
      setStep('success')
      toast.success('Payment submitted! Pending verification.')
    } catch (err) {
      toast.error('Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setStep('method')
    setPaymentMethod(null)
    setScreenshot(null)
    setTransactionId('')
    setSubmitting(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={`Complete Payment - ${plan}`}>
      {step === 'method' && (
        <div className="space-y-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 text-center mb-2">
            <p className="text-lg font-bold">₹{amount}</p>
            <p className="text-xs text-gray-500">{planDays || ''} Days Access</p>
          </div>

          <button
            onClick={() => { setPaymentMethod('razorpay'); setStep('razorpay') }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#128C7E]"
          >
            <CreditCard className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium">Pay with Razorpay</span>
          </button>
          <button
            onClick={() => { setPaymentMethod('upi'); setStep('manual') }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#128C7E]"
          >
            <QrCode className="w-5 h-5 text-green-500" />
            <span className="text-sm font-medium">Pay with UPI QR</span>
          </button>
          <button
            onClick={() => { setPaymentMethod('phonepay'); setStep('manual') }}
            className="w-full flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#128C7E]"
          >
            <Wallet className="w-5 h-5 text-purple-500" />
            <span className="text-sm font-medium">Pay with PhonePe</span>
          </button>
        </div>
      )}

      {step === 'razorpay' && (
        <div className="space-y-4 text-center">
          <p className="text-sm">You will be redirected to Razorpay checkout</p>
          <Button onClick={handleRazorpayPayment} className="w-full" disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Pay ₹{amount}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStep('method')}>
            Back
          </Button>
        </div>
      )}

      {step === 'manual' && (
        <div className="space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-1 text-sm">
            <p><span className="text-gray-500">UPI ID:</span> <strong>{DEV_INFO.upi_id}</strong></p>
            <p><span className="text-gray-500">PhonePe:</span> <strong>{DEV_INFO.phonepay}</strong></p>
          </div>
          <div className="w-36 h-36 bg-gray-200 dark:bg-gray-700 mx-auto rounded-lg flex items-center justify-center">
            <QrCode className="w-12 h-12 text-gray-400" />
          </div>
          <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <Upload className="w-6 h-6 text-gray-400" />
            <span className="text-xs text-gray-500">{screenshot ? screenshot.name : 'Upload payment screenshot'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
          </label>
          <Input
            placeholder="Enter transaction ID"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
          />
          <Button onClick={handleManualSubmit} disabled={!screenshot || !transactionId || submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit for Verification
          </Button>
        </div>
      )}

      {step === 'success' && (
        <div className="text-center space-y-3 py-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <p className="font-medium">Payment submitted successfully!</p>
          <p className="text-xs text-gray-500">
            {paymentMethod === 'razorpay' ? 'Premium activated immediately.' : 'Admin will verify your payment shortly.'}
          </p>
          <Button onClick={handleClose}>Done</Button>
        </div>
      )}
    </Dialog>
  )
}