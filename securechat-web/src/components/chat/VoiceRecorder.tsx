import { v4 as uuidv4 } from 'uuid'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Mic, Square, Send, Trash2, Loader2 } from 'lucide-react'
import { VoiceRecorder as Recorder } from '@/components/shared/VoiceRecorder'
import { useMediaUpload } from '@/hooks/useMediaUpload'

interface VoiceRecorderProps {
  chatId: string
  onSend: (url: string, duration: number) => void
  onError?: (message: string) => void
}

export function VoiceRecorder({ chatId, onSend, onError }: VoiceRecorderProps) {
  const [blob, setBlob] = useState<Blob | null>(null)
  const [duration, setDuration] = useState(0)
  const { uploading, uploadVoice, reset } = useMediaUpload()

  const handleRecorded = (recordedBlob: Blob, recordedDuration: number) => {
    setBlob(recordedBlob)
    setDuration(recordedDuration)
  }

  const handleSend = async () => {
    if (!blob) return
    const messageId = uuidv4()
    const { url, error } = await uploadVoice(blob, chatId, messageId)
    if (error) {
      onError?.(error)
      return
    }
    if (url) {
      onSend(url, duration)
    }
    setBlob(null)
    setDuration(0)
    reset()
  }

  const handleCancel = () => {
    setBlob(null)
    setDuration(0)
    reset()
  }

  const formatDuration = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const m = Math.floor(totalSec / 60)
    const s = totalSec % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (blob) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
        <span className="text-sm font-medium tabular-nums">{formatDuration(duration)}</span>
        <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div className="h-full w-1/3 bg-[#128C7E] rounded-full" />
        </div>
        <Button variant="ghost" size="icon" onClick={handleCancel} disabled={uploading} aria-label="Cancel recording">
          <Trash2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleSend} disabled={uploading} aria-label="Send recording">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    )
  }

  return (
    <Recorder onRecorded={handleRecorded} onError={onError} disabled={uploading} />
  )
}
