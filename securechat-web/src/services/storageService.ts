import { supabase } from '@/lib/supabaseConfig'
import { FILE_SIZE_LIMITS } from '@/lib/constants'
import type { ContentType } from '@/types/message'

export type BucketName = 'avatars' | 'chat-media' | 'voice-notes' | 'payment-screenshots'

export interface UploadOptions {
  bucket: BucketName
  file: File
  path: string
  upsert?: boolean
  onProgress?: (percent: number) => void
}

export interface UploadResult {
  path: string
  url: string
  signedUrl?: string
}

const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  video: ['video/mp4', 'video/webm', 'video/quicktime'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ],
  audio: ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/wav'],
}

function getMaxSize(bytes: number): string {
  const mb = bytes / (1024 * 1024)
  return `${mb.toFixed(1)} MB`
}

export const storageService = {
  validateFile(file: File, contentType: ContentType): string | null {
    const typeGroup =
      contentType === 'image'
        ? 'image'
        : contentType === 'video'
          ? 'video'
          : contentType === 'voice'
            ? 'audio'
            : 'document'

    const allowed = ALLOWED_MIME_TYPES[typeGroup]
    if (!allowed?.includes(file.type)) {
      return `Invalid file type. Allowed: ${allowed?.join(', ') || 'N/A'}`
    }

    const limitMB =
      FILE_SIZE_LIMITS[typeGroup as keyof typeof FILE_SIZE_LIMITS]?.free ?? 10
    const limitBytes = limitMB * 1024 * 1024
    if (file.size > limitBytes) {
      return `File too large. Maximum: ${getMaxSize(limitBytes)}`
    }

    return null
  },

  buildAvatarPath(userId: number, filename: string): string {
    const ext = filename.split('.').pop() || 'jpg'
    return `${userId}/avatar.${ext}`
  },

  buildMediaPath(chatId: string, messageId: string, filename: string): string {
    return `${chatId}/${messageId}/${filename}`
  },

  buildVoicePath(chatId: string, messageId: string): string {
    return `${chatId}/${messageId}.webm`
  },

  async upload(opts: UploadOptions): Promise<{ data: UploadResult | null; error: string | null }> {
    const { bucket, file, path, upsert = true } = opts

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert,
        cacheControl: '3600',
        contentType: file.type,
      })

    if (error) {
      return { data: null, error: error.message }
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(path)

    let signedUrl: string | undefined
    if (bucket !== 'avatars') {
      const { data: signedData } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 3600)
      if (signedData) {
        signedUrl = signedData.signedUrl
      }
    }

    return {
      data: { path, url: publicUrl, signedUrl },
      error: null,
    }
  },

  async getSignedUrl(
    bucket: BucketName,
    path: string,
    expiresIn = 3600
  ): Promise<string | null> {
    if (bucket === 'avatars') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    if (error || !data) return null
    return data.signedUrl
  },

  async deleteFile(
    bucket: BucketName,
    path: string
  ): Promise<{ error: string | null }> {
    const { error } = await supabase.storage.from(bucket).remove([path])
    return { error: error?.message || null }
  },

  async deleteFolder(
    bucket: BucketName,
    folderPath: string
  ): Promise<{ error: string | null }> {
    const { data: files, error: listError } = await supabase.storage
      .from(bucket)
      .list(folderPath)
    if (listError) return { error: listError.message }
    if (!files?.length) return { error: null }

    const paths = files.map((f) => `${folderPath}/${f.name}`)
    const { error } = await supabase.storage.from(bucket).remove(paths)
    return { error: error?.message || null }
  },

  async getFileUrl(
    bucket: BucketName,
    path: string
  ): Promise<string | null> {
    if (bucket === 'avatars') {
      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      return data.publicUrl
    }
    return storageService.getSignedUrl(bucket, path)
  },

  getPublicUrl(bucket: BucketName, path: string): string {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  },

  getAvatarUrl(avatarPath: string | null): string | null {
    if (!avatarPath) return null
    return storageService.getPublicUrl('avatars', avatarPath)
  },
}
