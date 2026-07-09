import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar, Clock } from 'lucide-react'

interface ScheduledMessageModalProps {
  open: boolean
  onClose: () => void
  onSchedule: (content: string, scheduledFor: string) => void
}

export function ScheduledMessageModal({ open, onClose, onSchedule }: ScheduledMessageModalProps) {
  const [content, setContent] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')

  const handleSchedule = () => {
    const scheduledFor = `${date}T${time}:00`
    onSchedule(content, scheduledFor)
    setContent('')
    setDate('')
    setTime('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Schedule Message">
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Message</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm resize-none"
            placeholder="Type your message..."
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-1">
              <Calendar className="w-4 h-4" /> Date
            </label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block flex items-center gap-1">
              <Clock className="w-4 h-4" /> Time
            </label>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSchedule} disabled={!content || !date || !time}>Schedule</Button>
        </div>
      </div>
    </Dialog>
  )
}
