import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select } from '@/components/ui/select'
import { useState } from 'react'
import { AUTO_DELETE_OPTIONS, THEMES } from '@/lib/constants'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const [autoDelete, setAutoDelete] = useState('24')
  const [theme, setTheme] = useState('system')
  const [showOnline, setShowOnline] = useState(true)
  const [showRead, setShowRead] = useState(true)

  return (
    <Dialog open={open} onClose={onClose} title="Settings">
      <div className="space-y-5">
        <div>
          <h3 className="text-sm font-medium mb-2">Auto-Delete Messages</h3>
          <Select
            value={autoDelete}
            onChange={(e) => setAutoDelete(e.target.value)}
            options={AUTO_DELETE_OPTIONS.map((o) => ({ value: o.value.toString(), label: o.label }))}
          />
        </div>
        <div>
          <h3 className="text-sm font-medium mb-2">Theme</h3>
          <Select
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            options={THEMES.map((t) => ({ value: t.id, label: t.name }))}
          />
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Privacy</h3>
          <div className="flex items-center justify-between">
            <span className="text-sm">Show online status</span>
            <Switch checked={showOnline} onChange={setShowOnline} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm">Show read receipts</span>
            <Switch checked={showRead} onChange={setShowRead} />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={onClose}>Save Changes</Button>
        </div>
      </div>
    </Dialog>
  )
}
