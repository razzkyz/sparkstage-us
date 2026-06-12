import { beforeEach, describe, expect, it, vi } from 'vitest'

let capturedHandler: ((req: Request) => Promise<Response>) | null = null

const createServiceClient = vi.fn()
const handleCors = vi.fn(() => null)
const getCorsHeaders = vi.fn(() => ({}))
const jsonErrorWithDetails = vi.fn((_req: Request, status: number, payload: unknown) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  }))
const verifyDokuSignature = vi.fn()
const mapDokuStatus = vi.fn()
const processProductOrderTransition = vi.fn()
const processTicketOrderTransition = vi.fn()
const logWebhookEvent = vi.fn()

vi.mock('../_shared/deps.ts', () => ({
  serve: (handler: (req: Request) => Promise<Response>) => {
    capturedHandler = handler
  },
}))

vi.mock('../_shared/http.ts', () => ({
  getCorsHeaders: (...args: unknown[]) => getCorsHeaders(...args),
  handleCors: (...args: unknown[]) => handleCors(...args),
  jsonErrorWithDetails: (...args: unknown[]) => jsonErrorWithDetails(...args),
}))

vi.mock('../_shared/env.ts', () => ({
  getDokuEnv: () => ({
    clientId: 'client-id',
    secretKey: 'secret-key',
    isProduction: true,
  }),
  getSupabaseEnv: () => ({
    url: 'https://example.supabase.co',
    supabaseUrl: 'https://example.supabase.co',
    serviceRoleKey: 'service-role',
  }),
}))

vi.mock('../_shared/supabase.ts', () => ({
  createServiceClient: (...args: unknown[]) => createServiceClient(...args),
}))

vi.mock('../_shared/doku.ts', () => ({
  mapDokuStatus: (...args: unknown[]) => mapDokuStatus(...args),
  verifyDokuSignature: (...args: unknown[]) => verifyDokuSignature(...args),
}))

vi.mock('../_shared/payment-processors.ts', () => ({
  processProductOrderTransition: (...args: unknown[]) => processProductOrderTransition(...args),
  processTicketOrderTransition: (...args: unknown[]) => processTicketOrderTransition(...args),
}))

vi.mock('../_shared/payment-effects.ts', () => ({
  logWebhookEvent: (...args: unknown[]) => logWebhookEvent(...args),
}))

function createSupabaseWebhookClient(state: {
  existingWebhook?: unknown[]
  productOrder?: Record<string, unknown> | null
  ticketOrder?: Record<string, unknown> | null
}) {
  return {
    from(table: string) {
      const filters = new Map<string, unknown>()

      const chain = {
        select() {
          return chain
        },
        eq(column: string, value: unknown) {
          filters.set(column, value)
          return chain
        },
        async single() {
          if (table === 'order_products') {
            return {
              data: filters.get('order_number') === state.productOrder?.order_number ? state.productOrder : null,
              error: null,
            }
          }

          if (table === 'orders') {
            return {
              data: filters.get('order_number') === state.ticketOrder?.order_number ? state.ticketOrder : null,
              error: state.ticketOrder ? null : { message: 'Order not found' },
            }
          }

          return { data: null, error: null }
        },
        async limit() {
          if (table === 'webhook_logs') {
            return {
              data: state.existingWebhook ?? [],
              error: null,
            }
          }

          return { data: [], error: null }
        },
      }

      return chain
    },
  }
}

async function loadHandler() {
  capturedHandler = null
  await vi.resetModules()
  await import('./index.ts')
  if (!capturedHandler) {
    throw new Error('doku-webhook handler was not captured')
  }
  return capturedHandler
}

async function readJson(response: Response) {
  return response.json() as Promise<Record<string, unknown>>
}

