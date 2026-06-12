import { serve } from '../_shared/deps.ts'
import { getDokuEnv, getSupabaseEnv } from '../_shared/env.ts'
import { getCorsHeaders, handleCors, json } from '../_shared/http.ts'
import {
  buildDokuRequestHeaders,
  createDokuRequestId,
  createDokuRequestTimestamp,
  getDokuApiBaseUrl,
  getDokuStatusPath,
  mapDokuStatus,
} from '../_shared/doku.ts'
import {
  isFinalOrPaidPaymentStatus,
  processProductOrderTransition,
  processTicketOrderTransition,
} from '../_shared/payment-processors.ts'
import {
  ensureProductPaidSideEffects,
  issueTicketsIfNeeded,
  logWebhookEvent,
  releaseProductReservedStockIfNeeded,
  releaseTicketCapacityIfNeeded,
  type TicketOrderItem,
} from '../_shared/payment-effects.ts'
import { createServiceClient } from '../_shared/supabase.ts'

type TicketOrderRow = {
  id: number
  user_id: string | null
  order_number: string
  status?: string | null
  tickets_issued_at?: string | null
  capacity_released_at?: string | null
}

type ProductOrderRow = {
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
}

type ProviderStatusResult =
  | { ok: true; mappedStatus: string; statusData: unknown }
  | { ok: false; error: string; statusData: unknown; statusCode: number }

function isProviderFailure(result: ProviderStatusResult): result is Extract<ProviderStatusResult, { ok: false }> {
  return result.ok === false
}

async function fetchProviderStatus(params: {
  dokuEnv: ReturnType<typeof getDokuEnv>
  orderNumber: string
}): Promise<ProviderStatusResult> {
  const requestId = createDokuRequestId()
  const requestTimestamp = createDokuRequestTimestamp()
  const requestTarget = getDokuStatusPath(params.orderNumber)
  const statusResponse = await fetch(`${getDokuApiBaseUrl(params.dokuEnv.isProduction)}${requestTarget}`, {
    method: 'GET',
    headers: {
      ...await buildDokuRequestHeaders({
        clientId: params.dokuEnv.clientId,
        requestId,
        requestTimestamp,
        requestTarget,
        secretKey: params.dokuEnv.secretKey,
      }),
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  })

  const statusData = await statusResponse.json().catch(() => null)
  if (!statusResponse.ok) {
    return {
      ok: false,
      error: `Failed to fetch DOKU status (${statusResponse.status})`,
      statusData,
      statusCode: statusResponse.status,
    }
  }

  return {
    ok: true,
    mappedStatus: mapDokuStatus(
      (statusData as { transaction?: { status?: unknown } | null })?.transaction?.status,
      (statusData as { order?: { status?: unknown } | null })?.order?.status
    ),
    statusData,
  }
}

async function reconcileStaleTicketOrder(params: {
  supabase: ReturnType<typeof createServiceClient>
  order: TicketOrderRow
  dokuEnv: ReturnType<typeof getDokuEnv>
  nowIso: string
}) {
  const { supabase, order, dokuEnv, nowIso } = params

  try {
    const providerResult = await fetchProviderStatus({
      dokuEnv,
      orderNumber: order.order_number,
    })

    let nextStatus = 'expired'
    let paymentData: unknown = providerResult.statusData

    if (isProviderFailure(providerResult)) {
      if (providerResult.statusCode !== 404) {
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'reconcile_ticket_status_fetch_failed',
          payload: { error: providerResult.error, response: providerResult.statusData },
          success: false,
          errorMessage: providerResult.error,
          processedAt: nowIso,
        })
        return { checked: 1, finalized: 0 }
      }

      paymentData = {
        source: 'reconcile_fallback',
        reason: 'doku_status_not_found_after_expiry',
        order: { invoice_number: order.order_number, status: 'ORDER_EXPIRED' },
      }
    } else {
      nextStatus = providerResult.mappedStatus
    }

    if (!isFinalOrPaidPaymentStatus(nextStatus)) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_ticket_still_pending',
        payload: { status: nextStatus },
        success: true,
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    const result = await processTicketOrderTransition({
      supabase,
      order,
      nextStatus,
      paymentData,
      nowIso,
    })

    if (result.updateError || !result.order) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_ticket_update_failed',
        payload: { error: result.updateError ?? 'Unknown error', status: nextStatus },
        success: false,
        errorMessage: result.updateError ?? 'Unknown error',
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_ticket_pending_finalized',
      payload: { status: nextStatus, applied: result.applied, skipped_reason: result.skippedReason },
      success: !result.effectError,
      errorMessage: result.effectError,
      processedAt: nowIso,
    })

    return { checked: 1, finalized: 1 }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_ticket_failed',
      payload: { error: message },
      success: false,
      errorMessage: message,
      processedAt: nowIso,
    })
    return { checked: 1, finalized: 0 }
  }
}

