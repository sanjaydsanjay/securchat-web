import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown, ArrowLeft } from 'lucide-react'
import { PREMIUM_PLANS } from '@/lib/constants'
import { PaymentModal } from '@/components/modals/PaymentModal'

export function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [paymentOpen, setPaymentOpen] = useState(false)

  const planData = {
    basic: { name: 'Basic', price: 50, color: 'from-blue-500 to-blue-600', features: ['+2,500 messages/month', '10MB file upload', 'No ads', '2 devices'] },
    standard: { name: 'Standard', price: 100, color: 'from-purple-500 to-purple-600', features: ['+5,000 messages/month', '25MB file upload', 'Voice messages', 'Chat export', '3 devices'] },
    premium: { name: 'Premium', price: 150, color: 'from-yellow-500 to-orange-500', features: ['+10,000 messages/month', '50MB file upload', 'E2E encryption', 'Scheduled messages', '5 devices'] },
    enterprise: { name: 'Enterprise', price: 500, color: 'from-red-500 to-red-600', features: ['Unlimited messages', '100MB file upload', 'Admin dashboard', 'API access', 'Custom branding'] },
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        <div>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" /> Premium Plans
          </h1>
          <p className="text-sm text-gray-500">Unlock more features with a premium subscription</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(planData).map(([id, plan]) => (
          <div
            key={id}
            className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
          >
            <div className={`bg-gradient-to-r ${plan.color} p-4 text-white text-center`}>
              <h3 className="font-bold text-lg">{plan.name}</h3>
              <p className="text-3xl font-bold mt-2">₹{plan.price}</p>
              <p className="text-sm opacity-80">per month</p>
            </div>
            <div className="p-4 space-y-3">
              {plan.features.map((feature) => (
                <div key={feature} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
              <Button
                className="w-full mt-2"
                onClick={() => { setSelectedPlan(id); setPaymentOpen(true) }}
              >
                Choose {plan.name}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {selectedPlan && (
        <PaymentModal
          open={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          plan={selectedPlan}
          amount={planData[selectedPlan as keyof typeof planData]?.price || 0}
        />
      )}
    </div>
  )
}

export default PremiumPage
