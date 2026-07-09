import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Check, Crown } from 'lucide-react'
import { PREMIUM_PLANS } from '@/lib/constants'

interface PremiumModalProps {
  open: boolean
  onClose: () => void
}

export function PremiumModal({ open, onClose }: PremiumModalProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Upgrade to Premium" description="Choose a plan that suits your needs">
      <div className="grid gap-4">
        {Object.entries(PREMIUM_PLANS).map(([id, plan]) => (
          <div key={id} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[#128C7E] cursor-pointer transition-colors">
            <div className="flex items-start gap-3">
              <Crown className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm">{plan.name}</h3>
                  <Badge variant="secondary">+{plan.messages} msgs</Badge>
                </div>
                <ul className="mt-1 space-y-0.5">
                  <li className="text-xs text-gray-500 flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" /> Up to {plan.fileSize}MB files
                  </li>
                  <li className="text-xs text-gray-500 flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" /> {plan.devices} devices
                  </li>
                </ul>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">₹{plan.price}</p>
              <p className="text-xs text-gray-400">/month</p>
            </div>
          </div>
        ))}
        <Button className="w-full">Get Started</Button>
      </div>
    </Dialog>
  )
}