async function reconcileStaleProductOrder(params: {
  supabase: ReturnType<typeof createServiceClient>
  order: ProductOrderRow
  dokuEnv: ReturnType<typeof getDokuEnv>
  nowIso: string
}) {
  const { supabase, order, dokuEnv, nowIso } = params

  try {
    const providerResult = await fetchProviderStatus({
      dokuEnv,
      orderNumber: order.order_number,
    })

    let nextStatus = 'expired'
    let paymentData: unknown = providerResult.statusData
    let grossAmount: unknown =
      (providerResult.statusData as { order?: { amount?: unknown } | null })?.order?.amount

    if (isProviderFailure(providerResult)) {
      if (providerResult.statusCode !== 404) {
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'reconcile_product_status_fetch_failed',
          payload: { error: providerResult.error, response: providerResult.statusData },
          success: false,
          errorMessage: providerResult.error,
          processedAt: nowIso,
        })
        return { checked: 1, finalized: 0 }
      }

      paymentData = {
        source: 'reconcile_fallback',
        reason: 'doku_status_not_found_after_expiry',
        order: { invoice_number: order.order_number, status: 'ORDER_EXPIRED' },
      }
      grossAmount = order.total
    } else {
      nextStatus = providerResult.mappedStatus
    }

    if (!isFinalOrPaidPaymentStatus(nextStatus)) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_product_still_pending',
        payload: { status: nextStatus },
        success: true,
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    const result = await processProductOrderTransition({
      supabase,
      order,
      nextStatus,
      paymentData,
      grossAmount,
      nowIso,
      shouldSetPaidAt: true,
    })

    if (result.updateError || !result.order) {
      await logWebhookEvent(supabase, {
        orderNumber: order.order_number,
        eventType: 'reconcile_product_update_failed',
        payload: { error: result.updateError ?? 'Unknown error', status: nextStatus },
        success: false,
        errorMessage: result.updateError ?? 'Unknown error',
        processedAt: nowIso,
      })
      return { checked: 1, finalized: 0 }
    }

    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_product_pending_finalized',
      payload: { status: nextStatus, applied: result.applied, skipped_reason: result.skippedReason },
      success: !result.effectError,
      errorMessage: result.effectError,
      processedAt: nowIso,
    })

    return { checked: 1, finalized: 1 }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    await logWebhookEvent(supabase, {
      orderNumber: order.order_number,
      eventType: 'reconcile_product_failed',
      payload: { error: message },
      success: false,
      errorMessage: message,
      processedAt: nowIso,
    })
    return { checked: 1, finalized: 0 }
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse
  const corsHeaders = getCorsHeaders(req)

  if (req.method !== 'POST') {
    return json(req, { error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const dokuEnv = getDokuEnv()
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
    const nowIso = new Date().toISOString()

    let staleTicketCheckedCount = 0
    let staleTicketFinalizedCount = 0
    let staleProductCheckedCount = 0
    let staleProductFinalizedCount = 0

    const finalizedTicketOrderIds = new Set<number>()
    const finalizedProductOrderIds = new Set<number>()

    const { data: staleTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .in('status', ['pending', 'expired', 'failed'])
      .is('tickets_issued_at', null)
      .lt('expires_at', nowIso)

    if (Array.isArray(staleTicketOrders)) {
      for (const order of staleTicketOrders as TicketOrderRow[]) {
        const result = await reconcileStaleTicketOrder({
          supabase,
          order,
          dokuEnv,
          nowIso,
        })
        staleTicketCheckedCount += result.checked
        staleTicketFinalizedCount += result.finalized
        if (result.finalized > 0) finalizedTicketOrderIds.add(order.id)
      }
    }

    const { data: staleProductOrders } = await supabase
      .from('order_products')
      .select(
        'id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount'
      )
      .neq('channel', 'cashier')
      .in('payment_status', ['unpaid', 'pending', 'failed'])
      .not('status', 'in', '(cancelled,completed)')
      .lt('payment_expired_at', nowIso)

    if (Array.isArray(staleProductOrders)) {
      for (const order of staleProductOrders as ProductOrderRow[]) {
        const result = await reconcileStaleProductOrder({
          supabase,
          order,
          dokuEnv,
          nowIso,
        })
        staleProductCheckedCount += result.checked
        staleProductFinalizedCount += result.finalized
        if (result.finalized > 0) finalizedProductOrderIds.add(order.id)
      }
    }

    const { data: paidTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .eq('status', 'paid')

    let ticketFixCount = 0
    if (Array.isArray(paidTicketOrders)) {
      for (const order of paidTicketOrders as TicketOrderRow[]) {
        if (finalizedTicketOrderIds.has(order.id) || order.tickets_issued_at) continue
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .select('id, ticket_id, selected_date, selected_time_slots, quantity')
          .eq('order_id', order.id)

        if (orderItemsError) {
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_ticket_issue_repair_failed',
            payload: { error: orderItemsError.message, phase: 'load_items' },
            success: false,
            errorMessage: orderItemsError.message,
            processedAt: nowIso,
          })
          continue
        }

        if (Array.isArray(orderItems) && orderItems.length > 0) {
          try {
            await issueTicketsIfNeeded({
              supabase,
              order,
              orderItems: orderItems as TicketOrderItem[],
              nowIso,
            })
            ticketFixCount += 1
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            await logWebhookEvent(supabase, {
              orderNumber: order.order_number,
              eventType: 'reconcile_ticket_issue_repair_failed',
              payload: { error: message },
              success: false,
              errorMessage: message,
              processedAt: nowIso,
            })
          }
        }
      }
    }

    const { data: failedTicketOrders } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at')
      .in('status', ['expired', 'failed', 'refunded'])

    let ticketReleaseCount = 0
    if (Array.isArray(failedTicketOrders)) {
      for (const order of failedTicketOrders as TicketOrderRow[]) {
        if (finalizedTicketOrderIds.has(order.id) || order.capacity_released_at) continue
        const { data: orderItems, error: orderItemsError } = await supabase
          .from('order_items')
          .select('id, ticket_id, selected_date, selected_time_slots, quantity')
          .eq('order_id', order.id)

        if (orderItemsError) {
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_ticket_release_repair_failed',
            payload: { error: orderItemsError.message, phase: 'load_items' },
            success: false,
            errorMessage: orderItemsError.message,
            processedAt: nowIso,
          })
          continue
        }

        if (Array.isArray(orderItems) && orderItems.length > 0) {
          try {
            await releaseTicketCapacityIfNeeded({
              supabase,
              order,
              orderItems: orderItems as TicketOrderItem[],
              nowIso,
            })
            ticketReleaseCount += 1
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error'
            await logWebhookEvent(supabase, {
              orderNumber: order.order_number,
              eventType: 'reconcile_ticket_release_repair_failed',
              payload: { error: message },
              success: false,
              errorMessage: message,
              processedAt: nowIso,
            })
          }
        }
      }
    }

    const { data: paidProductOrders } = await supabase
      .from('order_products')
      .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at')
      .eq('payment_status', 'paid')

    let productFixCount = 0
    if (Array.isArray(paidProductOrders)) {
      for (const order of paidProductOrders as ProductOrderRow[]) {
        if (finalizedProductOrderIds.has(order.id) || order.pickup_code) continue
        try {
          await ensureProductPaidSideEffects({
            supabase,
            order,
            nowIso,
            defaultStatus: String(order.status || 'processing'),
            shouldSetPaidAt: false,
          })
          productFixCount += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_product_paid_repair_failed',
            payload: { error: message },
            success: false,
            errorMessage: message,
            processedAt: nowIso,
          })
        }
      }
    }

    const { data: failedProductOrders } = await supabase
      .from('order_products')
      .select('id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at')
      .in('payment_status', ['failed', 'refunded'])
      .or('status.eq.expired')

    let productReleaseCount = 0
    if (Array.isArray(failedProductOrders)) {
      for (const order of failedProductOrders as ProductOrderRow[]) {
        if (finalizedProductOrderIds.has(order.id) || order.stock_released_at) continue
        try {
          await releaseProductReservedStockIfNeeded({
            supabase,
            order,
            nowIso,
          })
          productReleaseCount += 1
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'reconcile_product_release_repair_failed',
            payload: { error: message },
            success: false,
            errorMessage: message,
            processedAt: nowIso,
          })
        }
      }
    }

    await logWebhookEvent(supabase, {
      orderNumber: 'reconcile',
      eventType: 'reconcile_summary',
      payload: {
        stale_ticket_checked_count: staleTicketCheckedCount,
        stale_ticket_finalized_count: staleTicketFinalizedCount,
        stale_product_checked_count: staleProductCheckedCount,
        stale_product_finalized_count: staleProductFinalizedCount,
        ticket_fix_count: ticketFixCount,
        ticket_release_count: ticketReleaseCount,
        product_fix_count: productFixCount,
        product_release_count: productReleaseCount,
      },
      success: true,
      processedAt: nowIso,
    })

    return json(
      req,
      {
        status: 'ok',
        stale_ticket_checked_count: staleTicketCheckedCount,
        stale_ticket_finalized_count: staleTicketFinalizedCount,
        stale_product_checked_count: staleProductCheckedCount,
        stale_product_finalized_count: staleProductFinalizedCount,
        ticket_fix_count: ticketFixCount,
        ticket_release_count: ticketReleaseCount,
        product_fix_count: productFixCount,
        product_release_count: productReleaseCount,
      },
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return json(
      req,
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
