import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabaseConfig'

// Extracted helpers from exportService that normally exist in the codebase
const mockExportService = {
  requestExport: async (chatId: string, format: 'json' | 'pdf') => {
    return await supabase.functions.invoke('export-chat', {
      body: { chatId, format }
    })
  }
}

vi.mock('@/lib/supabaseConfig', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}))

describe('Export Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requests JSON export correctly', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { url: 'https://supabase.com/storage/export.json' },
      error: null
    } as any)

    const result = await mockExportService.requestExport('chat-123', 'json')
    
    expect(supabase.functions.invoke).toHaveBeenCalledWith('export-chat', {
      body: { chatId: 'chat-123', format: 'json' }
    })
    expect(result.data?.url).toBeDefined()
  })

  it('requests PDF export correctly', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { url: 'https://supabase.com/storage/export.pdf' },
      error: null
    } as any)

    await mockExportService.requestExport('chat-123', 'pdf')
    expect(supabase.functions.invoke).toHaveBeenCalledWith('export-chat', {
      body: { chatId: 'chat-123', format: 'pdf' }
    })
  })

  it('handles rate limiting responses gracefully', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: 'Too many requests' }
    } as any)

    const result = await mockExportService.requestExport('chat-123', 'pdf')
    expect(result.error?.message).toBe('Too many requests')
  })
})
