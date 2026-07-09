import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../authStore'

describe('authStore Unit Tests', () => {
  beforeEach(() => {
    // Reset store before each test
    const store = useAuthStore.getState()
    store.reset()
  })

  it('should initialize with correct default state', () => {
    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.loading).toBe(false) // after reset it's false, but initially it was true
    expect(state.initialized).toBe(true)
  })

  it('should manage login state correctly', () => {
    const { setUser, setSession, setInitialized } = useAuthStore.getState()

    const mockUser = {
      id: 'uuid-123',
      auth_id: 'uuid-123',
      unique_id: 111111,
      email: 'test@test.com',
      display_name: 'Test',
      message_quota: 100,
      premium_tier: 'basic'
    }

    const mockSession = { access_token: 'token', refresh_token: 'rtoken' } as any

    setUser(mockUser)
    setSession(mockSession)
    setInitialized(true)

    const state = useAuthStore.getState()
    expect(state.user).toEqual(mockUser)
    expect(state.session).toEqual(mockSession)
    expect(state.initialized).toBe(true)
  })

  it('should handle logout state reset correctly', () => {
    const { setUser, setSession, reset } = useAuthStore.getState()
    
    setUser({ id: 'uuid-123' } as any)
    setSession({ access_token: 'token' } as any)
    
    reset()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.session).toBeNull()
    expect(state.loading).toBe(false)
    expect(state.initialized).toBe(true)
  })

  it('should handle authentication loading/error state', () => {
    const { setLoading } = useAuthStore.getState()
    
    setLoading(true)
    expect(useAuthStore.getState().loading).toBe(true)
    
    setLoading(false)
    expect(useAuthStore.getState().loading).toBe(false)
  })
})
