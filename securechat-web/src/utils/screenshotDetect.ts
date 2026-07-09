import { supabase } from '@/lib/supabaseConfig'

let logCount = 0

export function initScreenshotDetection(chatId: string, userId: number) {
  const detect = () => {
    logCount++

    const blurOverlay = document.getElementById('screenshot-blur')
    if (blurOverlay) {
      blurOverlay.classList.remove('hidden')
      setTimeout(() => blurOverlay.classList.add('hidden'), 3000)
    }

    supabase.rpc('log_audit_event', {
      p_action: 'screenshot_attempt',
      p_resource_type: 'message',
      p_resource_id: chatId,
      p_new_values: { user_id: userId, timestamp: new Date().toISOString() },
    }).then()

    if (logCount > 5) {
      document.removeEventListener('keydown', detectKeyCombo)
    }
  }

  const detectKeyCombo = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === '4') detect()
    if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 's') detect()
    if (e.key === 'PrintScreen') detect()
  }

  document.addEventListener('keydown', detectKeyCombo)

  return () => {
    document.removeEventListener('keydown', detectKeyCombo)
  }
}

export function createScreenshotBlur() {
  const existing = document.getElementById('screenshot-blur')
  if (existing) return existing

  const div = document.createElement('div')
  div.id = 'screenshot-blur'
  div.className = 'fixed inset-0 z-[9999] backdrop-blur-xl bg-black/50 hidden transition-all'
  document.body.appendChild(div)
  return div
}
