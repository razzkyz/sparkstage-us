import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { ProductOrderTransitionOrder } from './payment-processors.ts'
import { processProductOrderTransition, processTicketOrderTransition } from './payment-processors.ts'
import {
  ensureProductPaidSideEffects,
  ensureVoucherUsageIfNeeded,
  issueTicketsIfNeeded,
  logWebhookEvent,
  releaseProductReservedStockIfNeeded,
  releaseTicketCapacityIfNeeded,
  releaseVoucherQuotaIfNeeded,
} from './payment-effects.ts'

vi.mock('./payment-effects.ts', () => ({
  ensureProductPaidSideEffects: vi.fn(),
  ensureVoucherUsageIfNeeded: vi.fn(),
  issueTicketsIfNeeded: vi.fn(),
  logWebhookEvent: vi.fn(),
  releaseProductReservedStockIfNeeded: vi.fn(),
  releaseTicketCapacityIfNeeded: vi.fn(),
  releaseVoucherQuotaIfNeeded: vi.fn(),
}))

type Row = Record<string, unknown> & { id: number }

function createChain(table: string, state: Record<string, Row | null>) {
  let mode: 'select' | 'update' = 'select'
  let selectedColumns = ''
  let updateFields: Record<string, unknown> | null = null
  const filters = new Map<string, unknown>()

  const chain = {
    update(fields: Record<string, unknown>) {
      mode = 'update'
      updateFields = fields
      return chain
    },
    select(columns: string) {
      selectedColumns = columns
      return chain
    },
    eq(column: string, value: unknown) {
      filters.set(column, value)
      return chain
    },
    not() {
      return chain
    },
    async maybeSingle() {
      return resolveQuery()
    },
    async single() {
      return resolveQuery()
    },
  }

  function resolveRow() {
    const row = state[table]
    if (!row) {
      return null
    }

    const idFilter = filters.get('id')
    if (typeof idFilter !== 'undefined' && row.id !== idFilter) {
      return null
    }

    return row
  }

  async function resolveQuery() {
    const row = resolveRow()
    if (!row) {
      return { data: null, error: null }
    }

    if (mode === 'select') {
      if (selectedColumns === 'payment_data') {
        return {
          data: {
            payment_data: row.payment_data ?? null,
          },
          error: null,
        }
      }

      return { data: { ...row }, error: null }
    }

    Object.assign(row, updateFields ?? {})
    return { data: { ...row }, error: null }
  }

  return chain
}

function createSupabaseMock(state: {
  order?: Row | null
  productOrder?: Row | null
}) {
  const tables: Record<string, Row | null> = {
    orders: state.order ?? null,
    order_products: state.productOrder ?? null,
  }

  return {
    from(table: string) {
      return createChain(table, tables)
    },
  }
}

