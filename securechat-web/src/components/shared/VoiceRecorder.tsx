import { useState, useRef, useCallback, useEffect } from 'react'
import { Mic, Square } from 'lucide-react'

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, duration: number) => void
  onError?: (message: string) => void
  disabled?: boolean
}

const MAX_DURATION_MS = 5 * 60 * 1000

export function VoiceRecorder({ onRecorded, onError, disabled }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false)
  const [duration, setDuration] = useState(0)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    stopTimer()
    setRecording(false)
  }, [stopTimer])

  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [stopRecording])

  const handleStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      setPermissionDenied(false)

      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const elapsed = Date.now() - startTimeRef.current
        stream.getTracks().forEach((t) => t.stop())
        onRecorded(blob, Math.min(elapsed, MAX_DURATION_MS))
        setDuration(0)
      }

      recorder.onerror = () => {
        onError?.('Recording failed')
        stream.getTracks().forEach((t) => t.stop())
        setDuration(0)
      }

      recorder.start(250)
      startTimeRef.current = Date.now()
      setRecording(true)

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current
        setDuration(elapsed)
        if (elapsed >= MAX_DURATION_MS) {
          stopRecording()
        }
      }, 100)
    } catch (err) {
      const message = (err as DOMException)?.name === 'NotAllowedError'
        ? 'Microphone access denied'
        : 'Could not start recording'
      setPermissionDenied(true)
      onError?.(message)
    }
  }

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000)
    const min = Math.floor(totalSec / 60)
    const sec = totalSec % 60
    return `${min}:${sec.toString().padStart(2, '0')}`
  }

  const remaining = Math.max(0, MAX_DURATION_MS - duration)

  if (permissionDenied) return null

  return (
    <div className="flex items-center gap-2">
      {recording ? (
        <>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-sm font-mono text-red-500 tabular-nums">
              {formatTime(duration)}
            </span>
          </div>
          <span className="text-[10px] text-gray-400">
            ({formatTime(remaining)} left)
          </span>
          <button
            onClick={stopRecording}
            className="p-1.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
            title="Stop recording"
            aria-label="Stop recording"
          >
            <Square className="w-4 h-4" />
          </button>
        </>
      ) : (
        <button
          onClick={handleStart}
          disabled={disabled}
          className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          title="Record voice message"
          aria-label="Record voice message"
        >
          <Mic className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}
