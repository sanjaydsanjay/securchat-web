export const APP_NAME = 'SecureChat AI'
export const APP_URL = 'http://localhost:5179'

export const UNIQUE_ID_MIN = 100000
export const UNIQUE_ID_MAX = 999999

export const MESSAGE_EDIT_WINDOW_MS = 2 * 60 * 1000
export const DELETE_FOR_EVERYONE_WINDOW_MS = 2 * 60 * 60 * 1000
export const TYPING_TIMEOUT_MS = 5000
export const MAX_REPLY_DEPTH = 1
export const MAX_EDITS_PER_MESSAGE = 5
export const MAX_PINNED_CHATS = 5
export const MAX_RECENT_SEARCHES = 10

export const FREE_MESSAGE_QUOTA = 5000
export const QUOTA_WARNING_50 = 0.5
export const QUOTA_WARNING_80 = 0.8
export const QUOTA_WARNING_90 = 0.9
export const QUOTA_WARNING_95 = 0.95

export const PREMIUM_PLANS = {
  basic: { name: 'Basic', price: 50, messages: 2500, fileSize: 10, devices: 2 },
  standard: { name: 'Standard', price: 100, messages: 5000, fileSize: 25, devices: 3 },
  premium: { name: 'Premium', price: 150, messages: 10000, fileSize: 50, devices: 5 },
  enterprise: { name: 'Enterprise', price: 500, messages: -1, fileSize: 100, devices: -1 },
} as const

export const AI_MODELS = {
  primary: 'openai/gpt-4o-mini',
  fallback1: 'anthropic/claude-3-haiku',
  fallback2: 'google/gemini-flash-1.5',
} as const

export const FILE_SIZE_LIMITS = {
  image: { free: 5, premium: 25 },
  video: { free: 20, premium: 100 },
  document: { free: 10, premium: 50 },
  audio: { free: 10, premium: 50 },
} as const

export const AUTO_DELETE_OPTIONS = [
  { value: 0, label: 'After read' },
  { value: 1, label: '1 Hour' },
  { value: 6, label: '6 Hours' },
  { value: 24, label: '24 Hours (Default)' },
  { value: 168, label: '7 Days' },
  { value: -1, label: 'Never' },
] as const

export const SEARCH_LIMIT = 50

export const THEMES = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'midnight', name: 'Midnight' },
  { id: 'forest', name: 'Forest' },
  { id: 'system', name: 'System' },
] as const

export const REACTION_EMOJIS = ['thumbs_up', 'heart', 'laughing', 'surprised', 'sad', 'pray', 'fire', 'clap'] as const

export const REPORT_CATEGORIES = [
  { value: 'spam', label: 'Spam' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'threats', label: 'Threats' },
  { value: 'fake_account', label: 'Fake Account' },
  { value: 'child_safety', label: 'Child Safety' },
  { value: 'other', label: 'Other' },
] as const

export const KEYBOARD_SHORTCUTS = [
  { keys: 'Ctrl/Cmd + K', action: 'Search user' },
  { keys: 'Ctrl/Cmd + N', action: 'New chat' },
  { keys: 'Ctrl/Cmd + E', action: 'Edit last message' },
  { keys: 'Ctrl/Cmd + D', action: 'Delete last message' },
  { keys: 'Ctrl/Cmd + Shift + D', action: 'Toggle dark mode' },
  { keys: 'Escape', action: 'Close modal / Deselect chat' },
  { keys: 'Ctrl/Cmd + /', action: 'Show shortcuts help' },
] as const
