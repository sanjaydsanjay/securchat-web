import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { FileDown } from 'lucide-react'

interface ChatExportProps {
  open: boolean
  onClose: () => void
  chatId: string
}

export function ChatExport({ open, onClose, chatId }: ChatExportProps) {
  const [format, setFormat] = useState('pdf')
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      // TODO: Implement actual export via Edge Function
      console.log('Exporting chat:', chatId, 'as', format)
      await new Promise((r) => setTimeout(r, 1000))
    } finally {
      setExporting(false)
      onClose()
    }
  }

  return (
    <Dialog open={open} onClose={onClose} title="Export Chat" description="Download your chat history">
      <div className="space-y-4">
        <Select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          options={[
            { value: 'pdf', label: 'PDF - Full chat with media' },
            { value: 'txt', label: 'TXT - Plain text' },
            { value: 'json', label: 'JSON - Structured data' },
          ]}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleExport} disabled={exporting}>
            <FileDown className="w-4 h-4 mr-2" />
            {exporting ? 'Exporting...' : 'Export'}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
