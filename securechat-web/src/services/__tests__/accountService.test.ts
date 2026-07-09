import { describe, it, expect, vi, beforeEach } from 'vitest'
import { supabase } from '@/lib/supabaseConfig'
import { useAuthStore } from '@/stores/authStore'

// Mock implementation of the deleteAccount service logic
const mockAccountService = {
  deleteAccount: async (confirmationText: string) => {
    if (confirmationText !== 'DELETE') {
      return { error: new Error('Invalid confirmation text') }
    }
    
    const response = await supabase.functions.invoke('delete-account', {
      body: { confirm: true }
    })
    
    if (!response.error) {
      useAuthStore.getState().reset()
    }
    return response
  }
}

vi.mock('@/lib/supabaseConfig', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    }
  }
}))

describe('Account Service Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset Auth Store for tests
    useAuthStore.setState({ user: { id: 'uuid-123' } as any, session: {} as any })
  })

  it('validates confirmation text before calling the edge function', async () => {
    const response = await mockAccountService.deleteAccount('WRONG')
    expect(response.error?.message).toBe('Invalid confirmation text')
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('calls Edge Function successfully and resets auth state', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: null, data: { success: true } } as any)
    
    const response = await mockAccountService.deleteAccount('DELETE')
    
    expect(supabase.functions.invoke).toHaveBeenCalledWith('delete-account', {
      body: { confirm: true }
    })
    expect(response.error).toBeNull()
    
    // Asserts successful logout behavior
    const authState = useAuthStore.getState()
    expect(authState.user).toBeNull()
    expect(authState.session).toBeNull()
  })

  it('handles Edge Function failures without logging out', async () => {
    vi.mocked(supabase.functions.invoke).mockResolvedValue({ error: { message: 'Server error' }, data: null } as any)
    
    const response = await mockAccountService.deleteAccount('DELETE')
    
    expect(response.error?.message).toBe('Server error')
    
    // Asserts auth state remains untouched
    const authState = useAuthStore.getState()
    expect(authState.user).not.toBeNull()
  })
})
