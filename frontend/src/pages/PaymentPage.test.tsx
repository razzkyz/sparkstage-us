import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import PaymentPage from './PaymentPage'
import { useAuth } from '../contexts/AuthContext'
import { hasBookingState, restoreBookingState, clearBookingState, preserveBookingState } from '../utils/bookingStateManager'
import { createCheckoutPayment, validatePaymentSession } from './payment/paymentDoku'
import { loadDokuCheckoutScript, openDokuCheckout } from '../utils/dokuCheckout'

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../utils/bookingStateManager', () => ({
  hasBookingState: vi.fn(),
  restoreBookingState: vi.fn(),
  clearBookingState: vi.fn(),
  preserveBookingState: vi.fn(),
}))

vi.mock('./payment/paymentDoku', () => ({
  createCheckoutPayment: vi.fn(),
  validatePaymentSession: vi.fn(),
}))

vi.mock('../utils/dokuCheckout', () => ({
  loadDokuCheckoutScript: vi.fn().mockResolvedValue(undefined),
  openDokuCheckout: vi.fn(),
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: vi.fn(),
  }
})

describe('PaymentPage', () => {
  const mockUser = { email: 'test@example.com', user_metadata: { name: 'Test User' } }
  const mockBookingState = {
    ticketId: 1,
    ticketName: 'Test Ticket',
    ticketType: 'entrance',
    price: 50000,
    date: '2026-02-01',
    time: '10:00',
    quantity: 1,
    total: 50000,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({ user: mockUser } as never)
    vi.mocked(useLocation).mockReturnValue({
      state: mockBookingState,
      pathname: '/payment',
    } as never)
    vi.mocked(hasBookingState).mockReturnValue(false)
    vi.mocked(validatePaymentSession).mockResolvedValue({
      session: { access_token: 'valid-token' },
      error: null,
    } as never)
    vi.mocked(createCheckoutPayment).mockResolvedValue({
      payment_provider: 'doku_checkout',
      payment_url: 'https://sandbox.doku.com/pay/ORD-123',
      payment_sdk_url: 'https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js',
      payment_due_date: '2026-02-01T10:20:00Z',
      order_number: 'ORD-123',
      order_id: 123,
    } as never)
  })

  it('loads the DOKU checkout script on mount', async () => {
    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>
    )

    await waitFor(() => expect(loadDokuCheckoutScript).toHaveBeenCalled())
  })

  it('restores state if location.state is missing but backup exists', async () => {
    vi.mocked(useLocation).mockReturnValue({
      state: null,
      pathname: '/payment',
    } as never)
    vi.mocked(hasBookingState).mockReturnValue(true)
    vi.mocked(restoreBookingState).mockReturnValue(mockBookingState as never)

    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/payment', {
        state: mockBookingState,
        replace: true,
      })
    })
  })

  it('opens DOKU checkout and navigates to pending booking success on success', async () => {
    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>
    )

    const payButton = await screen.findByRole('button', { name: /Pay/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(validatePaymentSession).toHaveBeenCalled()
      expect(createCheckoutPayment).toHaveBeenCalled()
      expect(openDokuCheckout).toHaveBeenCalledWith('https://sandbox.doku.com/pay/ORD-123')
      expect(clearBookingState).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith(
        '/booking-success?order_id=ORD-123&pending=1',
        expect.objectContaining({
          state: expect.objectContaining({
            orderNumber: 'ORD-123',
            orderId: 123,
            isPending: true,
          }),
        })
      )
    })
  })

  it('preserves state and redirects to login when the session is invalid', async () => {
    vi.mocked(validatePaymentSession).mockResolvedValue({
      session: null,
      error: new Error('Session validation failed'),
    } as never)

    render(
      <MemoryRouter>
        <PaymentPage />
      </MemoryRouter>
    )

    const payButton = await screen.findByRole('button', { name: /Pay/i })
    fireEvent.click(payButton)

    await waitFor(() => {
      expect(preserveBookingState).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith(
        '/login',
        expect.objectContaining({
          state: expect.objectContaining({ returnTo: '/payment' }),
        })
      )
    })
  })
})
