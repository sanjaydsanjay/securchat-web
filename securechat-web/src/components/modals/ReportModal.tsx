import { useState } from 'react'
import toast from 'react-hot-toast'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { REPORT_CATEGORIES } from '@/lib/constants'
import { reportService } from '@/services/reportService'
import { useAuthStore } from '@/stores/authStore'
import { useChatStore } from '@/stores/chatStore'
import type { ReportCategory } from '@/types/report'

interface ReportModalProps {
  open: boolean
  onClose: () => void
  reportedUserUniqueId: number
}

export function ReportModal({ open, onClose, reportedUserUniqueId }: ReportModalProps) {
  const [category, setCategory] = useState<ReportCategory | ''>('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const activeChatId = useChatStore((s) => s.activeChatId)

  const handleSubmit = async () => {
    if (!category) return
    setSubmitting(true)
    const { error } = await reportService.createReport({
      reported_unique_id: reportedUserUniqueId,
      chat_id: activeChatId || undefined,
      category: category as ReportCategory,
      description: description || undefined,
    })
    setSubmitting(false)
    if (error) {
      toast.error('Failed to submit report')
    } else {
      toast.success('Report submitted')
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Report User" description={`Reporting user ID: ${reportedUserUniqueId}`}>
      <div className="space-y-4">
        <Select
          value={category}
          onChange={(e) => setCategory(e.target.value as ReportCategory)}
          options={REPORT_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
          placeholder="Select category"
        />
        <div>
          <label className="text-sm font-medium mb-1 block">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
            placeholder="Add any additional information..."
          />
        </div>
        <p className="text-xs text-gray-400">The last 50 messages will be automatically attached as evidence.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!category || submitting}>
            {submitting ? 'Submitting...' : 'Submit Report'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
