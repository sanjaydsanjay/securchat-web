import { Dialog } from '@/components/ui/dialog'
import { Check, CheckCheck, Clock, AlertCircle, Lock, Pencil } from 'lucide-react'
import type { Message } from '@/types/message'

interface MessageInfoModalProps {
  open: boolean
  message: Message | null
  isOwn: boolean
  onClose: () => void
}

function formatTime(value: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function MessageInfoModal({ open, message, isOwn, onClose }: MessageInfoModalProps) {
  if (!message) return null

  const readCount = message.read_by ? Object.keys(message.read_by).length : 0
  const hasRead = isOwn && readCount > 0
  const isDelivered = !!message.delivered_at

  let statusLabel = 'Sending'
  let StatusIcon = Clock
  if (message.status === 'failed') {
    statusLabel = 'Failed'
    StatusIcon = AlertCircle
  } else if (hasRead) {
    statusLabel = 'Read'
    StatusIcon = CheckCheck
  } else if (isDelivered) {
    statusLabel = 'Delivered'
    StatusIcon = CheckCheck
  } else if (message.status === 'sent') {
    statusLabel = 'Sent'
    StatusIcon = Check
  }

  return (
    <Dialog open={open} onClose={onClose} title="Message info">
      <div className="space-y-4 text-sm">
        <Row label="Status">
          <span className="flex items-center gap-1.5 text-[#2b3a4a] dark:text-gray-200">
            <StatusIcon className="w-4 h-4" /> {statusLabel}
          </span>
        </Row>
        <Row label="Sent">{formatTime(message.created_at)}</Row>
        <Row label="Delivered">{formatTime(message.delivered_at)}</Row>
        {isOwn && <Row label="Read by">{readCount > 0 ? `${readCount} recipient(s)` : 'Not read yet'}</Row>}
        {message.is_edited && (
          <Row label="Edited">
            <span className="flex items-center gap-1.5 text-[#2b3a4a] dark:text-gray-200">
              <Pencil className="w-4 h-4" /> Yes
            </span>
          </Row>
        )}
        <Row label="Encrypted">
          {message.e2e_encrypted ? (
            <span className="flex items-center gap-1.5 text-[#2b3a4a] dark:text-gray-200">
              <Lock className="w-4 h-4" /> Yes
            </span>
          ) : (
            'No'
          )}
        </Row>
        <Row label="Message ID" mono>
          {message.id}
        </Row>
      </div>
    </Dialog>
  )
}

function Row({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-[#8a99a8] shrink-0">{label}</span>
      <span className={`text-right text-[#2b3a4a] dark:text-gray-200 ${mono ? 'font-mono text-xs break-all' : 'truncate max-w-[60%]'}`}>
        {children}
      </span>
    </div>
  )
}
