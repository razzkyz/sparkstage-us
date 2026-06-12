import { serve } from '../_shared/deps.ts'
import { getCorsHeaders, handleCors, jsonErrorWithDetails } from '../_shared/http.ts'
import { getDokuEnv, getSupabaseEnv } from '../_shared/env.ts'
import { createServiceClient } from '../_shared/supabase.ts'
import { mapDokuStatus, verifyDokuSignature } from '../_shared/doku.ts'
import {
  processProductOrderTransition,
  processTicketOrderTransition,
} from '../_shared/payment-processors.ts'
import {
  logWebhookEvent,
  sendWhatsAppInvoiceViaFontneIfNeeded,
  type TicketOrderItem
} from '../_shared/payment-effects.ts'
import { processRentalOrderTransition } from '../_shared/payment-processors.ts'

type PaymentType = 'ticket' | 'product' | 'rental'

/**
 * Extract payment type from invoice number prefix
 * CRITICAL: Product and Ticket payments MUST be isolated
 * PRD- = product payment
 * SPK- = ticket payment
 */
function extractPaymentTypeFromInvoice(invoiceNumber: string): PaymentType | null {
  const prefix = invoiceNumber.substring(0, 4)
  if (prefix === 'PRD-') return 'product'
  if (prefix === 'SPK-') return 'ticket'
  if (prefix === 'RTL-') return 'rental'
  return null
}

/**
 * Validate that order type matches invoice type
 * CRITICAL: Detect payment type mismatch before processing
 * This prevents product invoices from being applied to ticket orders
 */
function validatePaymentTypeMatch(
  foundOrderType: PaymentType,
  invoicePaymentType: PaymentType | null,
  orderNumber: string,
): boolean {
  if (!invoicePaymentType) {
    console.warn(
      `[DOKU WEBHOOK] WARNING: Unknown invoice type prefix for ${orderNumber}, but found ${foundOrderType} order in database`,
    )
    return true // Allow legacy invoices without proper prefix
  }

  const match = foundOrderType === invoicePaymentType
  if (!match) {
    let expectedPrefix = 'SPK-'
    if (foundOrderType === 'product') expectedPrefix = 'PRD-'
    else if (foundOrderType === 'rental') expectedPrefix = 'RTL-'
    
    console.error(
      `[DOKU WEBHOOK] CRITICAL: Payment type mismatch for ${orderNumber}`,
      {
        invoiceType: invoicePaymentType,
        foundOrderType,
        expectedInvoicePrefix: expectedPrefix,
      },
    )
  }

  return match
}

function readHeader(headers: Headers, name: string) {
  return headers.get(name) ?? headers.get(name.toLowerCase()) ?? ''
}

type SignatureRequestTargetCandidate = {
  source: string
  requestTarget: string
}

function readOptionalEnv(name: string) {
  const maybeDeno = (globalThis as {
    Deno?: { env?: { get?: (key: string) => string | undefined } }
  }).Deno
  return maybeDeno?.env?.get?.(name) ?? ''
}

function parseRequestTargetCandidate(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null

  try {
    const url = new URL(trimmed)
    return url.pathname || '/'
  } catch {
    const path = trimmed.split('?')[0]?.trim() ?? ''
    return path.startsWith('/') ? path || '/' : null
  }
}

function addSignatureTargetCandidate(
  candidates: SignatureRequestTargetCandidate[],
  seen: Set<string>,
  source: string,
  value: string | null
) {
  if (!value) return
  const requestTarget = parseRequestTargetCandidate(value)
  if (!requestTarget || seen.has(requestTarget)) return

  seen.add(requestTarget)
  candidates.push({ source, requestTarget })
}

