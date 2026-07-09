export type ContentType = 'text' | 'image' | 'video' | 'document' | 'voice' | 'location' | 'system'
export type AITreatLevel = 'none' | 'low' | 'medium' | 'high' | 'critical'
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'

export interface MediaMetadata {
  width?: number
  height?: number
  duration?: number
  size?: number
  mime_type?: string
}

export interface MessageReactions {
  thumbs_up?: number[]
  heart?: number[]
  laughing?: number[]
  surprised?: number[]
  sad?: number[]
  pray?: number[]
  fire?: number[]
  clap?: number[]
}

export interface EditHistoryEntry {
  content: string
  edited_at: string
}

export interface Message {
  id: string
  chat_id: string
  sender_unique_id: number
  receiver_unique_id: number
  content: string
  content_type: ContentType
  media_url: string | null
  media_metadata: MediaMetadata
  reply_to_id: string | null
  reply_to?: Message | null
  is_edited: boolean
  edit_history: EditHistoryEntry[]
  is_deleted: boolean
  deleted_for: number[]
  deleted_at: string | null
  read_by: Record<string, string>
  delivered_at: string | null
  created_at: string
  expires_at: string
  is_forwarded: boolean
  original_sender_id: number | null
  reactions: MessageReactions
  ai_analyzed: boolean
  ai_threat_level: AITreatLevel
  ai_categories: string[]
  ai_confidence: number | null
  e2e_encrypted: boolean
  e2e_nonce: string | null
  status?: MessageStatus
}

export interface SendMessagePayload {
  chat_id: string
  content: string
  content_type?: ContentType
  media_url?: string | null
  media_metadata?: MediaMetadata
  reply_to_id?: string | null
  receiver_unique_id?: number
  sender_unique_id?: number
  e2e_encrypted?: boolean
  e2e_nonce?: string | null
}

export interface ScheduledMessage {
  id: string
  chat_id: string
  sender_unique_id: number
  content: string
  content_type: ContentType
  media_url: string | null
  scheduled_for: string
  status: 'pending' | 'sent' | 'cancelled' | 'failed'
  created_at: string
}
