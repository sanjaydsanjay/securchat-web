import { v4 as uuidv4 } from 'uuid'
import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react'
import { Send, Paperclip, X, FileText, Image, Video, Loader2, Mic, Check, Pencil, Ban } from 'lucide-react'
import { MediaPicker } from '@/components/shared/MediaPicker'
import { useMediaUpload } from '@/hooks/useMediaUpload'
import { ReplyPreview } from './ReplyPreview'
import type { SendMessagePayload, ContentType, Message } from '@/types/message'

interface MessageInputProps {
  chatId: string
  replyTo?: Message | null
  onReplyClose?: () => void
  editing?: { id: string; content: string } | null
  onCancelEdit?: () => void
  onSaveEdit?: (content: string) => void
  onSend: (payload: SendMessagePayload) => void
  onTyping?: () => void
  onError?: (message: string) => void
  disabled?: boolean
}

export function MessageInput({
  chatId,
  replyTo = null,
  onReplyClose,
  editing = null,
  onCancelEdit,
  onSaveEdit,
  onSend,
  onTyping,
  onError,
  disabled = false,
}: MessageInputProps) {
  const [content, setContent] = useState('')
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [voiceListening, setVoiceListening] = useState(false)
  const voiceRecognitionRef = useRef<any>(null)
  const [pendingContentType, setPendingContentType] = useState<ContentType | null>(null)
  const { uploading, progress, uploadFile, reset } = useMediaUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) {
      setContent(editing.content)
      requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.setSelectionRange(editing.content.length, editing.content.length)
      })
    } else if (content === '') {
      // keep existing draft when not editing
    }
  }, [editing])

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
    if (disabled) return
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
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (e.key === 'Escape' && editing) { onCancelEdit?.() }
  }

  const filePreviewIcon = () => {
    if (!pendingContentType) return null
    switch (pendingContentType) {
      case 'image': return <Image className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      default: return <FileText className="w-5 h-5" />
    }
  }

  return (
    <div className="px-3 md:px-[30px] py-3 md:py-5 bg-transparent flex flex-col safe-bottom">
      {editing && (
        <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-lg bg-[#5c7cfa]/10 border border-[#5c7cfa]/30">
          <Pencil className="w-4 h-4 text-[#5c7cfa] shrink-0" />
          <span className="text-xs text-[#5c7cfa] font-medium flex-1 min-w-0 truncate">Editing message</span>
          <button onClick={onCancelEdit} className="text-xs text-[#8a99a8] hover:text-[#2b3a4a] px-2 py-1 rounded">Cancel</button>
          <button
            onClick={() => onSaveEdit?.(content.trim())}
            disabled={!content.trim()}
            className="flex items-center gap-1 text-xs text-white bg-[#5c7cfa] px-3 py-1.5 rounded-lg hover:bg-[#4c6ef5] disabled:opacity-40 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      )}

      {replyTo && !editing && (
        <div className="mb-2">
          <ReplyPreview message={replyTo} onClose={onReplyClose || (() => {})} />
        </div>
      )}

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
      {disabled ? (
        <div className="flex items-center gap-2 md:gap-3 w-full bg-gray-100 rounded-[14px] px-3 md:px-5 py-3">
          <Ban className="w-5 h-5 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-400">You have been blocked by this user</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 md:gap-3 w-full bg-white rounded-[14px] px-3 md:px-5 py-[6px]">
          <div className="flex items-center">
            <MediaPicker contentType={pendingContentType || 'image'} onSelect={(file) => handleMediaSelect(file, 'image')} onError={onError} disabled={uploading || !!editing}>
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
            placeholder={editing ? 'Edit message...' : 'Message....'}
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
            {editing ? (
              <button
                onClick={() => onSaveEdit?.(content.trim())}
                disabled={!content.trim()}
                className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] bg-[#5c7cfa] text-white flex items-center justify-center hover:bg-[#4c6ef5] transition-colors disabled:opacity-50"
                title="Save"
              >
                <Check className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            ) : (
              <button
                onClick={handleSend}
                disabled={uploading || (!content.trim() && !pendingFile)}
                className="w-9 h-9 md:w-10 md:h-10 rounded-[10px] bg-[#5c7cfa] text-white flex items-center justify-center hover:bg-[#4c6ef5] transition-colors disabled:opacity-50"
              >
                {uploading ? <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" /> : <Send className="w-4 h-4 md:w-5 md:h-5" />}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