describe('payment-processors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('blocks ticket replay from paid back to pending', async () => {
    const supabase = createSupabaseMock({
      order: {
        id: 10,
        order_number: 'TICKET-1',
        status: 'paid',
        tickets_issued_at: '2026-04-25T10:00:00.000Z',
      },
    })

    const result = await processTicketOrderTransition({
      supabase: supabase as never,
      order: {
        id: 10,
        order_number: 'TICKET-1',
        status: 'paid',
        user_id: 'user-1',
        tickets_issued_at: '2026-04-25T10:00:00.000Z',
      },
      nextStatus: 'pending',
      paymentData: { source: 'webhook_retry' },
      nowIso: '2026-04-25T11:00:00.000Z',
      orderItems: [],
    })

    expect(result.applied).toBe(false)
    expect(result.skippedReason).toBe('blocked_pending_after_paid')
    expect(issueTicketsIfNeeded).not.toHaveBeenCalled()
    expect(releaseTicketCapacityIfNeeded).not.toHaveBeenCalled()
  })

  it('applies ticket paid status after a local expiry and issues tickets', async () => {
    const supabase = createSupabaseMock({
      order: {
        id: 11,
        order_number: 'TICKET-EXPIRED',
        status: 'expired',
        user_id: 'user-11',
        tickets_issued_at: null,
        capacity_released_at: '2026-04-25T10:30:00.000Z',
      },
    })

    const result = await processTicketOrderTransition({
      supabase: supabase as never,
      order: {
        id: 11,
        order_number: 'TICKET-EXPIRED',
        status: 'expired',
        user_id: 'user-11',
        tickets_issued_at: null,
        capacity_released_at: '2026-04-25T10:30:00.000Z',
      },
      nextStatus: 'paid',
      paymentData: {
        source: 'provider_notification',
        order: { status: 'ORDER_PAID' },
        transaction: { status: 'SUCCESS' },
      },
      nowIso: '2026-04-25T11:00:00.000Z',
      orderItems: [
        {
          id: 100,
          ticket_id: 3,
          selected_date: '2026-05-01',
          selected_time_slots: ['10:00'],
          quantity: 1,
        },
      ],
    })

    expect(result.applied).toBe(true)
    expect(result.skippedReason).toBeNull()
    expect(result.order).toMatchObject({ status: 'paid' })
    expect(issueTicketsIfNeeded).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          id: 11,
          status: 'paid',
        }),
      })
    )
    expect(releaseTicketCapacityIfNeeded).not.toHaveBeenCalled()
  })

  it('blocks product replay from paid to expired', async () => {
    const paidOrder: ProductOrderTransitionOrder = {
      id: 22,
      user_id: 'user-22',
      order_number: 'PROD-1',
      status: 'processing',
      payment_status: 'paid',
      pickup_code: 'PU-1',
      pickup_status: 'pending_pickup',
      pickup_expires_at: null,
      paid_at: '2026-04-25T10:00:00.000Z',
      total: 1000,
      stock_released_at: null,
      voucher_id: null,
      voucher_code: null,
      discount_amount: 0,
      payment_data: { provider_status: 'paid' },
    }

    const supabase = createSupabaseMock({
      productOrder: { ...paidOrder },
    })

    const result = await processProductOrderTransition({
      supabase: supabase as never,
      order: paidOrder,
      nextStatus: 'expired',
      paymentData: { source: 'delayed_webhook' },
      nowIso: '2026-04-25T11:00:00.000Z',
      grossAmount: 1000,
    })

    expect(result.applied).toBe(false)
    expect(result.skippedReason).toBe('blocked_expired_after_paid')
    expect(ensureProductPaidSideEffects).not.toHaveBeenCalled()
    expect(releaseProductReservedStockIfNeeded).not.toHaveBeenCalled()
    expect(releaseVoucherQuotaIfNeeded).not.toHaveBeenCalled()
  })

  it('applies product paid status after a local expiry and repairs paid artifacts', async () => {
    const expiredOrder: ProductOrderTransitionOrder = {
      id: 23,
      user_id: 'user-23',
      order_number: 'PROD-EXPIRED',
      status: 'expired',
      payment_status: 'failed',
      pickup_code: null,
      pickup_status: null,
      pickup_expires_at: null,
      paid_at: null,
      total: 1000,
      stock_released_at: '2026-04-25T10:30:00.000Z',
      voucher_id: null,
      voucher_code: null,
      discount_amount: 0,
      payment_data: { provider_status: 'expired' },
    }

    const supabase = createSupabaseMock({
      productOrder: { ...expiredOrder },
    })

    const result = await processProductOrderTransition({
      supabase: supabase as never,
      order: expiredOrder,
      nextStatus: 'paid',
      paymentData: {
        source: 'reconcile_status_check',
        order: { status: 'ORDER_PAID', amount: 1000 },
        transaction: { status: 'SUCCESS' },
      },
      nowIso: '2026-04-25T11:00:00.000Z',
      grossAmount: 1000,
    })

    expect(result.applied).toBe(true)
    expect(result.skippedReason).toBeNull()
    expect(result.order).toMatchObject({
      status: 'processing',
      payment_status: 'paid',
    })
    expect(ensureProductPaidSideEffects).toHaveBeenCalledWith(
      expect.objectContaining({
        order: expect.objectContaining({
          id: 23,
          status: 'processing',
          payment_status: 'paid',
        }),
        defaultStatus: 'processing',
      })
    )
    expect(releaseProductReservedStockIfNeeded).not.toHaveBeenCalled()
    expect(releaseVoucherQuotaIfNeeded).not.toHaveBeenCalled()
  })

  it('marks product order for review when paid side effects fail', async () => {
    vi.mocked(ensureProductPaidSideEffects).mockRejectedValueOnce(new Error('pickup generation failed'))

    const unpaidOrder: ProductOrderTransitionOrder = {
      id: 33,
      user_id: 'user-33',
      order_number: 'PROD-2',
      status: 'awaiting_payment',
      payment_status: 'pending',
      pickup_code: null,
      pickup_status: null,
      pickup_expires_at: null,
      paid_at: null,
      total: 1000,
      stock_released_at: null,
      voucher_id: 'voucher-1',
      voucher_code: 'DISC10',
      discount_amount: 100,
      payment_data: { provider_status: 'pending' },
    }

    const statefulOrder = { ...unpaidOrder }
    const supabase = createSupabaseMock({
      productOrder: statefulOrder,
    })

    const result = await processProductOrderTransition({
      supabase: supabase as never,
      order: unpaidOrder,
      nextStatus: 'paid',
      paymentData: {
        source: 'provider_notification',
        order: { status: 'ORDER_PAID' },
        transaction: { status: 'SUCCESS' },
      },
      nowIso: '2026-04-25T12:00:00.000Z',
      grossAmount: 1000,
      shouldSetPaidAt: true,
    })

    expect(result.applied).toBe(true)
    expect(result.effectError).toBe('pickup generation failed')
    expect(result.order).toMatchObject({
      status: 'requires_review',
      pickup_status: 'pending_review',
      payment_status: 'paid',
    })
    expect(logWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderNumber: 'PROD-2',
        eventType: 'product_side_effect_failed',
        success: false,
      })
    )
    expect(ensureVoucherUsageIfNeeded).not.toHaveBeenCalled()
  })
})
