import { useRef, type ChangeEvent } from 'react'
import { storageService } from '@/services/storageService'
import type { ContentType } from '@/types/message'

interface MediaPickerProps {
  contentType: ContentType
  onSelect: (file: File) => void
  onError?: (message: string) => void
  disabled?: boolean
  children: React.ReactNode
}

const ACCEPT_MAP: Record<string, string> = {
  image: 'image/jpeg,image/png,image/webp,image/gif',
  video: 'video/mp4,video/webm,video/quicktime',
  document: '.pdf,.doc,.docx,.txt,.csv',
  voice: 'audio/*',
}

export function MediaPicker({ contentType, onSelect, onError, disabled, children }: MediaPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClick = () => {
    if (disabled) return
    inputRef.current?.click()
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const validationError = storageService.validateFile(file, contentType)
    if (validationError) {
      onError?.(validationError)
      e.target.value = ''
      return
    }

    onSelect(file)
    e.target.value = ''
  }

  return (
    <>
      <button type="button" onClick={handleClick} disabled={disabled} className="disabled:opacity-50">
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        data-testid="media-picker-input"
        accept={ACCEPT_MAP[contentType] || '*/*'}
        onChange={handleChange}
        className="hidden"
      />
    </>
  )
}
