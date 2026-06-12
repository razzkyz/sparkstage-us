import { serve } from '../_shared/deps.ts'
import { handleCors, json, jsonError, jsonErrorWithDetails } from '../_shared/http.ts'
import { getDokuEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import {
  buildDokuRequestHeaders,
  createDokuRequestId,
  createDokuRequestTimestamp,
  getDokuApiBaseUrl,
  getDokuStatusPath,
  mapDokuStatus,
} from '../_shared/doku.ts'
import { logWebhookEvent } from '../_shared/payment-effects.ts'
import { processProductOrderTransition } from '../_shared/payment-processors.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

/**
 * sync-doku-product-status
 *
 * Active sync for product orders (BOPIS - Buy Online Pick Up In Store).
 * This function directly queries DOKU API to get real-time payment status,
 * instead of waiting passively for webhook.
 *
 * Similar to sync-doku-ticket-status but for order_products table.
 * Critical: Generates pickup_code when status changes to paid.
 */

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  try {
    const authResult = await requireAuthenticatedRequest(req)
    if (authResult.response) return authResult.response

    const auth = authResult.context!
    const dokuEnv = getDokuEnv()

    // Use service role key for database operations
    const supabase = createServiceClient(auth.supabaseEnv.url, auth.supabaseEnv.serviceRoleKey)

    const body = await req.json().catch(() => ({}))
    const orderNumber = String(body?.order_number || '')
    if (!orderNumber) {
      return jsonError(req, 400, 'Missing order_number')
    }

    // 2. Fetch order from order_products table
    const { data: order, error: orderError } = await supabase
      .from('order_products')
      .select('id, user_id, order_number, status, payment_status, payment_expired_at, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) {
      return jsonError(req, 404, 'Order not found')
    }

    // Security: Only order owner can sync
    if (order.user_id !== auth.user.id) {
      return jsonError(req, 403, 'Forbidden')
    }

    const dokuRequestId = createDokuRequestId()
    const dokuRequestTimestamp = createDokuRequestTimestamp()
    const requestTarget = getDokuStatusPath(orderNumber)
    const statusResponse = await fetch(`${getDokuApiBaseUrl(dokuEnv.isProduction)}${requestTarget}`, {
      method: 'GET',
      headers: {
        ...await buildDokuRequestHeaders({
          clientId: dokuEnv.clientId,
          requestId: dokuRequestId,
          requestTimestamp: dokuRequestTimestamp,
          requestTarget,
          secretKey: dokuEnv.secretKey,
        }),
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })

    const statusData = await statusResponse.json().catch(() => null)
    if (!statusResponse.ok) {
      const orderExpiredLocally = Boolean(order.payment_expired_at && new Date(order.payment_expired_at) <= new Date())
      if (!(statusResponse.status === 404 && orderExpiredLocally)) {
        console.error('[sync-doku-product-status] DOKU status error:', statusData)
        return jsonErrorWithDetails(req, 502, {
          error: 'Failed to fetch DOKU status',
          code: 'DOKU_STATUS_FETCH_FAILED',
          details: statusData,
        })
      }
    }

    const providerStatus =
      statusResponse.ok
        ? mapDokuStatus(
            (statusData as { transaction?: { status?: unknown } | null })?.transaction?.status,
            (statusData as { order?: { status?: unknown } | null })?.order?.status
          )
        : 'expired'
    const nowIso = new Date().toISOString()

    const result = await processProductOrderTransition({
      supabase,
      order: order as {
        id: number
        user_id?: string | null
        order_number: string
        status?: string | null
        payment_status?: string | null
        pickup_code?: string | null
        pickup_status?: string | null
        pickup_expires_at?: string | null
        total?: unknown
        stock_released_at?: string | null
        voucher_id?: string | null
        voucher_code?: string | null
        discount_amount?: unknown
      },
      nextStatus: providerStatus,
      paymentData: statusData,
      grossAmount: (statusData as { order?: { amount?: unknown } | null })?.order?.amount,
      nowIso,
      shouldSetPaidAt: true,
    })

    await logWebhookEvent(supabase, {
      orderNumber,
      eventType: 'product_sync_processed',
      payload: {
        next_status: providerStatus,
        applied: result.applied,
        skipped_reason: result.skippedReason,
      },
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    if (result.updateError || result.effectError) {
      console.error('[sync-doku-product-status] Failed to apply transition:', {
        updateError: result.updateError,
        effectError: result.effectError,
      })
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to sync product payment status',
        code: 'PRODUCT_STATUS_SYNC_FAILED',
        details: result.updateError ?? result.effectError,
      })
    }

    return json(req, { status: 'ok', order: result.order })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
