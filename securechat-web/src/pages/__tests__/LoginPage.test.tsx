import { render, screen, userEvent } from '@/test/render'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage } from '../LoginPage'
import * as useAuthHook from '@/hooks/useAuth'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: vi.fn()
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('LoginPage Component Tests', () => {
  const mockSignIn = vi.fn()
  const mockSignUp = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthHook.useAuth).mockReturnValue({
      signIn: mockSignIn,
      signUp: mockSignUp,
      signOut: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn()
    } as any)
  })

  it('renders login page correctly by default', () => {
    render(<LoginPage />)

    expect(screen.getByRole('heading', { name: /SecureChat AI/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/you@example.com/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Min 6 characters/i)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /^Sign In$/i }).length).toBeGreaterThanOrEqual(1)
  })

  it('toggles to register mode and validates form', async () => {
    const user = userEvent.setup()
    render(<LoginPage />)

    const signUpTab = screen.getByRole('button', { name: /^Sign Up$/i })
    await user.click(signUpTab)

    expect(screen.getByPlaceholderText(/How others will see you/i)).toBeInTheDocument()

    const createBtn = screen.getByRole('button', { name: /^Create Account$/i })
    expect(createBtn).toBeInTheDocument()

    await user.click(createBtn)
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('handles successful login flow', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'test@example.com')
    await user.type(screen.getByPlaceholderText(/Min 6 characters/i), 'password123')

    await user.click(screen.getAllByRole('button', { name: /^Sign In$/i })[1])

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
  })

  it('handles login error states gracefully', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const user = userEvent.setup()
    render(<LoginPage />)

    await user.type(screen.getByPlaceholderText(/you@example.com/i), 'wrong@example.com')
    await user.type(screen.getByPlaceholderText(/Min 6 characters/i), 'wrongpass')

    await user.click(screen.getAllByRole('button', { name: /^Sign In$/i })[1])

    expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument()
  })
})