function buildSignatureRequestTargetCandidates(reqUrl: string) {
  const actualRequestPathname = new URL(reqUrl).pathname || '/'
  const candidates: SignatureRequestTargetCandidate[] = []
  const seen = new Set<string>()

  addSignatureTargetCandidate(candidates, seen, 'actual_request_pathname', actualRequestPathname)

  for (const envName of [
    'DOKU_WEBHOOK_REQUEST_TARGET',
    'DOKU_NOTIFICATION_REQUEST_TARGET',
    'DOKU_WEBHOOK_PATH',
  ]) {
    addSignatureTargetCandidate(candidates, seen, `env:${envName}`, readOptionalEnv(envName))
  }

  for (const envName of [
    'DOKU_WEBHOOK_REQUEST_TARGETS',
    'DOKU_NOTIFICATION_REQUEST_TARGETS',
  ]) {
    for (const value of readOptionalEnv(envName).split(',')) {
      addSignatureTargetCandidate(candidates, seen, `env:${envName}`, value)
    }
  }

  for (const envName of [
    'DOKU_NOTIFICATION_URL',
    'DOKU_WEBHOOK_URL',
    'DOKU_NOTIFY_URL',
  ]) {
    addSignatureTargetCandidate(candidates, seen, `env:${envName}`, readOptionalEnv(envName))
  }

  const functionRouteMatch = actualRequestPathname.match(/^\/functions\/v1\/([^/]+)\/?$/)
  if (functionRouteMatch?.[1]) {
    addSignatureTargetCandidate(
      candidates,
      seen,
      'supabase_function_slug_path',
      `/${functionRouteMatch[1]}`
    )
  }

  return { actualRequestPathname, candidates }
}

async function verifyDokuSignatureCandidates(params: {
  clientId: string
  requestId: string
  requestTimestamp: string
  requestTargets: SignatureRequestTargetCandidate[]
  secretKey: string
  rawBody: string
  providedSignature: string
}) {
  for (const candidate of params.requestTargets) {
    const isValid = await verifyDokuSignature({
      clientId: params.clientId,
      requestId: params.requestId,
      requestTimestamp: params.requestTimestamp,
      requestTarget: candidate.requestTarget,
      secretKey: params.secretKey,
      rawBody: params.rawBody,
      providedSignature: params.providedSignature,
    })

    if (isValid) {
      return candidate
    }
  }

  return null
}

function maskHeaderValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return null
  if (trimmed.length <= 8) return `${trimmed.slice(0, 2)}...${trimmed.slice(-2)}`
  return `${trimmed.slice(0, 4)}...${trimmed.slice(-4)}`
}

function readSafeHeaderDiagnostics(headers: Headers) {
  const signature = readHeader(headers, 'Signature').trim()
  const signatureScheme = signature.includes('=')
    ? signature.split('=')[0]
    : signature
      ? 'unknown'
      : null

  return {
    client_id: maskHeaderValue(readHeader(headers, 'Client-Id')),
    request_id: readHeader(headers, 'Request-Id') || null,
    request_timestamp: readHeader(headers, 'Request-Timestamp') || null,
    signature_present: Boolean(signature),
    signature_scheme: signatureScheme,
    signature_length: signature ? signature.length : 0,
    content_type: readHeader(headers, 'Content-Type') || null,
    content_length: readHeader(headers, 'Content-Length') || null,
    host: readHeader(headers, 'Host') || null,
    forwarded_host: readHeader(headers, 'X-Forwarded-Host') || null,
    forwarded_proto: readHeader(headers, 'X-Forwarded-Proto') || null,
  }
}

function readRecord(value: unknown) {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
}

function firstString(...values: unknown[]) {
  for (const value of values) {
    const text = String(value || '').trim()
    if (text) return text
  }
  return null
}