describe('doku-webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    verifyDokuSignature.mockResolvedValue(true)
    mapDokuStatus.mockReturnValue('paid')
    processProductOrderTransition.mockResolvedValue({
      order: null,
      updateError: null,
      effectError: null,
      applied: true,
      skippedReason: null,
    })
    processTicketOrderTransition.mockResolvedValue({
      order: null,
      updateError: null,
      effectError: null,
      applied: true,
      skippedReason: null,
    })
  })

  it('returns idempotent ok when the same successful webhook status was already logged', async () => {
    createServiceClient.mockReturnValue(
      createSupabaseWebhookClient({
        existingWebhook: [{ id: 1 }],
      })
    )

    const handler = await loadHandler()
    const response = await handler(
      new Request('https://example.supabase.co/functions/v1/doku-webhook', {
        method: 'POST',
        headers: {
          'Client-Id': 'client-id',
          'Request-Id': 'req-1',
          'Request-Timestamp': '2026-04-25T12:00:00Z',
          Signature: 'valid-signature',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: {
            invoice_number: 'ORD-1',
            status: 'ORDER_PAID',
          },
          transaction: {
            status: 'SUCCESS',
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(await readJson(response)).toEqual({ status: 'ok', idempotent: true })
    expect(processProductOrderTransition).not.toHaveBeenCalled()
    expect(processTicketOrderTransition).not.toHaveBeenCalled()
  })

  it('routes product orders through the product processor and logs both processing events', async () => {
    createServiceClient.mockReturnValue(
      createSupabaseWebhookClient({
        existingWebhook: [],
        productOrder: {
          id: 44,
          user_id: 'user-44',
          order_number: 'PROD-44',
          status: 'awaiting_payment',
          payment_status: 'pending',
          pickup_code: null,
          pickup_status: null,
          pickup_expires_at: null,
          total: 1000,
          stock_released_at: null,
          voucher_id: null,
          voucher_code: null,
          discount_amount: 0,
        },
      })
    )

    const handler = await loadHandler()
    const response = await handler(
      new Request('https://example.supabase.co/functions/v1/doku-webhook', {
        method: 'POST',
        headers: {
          'Client-Id': 'client-id',
          'Request-Id': 'req-2',
          'Request-Timestamp': '2026-04-25T12:00:00Z',
          Signature: 'valid-signature',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: {
            invoice_number: 'PROD-44',
            amount: 1000,
            status: 'ORDER_PAID',
          },
          transaction: {
            status: 'SUCCESS',
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(processProductOrderTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        nextStatus: 'paid',
        grossAmount: 1000,
        order: expect.objectContaining({
          order_number: 'PROD-44',
        }),
      })
    )
    expect(logWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderNumber: 'PROD-44',
        eventType: 'product_order_processed',
        success: true,
      })
    )
    expect(logWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderNumber: 'PROD-44',
        eventType: 'doku_status:paid',
        success: true,
      })
    )
  })

  it('logs safe diagnostics when signature verification fails', async () => {
    verifyDokuSignature.mockResolvedValue(false)
    createServiceClient.mockReturnValue(createSupabaseWebhookClient({}))

    const handler = await loadHandler()
    const response = await handler(
      new Request('https://example.supabase.co/functions/v1/doku-webhook', {
        method: 'POST',
        headers: {
          'Client-Id': 'client-id',
          'Request-Id': 'qris-req-1',
          'Request-Timestamp': '2026-04-25T12:00:00Z',
          Signature: 'HMACSHA256=bad-signature-value',
          'Content-Type': 'application/json',
          Host: 'example.supabase.co',
          'X-Forwarded-Host': 'payments.example.com',
          'X-Forwarded-Proto': 'https',
        },
        body: JSON.stringify({
          order: {
            invoice_number: 'QRIS-1',
            status: 'ORDER_PAID',
          },
          channel: {
            id: 'QRIS_DOKU',
          },
          service: {
            id: 'QRIS',
          },
          transaction: {
            status: 'SUCCESS',
          },
        }),
      })
    )

    expect(response.status).toBe(403)
    expect(await readJson(response)).toEqual({ error: 'Invalid signature' })
    expect(processProductOrderTransition).not.toHaveBeenCalled()
    expect(processTicketOrderTransition).not.toHaveBeenCalled()

    expect(logWebhookEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        orderNumber: 'QRIS-1',
        eventType: 'invalid_signature',
        success: false,
        payload: expect.objectContaining({
          notification: expect.objectContaining({
            order: expect.objectContaining({
              invoice_number: 'QRIS-1',
            }),
          }),
          diagnostics: expect.objectContaining({
            reason: 'signature_mismatch',
            actual_request_pathname: '/functions/v1/doku-webhook',
            candidate_request_targets: expect.arrayContaining([
              {
                source: 'actual_request_pathname',
                requestTarget: '/functions/v1/doku-webhook',
              },
              {
                source: 'supabase_function_slug_path',
                requestTarget: '/doku-webhook',
              },
            ]),
            headers: expect.objectContaining({
              client_id: 'clie...t-id',
              request_id: 'qris-req-1',
              request_timestamp: '2026-04-25T12:00:00Z',
              signature_present: true,
              signature_scheme: 'HMACSHA256',
              signature_length: 'HMACSHA256=bad-signature-value'.length,
              host: 'example.supabase.co',
              forwarded_host: 'payments.example.com',
              forwarded_proto: 'https',
            }),
            doku: expect.objectContaining({
              invoice_number: 'QRIS-1',
              order_status: 'ORDER_PAID',
              transaction_status: 'SUCCESS',
              payment_channel: 'QRIS_DOKU',
              service_id: 'QRIS',
            }),
          }),
        }),
      })
    )
    const invalidSignatureLog = logWebhookEvent.mock.calls.find(
      ([, event]) => (event as { eventType?: string }).eventType === 'invalid_signature'
    )?.[1] as { payload?: { diagnostics?: { headers?: Record<string, unknown> } } }
    expect(invalidSignatureLog.payload?.diagnostics?.headers).not.toHaveProperty('signature')
  })

  it('accepts a valid signature against the Supabase function slug request target candidate', async () => {
    verifyDokuSignature.mockImplementation(async (params: { requestTarget?: string }) =>
      params.requestTarget === '/doku-webhook'
    )
    createServiceClient.mockReturnValue(
      createSupabaseWebhookClient({
        existingWebhook: [],
        productOrder: {
          id: 45,
          user_id: 'user-45',
          order_number: 'QRIS-45',
          status: 'awaiting_payment',
          payment_status: 'pending',
          pickup_code: null,
          pickup_status: null,
          pickup_expires_at: null,
          total: 1500,
          stock_released_at: null,
          voucher_id: null,
          voucher_code: null,
          discount_amount: 0,
        },
      })
    )

    const handler = await loadHandler()
    const response = await handler(
      new Request('https://example.supabase.co/functions/v1/doku-webhook', {
        method: 'POST',
        headers: {
          'Client-Id': 'client-id',
          'Request-Id': 'qris-req-2',
          'Request-Timestamp': '2026-04-25T12:00:00Z',
          Signature: 'valid-signature-for-slug-path',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order: {
            invoice_number: 'QRIS-45',
            amount: 1500,
            status: 'ORDER_PAID',
          },
          payment: {
            channel: 'QRIS',
          },
          transaction: {
            status: 'SUCCESS',
          },
        }),
      })
    )

    expect(response.status).toBe(200)
    expect(verifyDokuSignature).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        requestTarget: '/functions/v1/doku-webhook',
      })
    )
    expect(verifyDokuSignature).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        requestTarget: '/doku-webhook',
      })
    )
    expect(logWebhookEvent).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventType: 'invalid_signature',
      })
    )
    expect(processProductOrderTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        nextStatus: 'paid',
        grossAmount: 1500,
        order: expect.objectContaining({
          order_number: 'QRIS-45',
        }),
      })
    )
  })
})
