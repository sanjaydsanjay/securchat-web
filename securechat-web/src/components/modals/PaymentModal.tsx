import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, CheckCircle, Loader2 } from 'lucide-react'

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  plan: string
  amount: number
}

export function PaymentModal({ open, onClose, plan, amount }: PaymentModalProps) {
  const [step, setStep] = useState<'details' | 'qr' | 'upload' | 'success'>('details')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    setSubmitting(true)
    await new Promise((r) => setTimeout(r, 1500))
    setSubmitting(false)
    setStep('success')
  }

  return (
    <Dialog open={open} onClose={onClose} title="Complete Payment">
      {step === 'details' && (
        <div className="space-y-4">
          <p className="text-sm">Plan: <strong>{plan}</strong></p>
          <p className="text-sm">Amount: <strong>₹{amount}</strong></p>
          <Button onClick={() => setStep('qr')} className="w-full">Proceed to Pay</Button>
        </div>
      )}
      {step === 'qr' && (
        <div className="space-y-4 text-center">
          <div className="w-48 h-48 bg-gray-200 dark:bg-gray-700 mx-auto rounded-lg flex items-center justify-center">
            <p className="text-sm text-gray-500">UPI QR Code</p>
          </div>
          <p className="text-sm text-gray-500">Scan with any UPI app to pay</p>
          <Button onClick={() => setStep('upload')}>I have paid</Button>
        </div>
      )}
      {step === 'upload' && (
        <div className="space-y-4">
          <label className="flex flex-col items-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800">
            <Upload className="w-8 h-8 text-gray-400" />
            <span className="text-sm text-gray-500">Upload payment screenshot</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setScreenshot(e.target.files?.[0] || null)} />
          </label>
          {screenshot && <p className="text-xs text-gray-500">{screenshot.name}</p>}
          <Button onClick={handleSubmit} disabled={!screenshot || submitting} className="w-full">
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Submit for Verification
          </Button>
        </div>
      )}
      {step === 'success' && (
        <div className="text-center space-y-4">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
          <p className="text-sm">Payment submitted! Admin will verify shortly.</p>
          <Button onClick={onClose}>Done</Button>
        </div>
      )}
    </Dialog>
  )
}