function buildNotificationDiagnostics(params: {
  payload: Record<string, unknown>
  orderPayload: Record<string, unknown>
  transactionPayload: Record<string, unknown>
}) {
  const paymentPayload = readRecord(params.payload.payment)
  const channelPayload = readRecord(params.payload.channel)
  const servicePayload = readRecord(params.payload.service)
  const paymentServicePayload = readRecord(paymentPayload.service)

  return {
    invoice_number: firstString(params.orderPayload.invoice_number),
    order_status: firstString(params.orderPayload.status),
    transaction_status: firstString(params.transactionPayload.status),
    payment_channel: firstString(
      channelPayload.id,
      channelPayload.name,
      paymentPayload.channel,
      paymentPayload.payment_channel,
      paymentPayload.payment_method,
      paymentPayload.payment_method_type
    ),
    service_id: firstString(paymentPayload.service_id, servicePayload.id, paymentServicePayload.id),
    service_name: firstString(paymentPayload.service_name, servicePayload.name, paymentServicePayload.name),
    service_type: firstString(paymentPayload.service_type, servicePayload.type, paymentServicePayload.type),
  }
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req, { allowAllOrigins: true })
  if (corsResponse) return corsResponse
  const corsHeaders = getCorsHeaders(req, { allowAllOrigins: true })

  let supabase: ReturnType<typeof createServiceClient> | null = null
  let orderNumber = ''
  let notification: unknown = null

  try {
    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv()
    const dokuEnv = getDokuEnv()
    supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    console.log('[DOKU WEBHOOK] Environment loaded:', {
      clientId: dokuEnv.clientId,
      clientIdLength: dokuEnv.clientId.length,
      secretKeyLength: dokuEnv.secretKey.length,
    })

    const rawBody = await req.text()
    console.log('[DOKU WEBHOOK] Raw body length:', rawBody.length)
    console.log('[DOKU WEBHOOK] Raw body (first 500 chars):', rawBody.substring(0, 500))

    if (!rawBody.trim()) {
      console.log('[DOKU WEBHOOK] ERROR: Empty payload')
      return new Response(JSON.stringify({ error: 'Empty payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    try {
      notification = JSON.parse(rawBody)
      console.log('[DOKU WEBHOOK] Parsed notification:', JSON.stringify(notification).substring(0, 500))
    } catch (parseError) {
      console.log('[DOKU WEBHOOK] ERROR: Invalid JSON payload', parseError)
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const payload =
      typeof notification === 'object' && notification !== null
        ? (notification as Record<string, unknown>)
        : {}
    const orderPayload =
      typeof payload.order === 'object' && payload.order !== null
        ? (payload.order as Record<string, unknown>)
        : {}
    const transactionPayload =
      typeof payload.transaction === 'object' && payload.transaction !== null
        ? (payload.transaction as Record<string, unknown>)
        : {}

    orderNumber = String(orderPayload.invoice_number || '')
    const nowIso = new Date().toISOString()
    const clientId = readHeader(req.headers, 'Client-Id')
    const requestId = readHeader(req.headers, 'Request-Id')
    const requestTimestamp = readHeader(req.headers, 'Request-Timestamp')
    const providedSignature = readHeader(req.headers, 'Signature')
    const { actualRequestPathname, candidates: requestTargetCandidates } =
      buildSignatureRequestTargetCandidates(req.url)

    console.log('[DOKU WEBHOOK] Request details:', {
      orderNumber,
      clientId,
      requestId,
      requestTimestamp,
      providedSignature: providedSignature ? providedSignature.substring(0, 20) + '...' : 'missing',
      actualRequestPathname,
      candidateCount: requestTargetCandidates.length,
    })

    if (!orderNumber) {
      console.log('[DOKU WEBHOOK] ERROR: Missing invoice_number')
      return new Response(JSON.stringify({ error: 'Missing invoice_number' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (clientId !== dokuEnv.clientId) {
      console.log('[DOKU WEBHOOK] ERROR: Invalid client id', {
        received: clientId,
        expected: dokuEnv.clientId,
      })
      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'invalid_client_id',
        payload: notification,
        success: false,
        errorMessage: 'Invalid client id',
        processedAt: nowIso,
      })
      return new Response(JSON.stringify({ error: 'Invalid client id' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[DOKU WEBHOOK] Starting signature verification...')
    const matchedSignatureTarget =
      requestId && requestTimestamp && providedSignature
        ? await verifyDokuSignatureCandidates({
          clientId,
          requestId,
          requestTimestamp,
          requestTargets: requestTargetCandidates,
          secretKey: dokuEnv.secretKey,
          rawBody,
          providedSignature,
        })
        : null

    console.log('[DOKU WEBHOOK] Signature verification result:', {
      hasRequestId: !!requestId,
      hasRequestTimestamp: !!requestTimestamp,
      hasProvidedSignature: !!providedSignature,
      matchedTarget: matchedSignatureTarget ? matchedSignatureTarget.source : null,
    })

    if (!requestId || !requestTimestamp || !providedSignature || !matchedSignatureTarget) {
      const reason =
        !requestId || !requestTimestamp || !providedSignature
          ? 'missing_signature_headers'
          : 'signature_mismatch'
      console.log('[DOKU WEBHOOK] ERROR: Invalid signature', {
        reason,
        requestId,
        requestTimestamp,
        providedSignature: providedSignature ? providedSignature.substring(0, 20) + '...' : 'missing',
        matchedTarget: matchedSignatureTarget ? matchedSignatureTarget.source : null,
      })
      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'invalid_signature',
        payload: {
          notification,
          diagnostics: {
            reason,
            actual_request_pathname: actualRequestPathname,
            candidate_request_targets: requestTargetCandidates,
            headers: readSafeHeaderDiagnostics(req.headers),
            body_length: rawBody.length,
            doku: buildNotificationDiagnostics({
              payload,
              orderPayload,
              transactionPayload,
            }),
          },
        },
        success: false,
        errorMessage: 'Invalid signature',
        processedAt: nowIso,
      })
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const providerStatus = mapDokuStatus(transactionPayload.status, orderPayload.status)
    const idempotencyEventType = `doku_status:${providerStatus}`

    console.log('[DOKU WEBHOOK] Status mapping:', {
      transactionStatus: transactionPayload.status,
      orderStatus: orderPayload.status,
      providerStatus,
      idempotencyEventType,
    })

    // CRITICAL: Extract payment type from invoice to validate payment isolation
    // PRD- = product payment, SPK- = ticket payment
    const invoicePaymentType = extractPaymentTypeFromInvoice(orderNumber)
    console.log('[DOKU WEBHOOK] Invoice payment type:', {
      orderNumber,
      paymentType: invoicePaymentType,
      prefix: orderNumber.substring(0, 4),
    })

    const { data: existingWebhook } = await supabase
      .from('webhook_logs')
      .select('id')
      .eq('order_number', orderNumber)
      .eq('event_type', idempotencyEventType)
      .eq('success', true)
      .limit(1)

    console.log('[DOKU WEBHOOK] Idempotency check:', {
      existingWebhookCount: Array.isArray(existingWebhook) ? existingWebhook.length : 0,
    })

    if (Array.isArray(existingWebhook) && existingWebhook.length > 0) {
      console.log('[DOKU WEBHOOK] Idempotent - returning ok')
      return new Response(JSON.stringify({ status: 'ok', idempotent: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('[DOKU WEBHOOK] Looking up product order:', orderNumber)
    const { data: productOrder } = await supabase
      .from('order_products')
      .select('id, user_id, order_number, status, payment_status, pickup_code, pickup_status, pickup_expires_at, total, stock_released_at, voucher_id, voucher_code, discount_amount')
      .eq('order_number', orderNumber)
      .single()

    console.log('[DOKU WEBHOOK] Product order lookup result:', {
      found: !!productOrder,
      orderId: productOrder?.id,
      currentStatus: productOrder?.status,
      paymentStatus: productOrder?.payment_status,
    })

    if (productOrder) {
      // CRITICAL: Validate payment type isolation before processing
      // Ensure product invoice (PRD-) is only used for product orders
      const isPaymentTypeValid = validatePaymentTypeMatch('product', invoicePaymentType, orderNumber)

      if (!isPaymentTypeValid) {
        console.error('[DOKU WEBHOOK] CRITICAL ERROR: Payment type mismatch detected', {
          orderNumber,
          invoicePaymentType,
          foundOrderType: 'product',
          expectedPrefix: 'PRD-',
        })

        await logWebhookEvent(supabase, {
          orderNumber,
          eventType: 'payment_type_mismatch',
          payload: {
            notification,
            error: 'Product invoice being applied to ticket order or vice versa',
            invoicePaymentType,
            foundOrderType: 'product',
          },
          success: false,
          errorMessage: `Payment type mismatch: invoice has type ${invoicePaymentType} but found product order`,
          processedAt: nowIso,
        })

        return jsonErrorWithDetails(
          req,
          422,
          {
            error: 'Payment type mismatch',
            code: 'PAYMENT_TYPE_MISMATCH',
            details: `Invoice type ${invoicePaymentType} does not match found order type product`,
          },
          { allowAllOrigins: true }
        )
      }

      console.log('[DOKU WEBHOOK] Processing product order transition to:', providerStatus)
      const result = await processProductOrderTransition({
        supabase,
        order: productOrder as {
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
        paymentData: notification,
        grossAmount: orderPayload.amount,
        nowIso,
        shouldSetPaidAt: true,
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'product_order_processed',
        payload: {
          notification,
          next_status: providerStatus,
          applied: result.applied,
          skipped_reason: result.skippedReason,
        },
        success: !result.updateError && !result.effectError,
        errorMessage: result.updateError ?? result.effectError,
        processedAt: nowIso,
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: idempotencyEventType,
        payload: notification,
        success: !result.updateError && !result.effectError,
        errorMessage: result.updateError ?? result.effectError,
        processedAt: nowIso,
      })

      console.log('[DOKU WEBHOOK] Product order transition result:', {
        applied: result.applied,
        skippedReason: result.skippedReason,
        updateError: result.updateError,
        effectError: result.effectError,
      })

      if (result.updateError || result.effectError) {
        console.log('[DOKU WEBHOOK] ERROR: Product order transition failed')
        return jsonErrorWithDetails(
          req,
          500,
          {
            error: 'Failed to process product payment webhook',
            code: 'PRODUCT_WEBHOOK_FAILED',
            details: result.updateError ?? result.effectError,
          },
          { allowAllOrigins: true }
        )
      }

      // Send WhatsApp invoice if payment is successful for product order
      if (providerStatus === 'paid' && result.applied) {
        console.log('[DOKU WEBHOOK] Sending WhatsApp invoice for product order:', orderNumber)
        try {
          // For product orders, fetch minimal order data for WhatsApp function
          const { data: fetchedOrder } = await supabase
            .from('order_products')
            .select('id, order_number, user_id, status')
            .eq('order_number', orderNumber)
            .single()

          if (fetchedOrder) {
            await sendWhatsAppInvoiceViaFontneIfNeeded({
              supabase,
              order: {
                id: fetchedOrder.id,
                order_number: fetchedOrder.order_number,
                user_id: fetchedOrder.user_id,
                status: fetchedOrder.status,
              } as any,
              orderType: 'product',
              nowIso,
            })
          }
        } catch (whatsappError) {
          // Log WhatsApp error but don't fail the webhook
          const errorMsg = whatsappError instanceof Error ? whatsappError.message : String(whatsappError)
          console.error('[DOKU WEBHOOK] WhatsApp invoice failed for product order (non-fatal):', errorMsg)
          await logWebhookEvent(supabase, {
            orderNumber,
            eventType: 'whatsapp_invoice_send_error',
            payload: {
              error: errorMsg,
              order_number: orderNumber,
              order_type: 'product',
            },
            success: false,
            errorMessage: errorMsg,
            processedAt: nowIso,
          })
        }
      }

      console.log('[DOKU WEBHOOK] Product order processed successfully')
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, user_id, order_number, status, tickets_issued_at, capacity_released_at, customer_name, customer_phone, order_items(*)')
      .eq('order_number', orderNumber)
      .single()

    console.log('[DOKU WEBHOOK] Ticket order lookup result:', {
      found: !!order,
      orderId: order?.id,
      currentStatus: order?.status,
      orderError: orderError?.message,
    })

    if (orderError || !order) {
      console.log('[DOKU WEBHOOK] Looking up print order:', orderNumber)
      const { data: printOrder, error: printOrderError } = await supabase
        .from('print_orders')
        .select('*')
        .eq('doku_order_id', orderNumber)
        .single()

      console.log('[DOKU WEBHOOK] Print order lookup result:', {
        found: !!printOrder,
        printOrderId: printOrder?.id,
        currentStatus: printOrder?.status,
        printOrderError: printOrderError?.message,
      })

      if (printOrderError || !printOrder) {
        console.log('[DOKU WEBHOOK] ERROR: Order not found in any table', {
          orderError: orderError?.message,
          printOrderError: printOrderError?.message,
          orderNumber,
        })
        await logWebhookEvent(supabase, {
          orderNumber,
          eventType: 'order_not_found',
          payload: notification,
          success: false,
          errorMessage: 'Order not found in orders, order_products, or print_orders',
          processedAt: nowIso,
        })
        return new Response(JSON.stringify({ error: 'Order not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      console.log('[DOKU WEBHOOK] Processing print order transition to:', providerStatus)
      const updateData: Record<string, unknown> = {
        status: providerStatus,
        updated_at: nowIso,
      }

      if (providerStatus === 'paid' && !printOrder.paid_at) {
        updateData.paid_at = nowIso
      }

      const { error: updateError } = await supabase
        .from('print_orders')
        .update(updateData)
        .eq('id', printOrder.id)

      if (updateError) {
        console.log('[DOKU WEBHOOK] ERROR: Print order update failed', updateError)
        await logWebhookEvent(supabase, {
          orderNumber,
          eventType: 'print_order_update_failed',
          payload: notification,
          success: false,
          errorMessage: updateError.message,
          processedAt: nowIso,
        })
        return new Response(JSON.stringify({ error: 'Failed to update print order' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'print_order_processed',
        payload: {
          notification,
          next_status: providerStatus,
          previous_status: printOrder.status,
        },
        success: true,
        processedAt: nowIso,
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: idempotencyEventType,
        payload: notification,
        success: true,
        processedAt: nowIso,
      })

      console.log('[DOKU WEBHOOK] Print order processed successfully')
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    // Check if it's a rental order
    const { data: rentalOrder, error: rentalError } = await supabase
      .from('rental_orders')
      .select('id, user_id, order_number, status, payment_status')
      .eq('order_number', orderNumber)
      .maybeSingle()
      
    if (rentalOrder) {
      const isPaymentTypeValid = validatePaymentTypeMatch('rental', invoicePaymentType, orderNumber)

      if (!isPaymentTypeValid) {
        console.error('[DOKU WEBHOOK] CRITICAL ERROR: Payment type mismatch detected', {
          orderNumber,
          invoicePaymentType,
          foundOrderType: 'rental',
          expectedPrefix: 'RTL-',
        })

        await logWebhookEvent(supabase, {
          orderNumber,
          eventType: 'payment_type_mismatch',
          payload: {
            notification,
            error: 'Rental invoice being applied to wrong order type',
            invoicePaymentType,
            foundOrderType: 'rental',
          },
          success: false,
          errorMessage: `Payment type mismatch: invoice has type ${invoicePaymentType} but found rental order`,
          processedAt: nowIso,
        })

        return jsonErrorWithDetails(
          req,
          422,
          {
            error: 'Payment type mismatch',
            code: 'PAYMENT_TYPE_MISMATCH',
            details: `Invoice type ${invoicePaymentType} does not match found order type rental`,
          },
          { allowAllOrigins: true }
        )
      }

      console.log('[DOKU WEBHOOK] Processing rental order transition to:', providerStatus)
      const result = await processRentalOrderTransition({
        supabase,
        order: rentalOrder,
        nextStatus: providerStatus,
        paymentData: notification,
        nowIso,
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'rental_order_processed',
        payload: {
          notification,
          next_status: providerStatus,
          applied: result.applied,
          skipped_reason: result.skippedReason,
        },
        success: !result.updateError && !result.effectError,
        errorMessage: result.updateError ?? result.effectError,
        processedAt: nowIso,
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: idempotencyEventType,
        payload: notification,
        success: !result.updateError && !result.effectError,
        errorMessage: result.updateError ?? result.effectError,
        processedAt: nowIso,
      })

      if (result.updateError || result.effectError) {
        console.log('[DOKU WEBHOOK] ERROR: Rental order transition failed')
        return jsonErrorWithDetails(
          req,
          500,
          {
            error: 'Failed to process rental payment webhook',
            code: 'RENTAL_WEBHOOK_FAILED',
            details: result.updateError ?? result.effectError,
          },
          { allowAllOrigins: true }
        )
      }

      console.log('[DOKU WEBHOOK] Rental order processed successfully')
      return new Response(JSON.stringify({ status: 'ok' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const orderItemsRows = (order as { order_items?: unknown }).order_items

    // CRITICAL: Validate payment type isolation before processing
    // Ensure ticket invoice (SPK-) is only used for ticket orders
    const isPaymentTypeValid = validatePaymentTypeMatch('ticket', invoicePaymentType, orderNumber)

    if (!isPaymentTypeValid) {
      console.error('[DOKU WEBHOOK] CRITICAL ERROR: Payment type mismatch detected', {
        orderNumber,
        invoicePaymentType,
        foundOrderType: 'ticket',
        expectedPrefix: 'SPK-',
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'payment_type_mismatch',
        payload: {
          notification,
          error: 'Ticket invoice being applied to product order or vice versa',
          invoicePaymentType,
          foundOrderType: 'ticket',
        },
        success: false,
        errorMessage: `Payment type mismatch: invoice has type ${invoicePaymentType} but found ticket order`,
        processedAt: nowIso,
      })

      return jsonErrorWithDetails(
        req,
        422,
        {
          error: 'Payment type mismatch',
          code: 'PAYMENT_TYPE_MISMATCH',
          details: `Invoice type ${invoicePaymentType} does not match found order type ticket`,
        },
        { allowAllOrigins: true }
      )
    }

    console.log('[DOKU WEBHOOK] Processing ticket order transition to:', providerStatus)
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
      nextStatus: providerStatus,
      paymentData: notification,
      orderItems: Array.isArray(orderItemsRows) ? (orderItemsRows as TicketOrderItem[]) : undefined,
      nowIso,
    })

    await logWebhookEvent(supabase, {
      orderNumber,
      eventType: 'ticket_order_processed',
      payload: {
        notification,
        next_status: providerStatus,
        applied: result.applied,
        skipped_reason: result.skippedReason,
      },
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    await logWebhookEvent(supabase, {
      orderNumber,
      eventType: idempotencyEventType,
      payload: notification,
      success: !result.updateError && !result.effectError,
      errorMessage: result.updateError ?? result.effectError,
      processedAt: nowIso,
    })

    console.log('[DOKU WEBHOOK] Ticket order transition result:', {
      applied: result.applied,
      skippedReason: result.skippedReason,
      updateError: result.updateError,
      effectError: result.effectError,
    })

    if (result.updateError || result.effectError) {
      console.log('[DOKU WEBHOOK] ERROR: Ticket order transition failed')
      return jsonErrorWithDetails(
        req,
        500,
        {
          error: 'Failed to process ticket payment webhook',
          code: 'TICKET_WEBHOOK_FAILED',
          details: result.updateError ?? result.effectError,
        },
        { allowAllOrigins: true }
      )
    }

    // Send WhatsApp invoice if payment is successful
    if (providerStatus === 'paid' && result.applied) {
      console.log('[DOKU WEBHOOK] Sending WhatsApp invoice for ticket order:', orderNumber)
      
      // ─────────────────────────────────────────────
      // Trigger n8n → kirim WhatsApp invoice
      // ─────────────────────────────────────────────
      const N8N_WEBHOOK_URL = (globalThis as { Deno?: { env?: { get?: (key: string) => string | undefined } } }).Deno?.env?.get?.("N8N_INVOICE_WEBHOOK_URL");

      // Normalize phone: 08xxx → 628xxx, +628xxx → 628xxx
      function normalizePhoneID(raw: string): string {
        let phone = (raw || '').replace(/[\s\-+]/g, ""); // hapus spasi, dash, plus
        if (phone.startsWith("0")) phone = "62" + phone.slice(1);
        if (phone.startsWith("8")) phone = "62" + phone; // edge case
        return phone;
      }

      try {
        if (N8N_WEBHOOK_URL) {
          const orderItemsRows = (order as any).order_items || [];
          const firstItem = Array.isArray(orderItemsRows) && orderItemsRows.length > 0 ? orderItemsRows[0] : null;
          const visit_date = firstItem?.selected_date || '';
          let visit_time = 'TBA';
          if (firstItem?.selected_time_slots && Array.isArray(firstItem.selected_time_slots) && firstItem.selected_time_slots.length > 0) {
            const timeStr = String(firstItem.selected_time_slots[0]);
            const match = timeStr.match(/^\d{2}:\d{2}/);
            if (match) visit_time = `${match[0]} WIB`;
          }

          let ticket_code = '';
          if (firstItem?.id) {
            const { data: tktData } = await supabase
              .from('purchased_tickets')
              .select('ticket_code')
              .eq('order_item_id', firstItem.id)
              .limit(1)
              .single();
            if (tktData?.ticket_code) ticket_code = tktData.ticket_code;
          }

          const n8nPayload = {
            customer_name: (order as any).customer_name || 'Customer',
            phone_number: normalizePhoneID((order as any).customer_phone || ''),
            invoice_number: orderNumber,
            visit_date: visit_date,        // sesuaikan format dari DB
            visit_time: visit_time,        // sesuaikan format dari DB
            payment_status: "PAID",
            ticket_code: ticket_code || orderNumber,
          };

          const n8nResp = await fetch(N8N_WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(n8nPayload),
          });

          if (!n8nResp.ok) {
            console.error("[n8n] webhook failed", {
              status: n8nResp.status,
              body: await n8nResp.text(),
              invoice: orderNumber,
            });
            // JANGAN throw — biar response ke DOKU tetap 200 OK (transaksi tetap sukses)
          } else {
            console.log("[n8n] invoice WhatsApp queued", { invoice: orderNumber });
          }
        } else {
          console.warn("[n8n] N8N_INVOICE_WEBHOOK_URL is not set, skipping n8n trigger");
        }
      } catch (err) {
        console.error("[n8n] webhook error", { error: (err as Error).message, invoice: orderNumber });
        // JANGAN throw — DOKU tidak peduli soal WA, mereka cuma butuh 200 OK
      }
    }

    console.log('[DOKU WEBHOOK] Ticket order processed successfully')
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('[DOKU WEBHOOK] ERROR: Exception caught', error)
    if (supabase) {
      const message = error instanceof Error ? error.message : 'Internal server error'
      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'exception',
        payload: notification,
        success: false,
        errorMessage: message,
        processedAt: new Date().toISOString(),
      })
    }
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
