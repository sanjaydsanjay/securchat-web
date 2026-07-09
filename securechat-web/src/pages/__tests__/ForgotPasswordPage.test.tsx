import { render, screen, userEvent } from '@/test/render'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ForgotPasswordPage } from '../ForgotPasswordPage'

const mockForgotPassword = vi.fn()

vi.mock('@/services/authService', () => ({
  authService: {
    forgotPassword: (...args: unknown[]) => mockForgotPassword(...args),
  }
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

describe('ForgotPasswordPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders forgot password page correctly', () => {
    render(<ForgotPasswordPage />)
    expect(screen.getByRole('heading', { name: /Reset Password/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/Email address/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Send Reset Link$/i })).toBeInTheDocument()
  })

  it('validates empty email submission', async () => {
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.click(screen.getByRole('button', { name: /^Send Reset Link$/i }))

    expect(mockForgotPassword).not.toHaveBeenCalled()
  })

  it('handles successful password reset request', async () => {
    mockForgotPassword.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(screen.getByPlaceholderText(/Email address/i), 'test@example.com')
    await user.click(screen.getByRole('button', { name: /^Send Reset Link$/i }))

    expect(mockForgotPassword).toHaveBeenCalledWith('test@example.com')
    expect(screen.getByText(/Check your email/i)).toBeInTheDocument()
  })

  it('displays error from auth service', async () => {
    mockForgotPassword.mockResolvedValue({ error: { message: 'User not found' } })
    const user = userEvent.setup()
    render(<ForgotPasswordPage />)

    await user.type(screen.getByPlaceholderText(/Email address/i), 'nobody@example.com')
    await user.click(screen.getByRole('button', { name: /^Send Reset Link$/i }))

    expect(screen.getByText(/User not found/i)).toBeInTheDocument()
  })
})
