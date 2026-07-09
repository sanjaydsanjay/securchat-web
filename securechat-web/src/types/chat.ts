export interface ChatSettings {
  is_pinned: boolean
  is_muted: boolean
  is_archived: boolean
  custom_name: string | null
  auto_delete_hours: number | null
}

export interface Chat {
  id: string
  chat_code: string
  participant_1_id: number
  participant_2_id: number
  participant_1_settings: ChatSettings
  participant_2_settings: ChatSettings
  last_message_id: string | null
  last_message_preview: string | null
  last_message_time: string | null
  unread_count_1: number
  unread_count_2: number
  is_e2e_enabled: boolean
  e2e_shared_secret: string | null
  created_at: string
  updated_at: string
  other_user?: import('./user').UserPublicInfo
}

export interface CreateChatPayload {
  participant_unique_id: number
}
