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
import { processTicketOrderTransition } from '../_shared/payment-processors.ts'
import { requireAuthenticatedRequest } from '../_shared/auth.ts'

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

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, expires_at, tickets_issued_at, capacity_released_at')
      .eq('order_number', orderNumber)
      .single()

    if (orderError || !order) {
      return jsonError(req, 404, 'Order not found')
    }

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
      const orderExpiredLocally = Boolean(order.expires_at && new Date(order.expires_at) <= new Date())
      if (!(statusResponse.status === 404 && orderExpiredLocally)) {
        console.error('[sync-doku-ticket-status] DOKU status error:', statusData)
        return jsonErrorWithDetails(req, 502, {
          error: 'Failed to fetch DOKU status',
          code: 'DOKU_STATUS_FETCH_FAILED',
          details: statusData,
        })
      }
    }

    const newStatus =
      statusResponse.ok
        ? mapDokuStatus(
            (statusData as { transaction?: { status?: unknown } | null })?.transaction?.status,
            (statusData as { order?: { status?: unknown } | null })?.order?.status
          )
        : 'expired'
    const nowIso = new Date().toISOString()

    const result = await processTicketOrderTransition({
      supabase,
      order: order as {
        id: number
        order_number: string
        user_id: string | null
        status?: string | null
        tickets_issued_at?: string | null
        capacity_released_at?: string | null
      },
      nextStatus: newStatus,
      paymentData: statusData,
      nowIso,
    })

    await logWebhookEvent(supabase, {
      orderNumber,
      eventType: 'ticket_sync_processed',
      payload: {
        next_status: newStatus,
        applied: result.applied,
        skipped_reason: result.skippedReason,
      },
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    if (result.updateError || result.effectError) {
      console.error('[sync-doku-ticket-status] Failed to apply transition:', {
        updateError: result.updateError,
        effectError: result.effectError,
      })
      return jsonErrorWithDetails(req, 500, {
        error: 'Failed to sync ticket payment status',
        code: 'TICKET_STATUS_SYNC_FAILED',
        details: result.updateError ?? result.effectError,
      })
    }

    return json(req, { status: 'ok', order: result.order })
  } catch {
    return jsonError(req, 500, 'Internal server error')
  }
})
