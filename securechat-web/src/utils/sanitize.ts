const ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
}

const UNSAFE_PATTERN = /[&<>"'/]/g

export function escapeHtml(text: string): string {
  return text.replace(UNSAFE_PATTERN, (char) => ENTITY_MAP[char] || char)
}

export function sanitizeDisplayName(name: string): string {
  return escapeHtml(name.trim()).slice(0, 50)
}

export function sanitizeBio(bio: string): string {
  return escapeHtml(bio.trim()).slice(0, 200)
}

export function sanitizeMessageContent(content: string): string {
  const trimmed = content.trim()
  if (trimmed.length === 0) return ''
  if (trimmed.length > 5000) return trimmed.slice(0, 5000)
  return trimmed
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '')
}
