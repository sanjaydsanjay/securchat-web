import { useCallback, useState } from 'react'
import { storageService } from '@/services/storageService'
import type { ContentType } from '@/types/message'

export function useMediaUpload() {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = useCallback(
    async (file: File, chatId: string, messageId: string, contentType: ContentType) => {
      const validationError = storageService.validateFile(file, contentType)
      if (validationError) {
        setError(validationError)
        return { url: null, error: validationError }
      }

      setUploading(true)
      setProgress(0)
      setError(null)

      try {
        const path = storageService.buildMediaPath(chatId, messageId, file.name)
        const { data, error: uploadError } = await storageService.upload({
          bucket: 'chat-media',
          file,
          path,
          onProgress: setProgress,
        })

        if (uploadError || !data) {
          setError(uploadError || 'Upload failed')
          return { url: null, error: uploadError }
        }

        setProgress(100)
        return { url: data.signedUrl || data.url, error: null }
      } finally {
        setUploading(false)
      }
    },
    []
  )

  const uploadAvatar = useCallback(async (file: File, userId: number) => {
    const validationError = storageService.validateFile(file, 'image')
    if (validationError) {
      setError(validationError)
      return { url: null, error: validationError }
    }

    setUploading(true)
    setError(null)

    try {
      const path = storageService.buildAvatarPath(userId, file.name)
      const { data, error: uploadError } = await storageService.upload({
        bucket: 'avatars',
        file,
        path,
        upsert: true,
      })

      if (uploadError || !data) {
        setError(uploadError || 'Upload failed')
        return { url: null, error: uploadError }
      }

      return { url: data.url, error: null }
    } finally {
      setUploading(false)
    }
  }, [])

  const uploadVoice = useCallback(
    async (blob: Blob, chatId: string, messageId: string) => {
      const file = new File([blob], `${messageId}.webm`, { type: 'audio/webm' })

      setUploading(true)
      setProgress(0)
      setError(null)

      try {
        const path = storageService.buildVoicePath(chatId, messageId)
        const { data, error: uploadError } = await storageService.upload({
          bucket: 'voice-notes',
          file,
          path,
          onProgress: setProgress,
        })

        if (uploadError || !data) {
          setError(uploadError || 'Upload failed')
          return { url: null, error: uploadError }
        }

        setProgress(100)
        return { url: data.signedUrl || data.url, error: null }
      } finally {
        setUploading(false)
      }
    },
    []
  )

  const reset = useCallback(() => {
    setError(null)
    setProgress(0)
    setUploading(false)
  }, [])

  return { uploading, progress, error, uploadFile, uploadAvatar, uploadVoice, reset }
}
