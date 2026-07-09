import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Lock, Shield } from 'lucide-react'
import { useState } from 'react'

interface E2EEnableModalProps {
  open: boolean
  onClose: () => void
  onConfirm: (enabled: boolean) => void
}

export function E2EEnableModal({ open, onClose, onConfirm }: E2EEnableModalProps) {
  const [enabled, setEnabled] = useState(false)

  return (
    <Dialog open={open} onClose={onClose} title="End-to-End Encryption">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <Lock className="w-5 h-5 text-blue-500 shrink-0" />
          <p className="text-sm text-blue-700 dark:text-blue-300">
            Enable E2E encryption for this chat. Messages will be encrypted on your device.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#128C7E]" />
            <span className="text-sm font-medium">Encrypt this chat</span>
          </div>
          <Switch checked={enabled} onChange={setEnabled} />
        </div>
        <p className="text-xs text-gray-500">
          Both users must agree to enable E2E encryption. Once enabled, server cannot read message content.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm(enabled)}>{enabled ? 'Enable' : 'Skip'}</Button>
        </div>
      </div>
    </Dialog>
  )
}
