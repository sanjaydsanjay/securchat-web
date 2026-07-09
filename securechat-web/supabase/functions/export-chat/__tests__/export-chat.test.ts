import { describe, it, expect } from 'vitest'

// We extract the pure filtering and formatting logic for the Edge Function.
// We test that deleted messages are excluded and metadata maps correctly.
function formatMessagesForExport(messages: any[], format: 'json' | 'pdf') {
  // Exclude deleted messages natively
  const validMessages = messages.filter(m => !m.is_deleted)
  
  if (format === 'json') {
    return JSON.stringify(validMessages.map(m => ({
      sender: m.sender_display_name,
      timestamp: m.created_at,
      content: m.content,
      attachments: m.metadata?.attachments || []
    })))
  }
  
  // PDF Text simulation
  return validMessages.map(m => `[${m.created_at}] ${m.sender_display_name}: ${m.content}`).join('\n')
}

describe('Export Chat Edge Function Logic Tests', () => {
  const mockMessages = [
    { is_deleted: false, sender_display_name: 'Alice', created_at: '2023-01-01T10:00:00Z', content: 'Hello', metadata: { attachments: ['file.jpg'] } },
    { is_deleted: true, sender_display_name: 'Bob', created_at: '2023-01-01T10:05:00Z', content: 'Secret', metadata: {} },
    { is_deleted: false, sender_display_name: 'Alice', created_at: '2023-01-01T10:10:00Z', content: 'How are you?', metadata: null }
  ]

  it('excludes deleted messages automatically', () => {
    const jsonOutput = JSON.parse(formatMessagesForExport(mockMessages, 'json'))
    expect(jsonOutput.length).toBe(2)
    expect(jsonOutput.some((m: any) => m.content === 'Secret')).toBe(false)
  })

  it('formats JSON with attachment metadata properly', () => {
    const jsonOutput = JSON.parse(formatMessagesForExport(mockMessages, 'json'))
    expect(jsonOutput[0].attachments).toEqual(['file.jpg'])
    expect(jsonOutput[1].attachments).toEqual([])
  })

  it('formats PDF plain text strings correctly', () => {
    const pdfOutput = formatMessagesForExport(mockMessages, 'pdf')
    expect(pdfOutput).toContain('[2023-01-01T10:00:00Z] Alice: Hello')
    expect(pdfOutput).not.toContain('Bob')
  })
})
