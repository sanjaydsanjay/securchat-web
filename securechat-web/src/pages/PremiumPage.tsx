import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, ArrowLeft, Shield, Smartphone, CreditCard, QrCode, Wallet, Upload, Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { PREMIUM_PLANS, DEV_INFO } from '@/lib/constants'
import { useAuthStore } from '@/stores/authStore'
import { paymentService } from '@/services/paymentService'
import { authService } from '@/services/authService'
import { env } from '@/lib/env'
import toast from 'react-hot-toast'
import scannerImg from './scannerimage.png'

declare global {
  interface Window {
    Razorpay: any
  }
}

export function PremiumPage() {
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [step, setStep] = useState<'plans' | 'payment' | 'upload' | 'success' | 'failed'>('plans')
  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'upi' | 'phonepay' | null>(null)
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [transactionId, setTransactionId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const trialExpired = user && !user.is_premium && !user.is_trial_active && user.plan_name === 'TRIAL EXPIRED'

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return
    const { data: profile } = await authService.getProfile(user.id)
    if (profile) {
      setUser(profile)
    }
  }, [user?.id, setUser])

  const planFeatures = {
    basic: { color: 'from-blue-500 to-blue-600', icon: Shield, features: ['25 Days Access', 'End-to-End Encryption', 'No Ads', 'Priority Support'] },
    standard: { color: 'from-purple-500 to-purple-600', icon: Wallet, features: ['45 Days Access', 'All Basic Features', 'Voice Messages', 'Chat Export', 'Message Backup'] },
    pro: { color: 'from-yellow-500 to-orange-500', icon: Crown, features: ['60 Days Access', 'All Standard Features', 'Unlimited File Upload', 'Scheduled Messages', 'Admin Dashboard Access'] },
  }

  const selectedPlanData = selectedPlan ? PREMIUM_PLANS[selectedPlan as keyof typeof PREMIUM_PLANS] : null
  const selectedPlanFeatures = selectedPlan ? planFeatures[selectedPlan as keyof typeof planFeatures] : null

  const handleRazorpayPayment = async () => {
    if (!selectedPlanData) return

    if (!window.Razorpay) {
      toast.error('Razorpay SDK not loaded. Please try again.')
      return
    }

    const options = {
      key: env.RAZORPAY_KEY_ID,
      amount: selectedPlanData.price * 100,
      currency: 'INR',
      name: 'SecureChat AI',
      description: `${selectedPlanData.name} - ${selectedPlanData.days} Days`,
      handler: async function (response: any) {
        setSubmitting(true)
        try {
          const { data, error } = await paymentService.createPayment({
            plan_name: selectedPlanData.name,
            amount: selectedPlanData.price,
            payment_method: 'razorpay',
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_order_id: response.razorpay_order_id,
          })
          if (error) throw error
          setStep('success')
          toast.success('Premium Activated Successfully!')
          await refreshProfile()
          setTimeout(() => navigate('/'), 2000)
        } catch (err) {
          console.error('Payment verification failed:', err)
          setStep('failed')
          toast.error('Payment verification failed')
        } finally {
          setSubmitting(false)
        }
      },
      prefill: { email: user?.email || '' },
      theme: { color: '#128C7E' },
      modal: {
        ondismiss: () => {
          setStep('failed')
          toast.error('Payment cancelled')
        },
      },
    }

    const razorpay = new window.Razorpay(options)
    razorpay.open()
  }

  const handleManualSubmit = async () => {
    if (!selectedPlanData || !screenshot || !transactionId.trim()) return

    setSubmitting(true)
    try {
      const { data, error } = await paymentService.createPayment({
        plan_name: selectedPlanData.name,
        amount: selectedPlanData.price,
        payment_method: paymentMethod as 'upi' | 'phonepay',
        transaction_id: transactionId,
        screenshot_url: screenshot.name,
      })
      if (error) throw error
      setStep('success')
      toast.success('Payment submitted! Pending admin verification.')
      await refreshProfile()
      setTimeout(() => navigate('/'), 2000)
    } catch (err) {
      setStep('failed')
      toast.error('Failed to submit payment')
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setSelectedPlan(null)
    setStep('plans')
    setPaymentMethod(null)
    setScreenshot(null)
    setTransactionId('')
    setSubmitting(false)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        {step !== 'plans' ? (
          <Button variant="ghost" size="icon" onClick={reset}><ArrowLeft className="w-5 h-5" /></Button>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}><ArrowLeft className="w-5 h-5" /></Button>
        )}
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" /> Premium Plans
          </h1>
          <p className="text-sm text-gray-500">Unlock premium features for your account</p>
        </div>
      </div>

      {step === 'plans' && (
        <>
          {trialExpired && (
            <div className="bg-red-900/20 rounded-xl p-4 border border-red-900/30 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-300">Your free trial has expired</p>
                <p className="text-xs text-red-400/80 mt-1">Choose a premium plan to continue using all features including AI moderation.</p>
              </div>
            </div>
          )}
          <div className="grid md:grid-cols-3 gap-6">
          {Object.entries(PREMIUM_PLANS).map(([id, plan]) => {
            const pf = planFeatures[id as keyof typeof planFeatures]
            const Icon = pf.icon
            return (
              <div key={id} className="relative rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow bg-white dark:bg-gray-900">
                <div className={`bg-gradient-to-r ${pf.color} p-5 text-white text-center`}>
                  <Icon className="w-8 h-8 mx-auto mb-2" />
                  <h3 className="font-bold text-lg">{plan.name}</h3>
                  <p className="text-3xl font-bold mt-2">₹{plan.price}</p>
                  <p className="text-sm opacity-80">{plan.days} Days</p>
                </div>
                <div className="p-5 space-y-3">
                  {pf.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                  <Button
                    className="w-full mt-3"
                    onClick={() => { setSelectedPlan(id); setStep('payment') }}
                  >
                    Buy {plan.name}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      </>)}
      

      {step === 'payment' && selectedPlanData && (
        <div className="max-w-md mx-auto space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 text-center">
            <h3 className="font-bold text-lg">{selectedPlanData.name}</h3>
            <p className="text-3xl font-bold mt-2 text-[#128C7E]">₹{selectedPlanData.price}</p>
            <p className="text-sm text-gray-500">{selectedPlanData.days} Days Access</p>
          </div>

          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Select Payment Method</p>

          <button
            onClick={() => setPaymentMethod('razorpay')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === 'razorpay' ? 'border-[#128C7E] bg-[#128C7E]/5' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <CreditCard className="w-6 h-6 text-blue-500" />
            <div className="text-left">
              <p className="font-medium">Razorpay</p>
              <p className="text-xs text-gray-500">Pay with UPI, Cards, Netbanking, Wallet</p>
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('upi')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === 'upi' ? 'border-[#128C7E] bg-[#128C7E]/5' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <QrCode className="w-6 h-6 text-green-500" />
            <div className="text-left">
              <p className="font-medium">UPI QR</p>
              <p className="text-xs text-gray-500">Scan QR code with any UPI app</p>
            </div>
          </button>

          <button
            onClick={() => setPaymentMethod('phonepay')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all ${paymentMethod === 'phonepay' ? 'border-[#128C7E] bg-[#128C7E]/5' : 'border-gray-200 dark:border-gray-700'}`}
          >
            <Smartphone className="w-6 h-6 text-purple-500" />
            <div className="text-left">
              <p className="font-medium">PhonePe</p>
              <p className="text-xs text-gray-500">Pay via PhonePe number</p>
            </div>
          </button>

          {paymentMethod === 'razorpay' && (
            <Button onClick={handleRazorpayPayment} className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Pay ₹{selectedPlanData.price} via Razorpay
            </Button>
          )}

          {(paymentMethod === 'upi' || paymentMethod === 'phonepay') && (
            <div className="space-y-4 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-sm font-medium">Developer Payment Details</p>
              <div className="text-sm space-y-2">
                <p><span className="text-gray-500">UPI ID:  </span>    93532137@fam</p>
                <p><span className="text-gray-500">PhonePe:  </span>    9353213719</p>
              </div>
              <div className="w-40 h-40 bg-gray-200 dark:bg-gray-700 mx-auto rounded-lg flex items-center justify-center overflow-hidden">
                <img src={scannerImg} alt="scanner Image" className="w-full h-full object-cover" />
              </div>
              
              <p className="text-xs text-gray-400 text-center">Scan this QR code with any UPI app to pay</p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Upload Payment Screenshot</label>
                  <label className="flex flex-col items-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <Upload className="w-6 h-6 text-gray-400" />
                    <span className="text-xs text-gray-500">{screenshot ? screenshot.name : 'Tap to upload screenshot'}</span>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
                  </label>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Transaction ID</label>
                  <input
                    type="text"
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter UPI transaction reference"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm"
                  />
                </div>
                <Button onClick={handleManualSubmit} className="w-full" disabled={!screenshot || !transactionId || submitting}>
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit for Verification
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {step === 'success' && (
        <div className="text-center py-12 space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold">Premium Activated Successfully!</h2>
          <p className="text-gray-500">Your premium plan is now active. Enjoy all the features.</p>
          <Button onClick={() => navigate('/')}>Go to Chat</Button>
        </div>
      )}

      {step === 'failed' && (
        <div className="text-center py-12 space-y-4">
          <XCircle className="w-16 h-16 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold">Payment Failed</h2>
          <p className="text-gray-500">Your payment was not processed. Please try again.</p>
          <Button onClick={reset}>Try Again</Button>
        </div>
      )}
    </div>
  )
}

export default PremiumPage