import { describe, expect, it } from 'vitest'
import { getOrderStatusPresentation, mapPaymentStatus } from './paymentStatus'

describe('mapPaymentStatus', () => {
  it('maps settlement to paid', () => {
    expect(mapPaymentStatus('settlement', 'accept')).toBe('paid')
  })

  it('maps capture + accept to paid', () => {
    expect(mapPaymentStatus('capture', 'accept')).toBe('paid')
  })

  it('maps capture + challenge to pending', () => {
    expect(mapPaymentStatus('capture', 'challenge')).toBe('pending')
  })

  it('maps pending to pending', () => {
    expect(mapPaymentStatus('pending', null)).toBe('pending')
  })

  it('maps deny/cancel/failure to failed', () => {
    expect(mapPaymentStatus('deny', null)).toBe('failed')
    expect(mapPaymentStatus('cancel', null)).toBe('failed')
    expect(mapPaymentStatus('failure', null)).toBe('failed')
  })

  it('maps expire to expired', () => {
    expect(mapPaymentStatus('expire', null)).toBe('expired')
  })

  it('maps refund variants to refunded', () => {
    expect(mapPaymentStatus('refund', null)).toBe('refunded')
    expect(mapPaymentStatus('partial_refund', null)).toBe('refunded')
  })
})

describe('getOrderStatusPresentation', () => {
  it('returns pending presentation', () => {
    const p = getOrderStatusPresentation('pending')
    expect(p.icon).toBe('schedule')
    expect(p.title).toBe('Payment Pending')
  })

  it('defaults to thank you for unknown', () => {
    const p = getOrderStatusPresentation('unknown')
    expect(p.title).toBe('Thank You!')
  })
})
