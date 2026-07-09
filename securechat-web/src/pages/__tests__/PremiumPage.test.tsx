import { render, screen, userEvent } from '@/test/render'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PremiumPage } from '../PremiumPage'

const mockRazorpayOpen = vi.fn()
const MockRazorpay = vi.fn().mockImplementation(() => ({
  open: mockRazorpayOpen,
  on: vi.fn(),
  close: vi.fn()
}))

Object.defineProperty(window, 'Razorpay', {
  writable: true,
  value: MockRazorpay
})

describe('PremiumPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all premium plans correctly', () => {
    render(<PremiumPage />)

    expect(screen.getByRole('heading', { name: /^Basic$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Standard$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Premium$/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /^Enterprise$/i })).toBeInTheDocument()
  })

  it('simulates plan selection and opens Razorpay modal', async () => {
    const user = userEvent.setup()
    render(<PremiumPage />)

    const premiumButton = screen.getByRole('button', { name: /Choose Premium/i })
    await user.click(premiumButton)
  })
})
