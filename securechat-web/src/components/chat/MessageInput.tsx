import { v4 as uuidv4 } from 'uuid'
import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Send, Paperclip, X, FileText, Image, Video, Loader2, Mic } from 'lucide-react'
import { MediaPicker } from '@/components/shared/MediaPicker'
import { useMediaUpload } from '@/hooks/useMediaUpload'
import type { SendMessagePayload, ContentType } from '@/types/message'

interface MessageInputProps {
  chatId: string
  onSend: (payload: SendMessagePayload) => void
  onTyping?: () => void
  onError?: (message: string) => void
}

export function MessageInput({ chatId, onSend, onTyping, onError }: MessageInputProps) {
  const [content, setContent] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [voiceListening, setVoiceListening] = useState(false)
  const voiceRecognitionRef = useRef<any>(null)
  const [pendingContentType, setPendingContentType] = useState<ContentType | null>(null)
  const { uploading, progress, uploadFile, reset } = useMediaUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  const clearPending = () => { setPendingFile(null); setPendingContentType(null); reset() }
  const handleMediaSelect = (file: File, contentType: ContentType) => { setPendingFile(file); setPendingContentType(contentType) }

  const toggleVoiceInput = useCallback(() => {
    if (voiceRecognitionRef.current) {
      voiceRecognitionRef.current.stop()
      voiceRecognitionRef.current = null
      setVoiceListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      onError?.('Speech recognition not supported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1]
      if (result) setContent(result[0].transcript)
    }

    recognition.onerror = () => {
      voiceRecognitionRef.current = null
      setVoiceListening(false)
    }

    recognition.onend = () => {
      voiceRecognitionRef.current = null
      setVoiceListening(false)
    }

    recognition.start()
    voiceRecognitionRef.current = recognition
    setVoiceListening(true)
  }, [onError])

  useEffect(() => {
    return () => { voiceRecognitionRef.current?.abort() }
  }, [])

  const handleSend = async () => {
    const trimmed = content.trim()
    if (pendingFile && pendingContentType) {
      const messageId = uuidv4()
      const { url, error } = await uploadFile(pendingFile, chatId, messageId, pendingContentType)
      if (error || !url) { onError?.(error || 'Upload failed'); return }
      onSend({ chat_id: chatId, content: trimmed, content_type: pendingContentType, media_url: url, media_metadata: { size: pendingFile.size, mime_type: pendingFile.type } })
      clearPending(); setContent(''); inputRef.current?.focus()
      return
    }
    if (!trimmed) return
    onSend({ chat_id: chatId, content: trimmed, content_type: 'text' })
    setContent(''); inputRef.current?.focus()
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { setContent(e.target.value); onTyping?.() }
  const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }

  const filePreviewIcon = () => {
    if (!pendingContentType) return null
    switch (pendingContentType) {
      case 'image': return <Image className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  return (
    <div className="px-3 md:px-[30px] py-3 md:py-5 bg-transparent flex flex-col">
      {pendingFile && (
        <div className="flex items-center gap-3 px-4 py-2.5 mb-3 bg-white rounded-lg shadow-sm border border-gray-100">
          {filePreviewIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-[#2b3a4a]">{pendingFile.name}</p>
            <p className="text-xs text-[#8a99a8]">{(pendingFile.size / 1024 / 1024).toFixed(1)} MB</p>
          </div>
          {uploading && (
            <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-[#5c7cfa] rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <button onClick={clearPending} disabled={uploading} className="p-1 text-[#8a99a8] hover:bg-gray-100 rounded-full disabled:opacity-50 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 md:gap-3 w-full bg-white rounded-[14px] px-3 md:px-5 py-[6px]">
        <div className="flex items-center">
          <MediaPicker contentType={pendingContentType || 'image'} onSelect={(file) => handleMediaSelect(file, 'image')} onError={onError} disabled={uploading}>
            <span className="flex text-[#8a99a8] hover:text-[#2b3a4a] transition-colors cursor-pointer">
              <Paperclip className="w-5 h-5 md:w-6 md:h-6" />
            </span>
          </MediaPicker>
        </div>
        <input
          ref={inputRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Message...."
          className="flex-1 bg-transparent text-[14px] text-[#2b3a4a] placeholder-[#8a99a8] outline-none py-2 min-w-0"
          maxLength={5000}
          disabled={uploading}
        />
        <div className="flex items-center gap-1 md:gap-2 shrink-0">
          <button
            onClick={toggleVoiceInput}
            className={`w-9 h-9 md:w-10 md:h-10 rounded-[10px] flex items-center justify-center transition-colors ${
              voiceListening ? 'bg-red-500 text-white animate-pulse' : 'text-[#8a99a8] hover:text-[#2b3a4a]'
            }`}
            title="Voice input"
          >
            <Mic className="w-4 h-4 md:w-5 md:h-5" />
          </button>
          <button
            onClick={handleSend}
            disabled={uploading || (!content.trim() && !pendingFile)}
            className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] bg-[#5c7cfa] text-white flex items-center justify-center hover:bg-[#4c6ef5] transition-colors disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
          </button>
        </div>
      </div>
    </div>
  )
}
