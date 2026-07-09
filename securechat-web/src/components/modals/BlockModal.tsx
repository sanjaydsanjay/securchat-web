import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface BlockModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  displayName: string
}

export function BlockModal({ open, onClose, onConfirm, displayName }: BlockModalProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Block User">
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700 dark:text-red-300">
            Are you sure you want to block <strong>{displayName}</strong>?
          </p>
        </div>
        <p className="text-xs text-gray-500">
          They won't be able to message you and their chat will be archived.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" onClick={onConfirm}>Block</Button>
        </div>
      </div>
    </Dialog>
  )
}
