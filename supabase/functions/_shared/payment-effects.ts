import type { Json } from './database.types.ts'
import type { ServiceClient } from './supabase.ts'
import { normalizeAvailabilityTimeSlot, normalizeSelectedTimeSlots } from './tickets.ts'
import { sendWhatsAppMessage, buildTicketConfirmationParams } from './whatsapp.ts'
import { sendWhatsAppViaFonnte, buildInvoiceMessage } from './fonnte.ts'
import { getDokuWhatsAppEnv } from './env.ts'

type OrdersRow = {
  id: number
  order_number: string
  user_id: string | null
  status?: string | null
  tickets_issued_at?: string | null
  capacity_released_at?: string | null
  updated_at?: string | null
}

type OrderItemsRow = {
  id: number
  order_id: number
  ticket_id: number
  selected_date: string
  selected_time_slots: Json | null
  quantity: number
}

type OrderProductsRow = {
  id: number
  order_number: string
  status?: string | null
  payment_status?: string | null
  total?: unknown
  pickup_code?: string | null
  pickup_status?: string | null
  pickup_expires_at?: string | null
  stock_released_at?: string | null
  paid_at?: string | null
  updated_at?: string | null
  shipping_courier?: string | null
  shipping_cost?: unknown
}

type OrderProductItemsRow = {
  id?: number
  order_product_id: number
  product_variant_id: number
  quantity: number
}

export type TicketOrder = OrdersRow
export type TicketOrderItem = Pick<OrderItemsRow, 'id' | 'ticket_id' | 'selected_date' | 'selected_time_slots' | 'quantity'> & {
  order_id?: number
}
export type ProductOrder = OrderProductsRow
export type ProductOrderItem = OrderProductItemsRow

export type PaymentEffectScope = 'ticket_order' | 'product_order'

async function claimPaymentEffectRun(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
}) {
  const { data, error } = await params.supabase.rpc('claim_payment_effect_run', {
    p_effect_scope: params.scope,
    p_order_ref: params.orderRef,
    p_effect_type: params.effectType,
    p_effect_key: params.effectKey ?? '',
    p_stale_after_seconds: 300,
  })

  if (error) {
    throw new Error(`Failed to claim payment effect run: ${error.message}`)
  }

  const row = Array.isArray(data) ? data[0] : null
  return {
    claimed: Boolean((row as { claimed?: boolean } | null)?.claimed),
    status: String((row as { status?: string } | null)?.status ?? ''),
  }
}

async function completePaymentEffectRun(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
  metadata?: Json | null
}) {
  const { error } = await params.supabase.rpc('complete_payment_effect_run', {
    p_effect_scope: params.scope,
    p_order_ref: params.orderRef,
    p_effect_type: params.effectType,
    p_effect_key: params.effectKey ?? '',
    p_metadata: params.metadata ?? null,
  })

  if (error) {
    throw new Error(`Failed to complete payment effect run: ${error.message}`)
  }
}

async function failPaymentEffectRun(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
  errorMessage: string
  metadata?: Json | null
}) {
  const { error } = await params.supabase.rpc('fail_payment_effect_run', {
    p_effect_scope: params.scope,
    p_order_ref: params.orderRef,
    p_effect_type: params.effectType,
    p_effect_key: params.effectKey ?? '',
    p_error: params.errorMessage,
    p_metadata: params.metadata ?? null,
  })

  if (error) {
    console.error('[payment-effects] Failed to mark effect run failed:', error)
  }
}

async function withPaymentEffectRun<TResult>(params: {
  supabase: ServiceClient
  scope: PaymentEffectScope
  orderRef: string
  effectType: string
  effectKey?: string
  skipResult: TResult
  metadataOnComplete?: Json | null
  run: () => Promise<TResult>
}): Promise<TResult> {
  const claim = await claimPaymentEffectRun({
    supabase: params.supabase,
    scope: params.scope,
    orderRef: params.orderRef,
    effectType: params.effectType,
    effectKey: params.effectKey,
  })

  if (!claim.claimed) {
    return params.skipResult
  }

  try {
    const result = await params.run()
    await completePaymentEffectRun({
      supabase: params.supabase,
      scope: params.scope,
      orderRef: params.orderRef,
      effectType: params.effectType,
      effectKey: params.effectKey,
      metadata: params.metadataOnComplete ?? null,
    })
    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown payment effect failure'
    await failPaymentEffectRun({
      supabase: params.supabase,
      scope: params.scope,
      orderRef: params.orderRef,
      effectType: params.effectType,
      effectKey: params.effectKey,
      errorMessage: message,
    })
    throw error
  }
}

export function toNumber(value: unknown, fallback: number) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

export function generateTicketCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = 'TKT-'
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result + '-' + Date.now().toString(36).toUpperCase()
}

export async function logWebhookEvent(
  supabase: ServiceClient,
  params: {
    orderNumber: string
    eventType: string
    payload: unknown
    success: boolean
    errorMessage?: string | null
    processedAt: string
  }
) {
  try {
    await supabase.from('webhook_logs').insert({
      order_number: params.orderNumber || null,
      event_type: params.eventType,
      payload: (params.payload ?? null) as Json | null,
      processed_at: params.processedAt,
      success: params.success,
      error_message: params.errorMessage ?? null,
    })
  } catch (err) {
    console.error('[logWebhookEvent] Failed to log:', err)
    return
  }
}

export async function issueTicketsIfNeeded(params: {
  supabase: ServiceClient
  order: TicketOrder
  orderItems?: TicketOrderItem[]
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.tickets_issued_at) return { issued: 0, skipped: true }

  return withPaymentEffectRun({
    supabase,
    scope: 'ticket_order',
    orderRef: order.order_number,
    effectType: 'issue_tickets',
    skipResult: { issued: 0, skipped: true },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      // Ensure we have the user_id - fetch from order if missing
      let userId = order.user_id
      if (!userId) {
        const { data: orderData, error: orderError } = await supabase
          .from('orders')
          .select('user_id')
          .eq('id', order.id)
          .single()
        if (orderError) {
          throw new Error(`Failed to fetch order user_id: ${orderError.message}`)
        }
        userId = (orderData as { user_id?: string | null })?.user_id ?? null
      }

      if (!userId) {
        throw new Error(`Cannot issue tickets: order ${order.order_number} has no user_id`)
      }

      const orderItemsResult =
        params.orderItems == null
          ? await supabase
              .from('order_items')
              .select('id, ticket_id, selected_date, selected_time_slots, quantity')
              .eq('order_id', order.id)
          : null

      const orderItems = params.orderItems ?? orderItemsResult?.data

      if (orderItemsResult?.error) {
        throw new Error(`Failed to load ticket order items: ${orderItemsResult.error.message}`)
      }

      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return { issued: 0, skipped: true }
      }

      const now = new Date()
      const itemIds = orderItems.map((row) => Number(row.id)).filter((id) => id > 0)
      const { data: existingTicketRows, error: existingTicketsError } = itemIds.length
        ? await supabase.from('purchased_tickets').select('order_item_id').in('order_item_id', itemIds)
        : { data: [] as unknown[], error: null }

      if (existingTicketsError) {
        throw new Error(`Failed to inspect existing purchased tickets: ${existingTicketsError.message}`)
      }

      const existingByOrderItemId = new Map<number, number>()
      if (Array.isArray(existingTicketRows)) {
        for (const row of existingTicketRows) {
          const id = Number((row as { order_item_id?: number | string }).order_item_id ?? 0)
          if (!id) continue
          existingByOrderItemId.set(id, (existingByOrderItemId.get(id) ?? 0) + 1)
        }
      }

      const ticketsToInsert: Array<Record<string, unknown>> = []
      const capacityUpdates = new Map<string, { ticketId: number; selectedDate: string; timeSlot: string | null; qty: number }>()
      let totalNeeded = 0

      for (const item of orderItems) {
        const orderItemId = Number(item.id ?? 0)
        const quantity = Math.max(0, Math.floor(Number(item.quantity ?? 0)))
        const existing = existingByOrderItemId.get(orderItemId) ?? 0
        const needed = Math.max(0, quantity - existing)
        if (!orderItemId || needed <= 0) continue

        totalNeeded += needed

        const slots = normalizeSelectedTimeSlots(item.selected_time_slots)
        const firstSlot = slots[0]
        let timeSlotForTicket = firstSlot && firstSlot !== 'all-day' && /^\d{2}:\d{2}/.test(firstSlot) ? firstSlot : null

        let slotExpired = false
        const selectedDate = String(item.selected_date ?? '')
        if (timeSlotForTicket && selectedDate) {
          const sessionStartTimeWIB = new Date(`${selectedDate}T${timeSlotForTicket}:00+07:00`)
          const sessionEndTimeWIB = new Date(sessionStartTimeWIB.getTime() + 150 * 60 * 1000)
          if (now > sessionEndTimeWIB) {
            slotExpired = true
            timeSlotForTicket = null
            await logWebhookEvent(supabase, {
              orderNumber: order.order_number,
              eventType: 'session_ended_converted_to_allday',
              payload: {
                original_slot: firstSlot,
                selected_date: selectedDate,
                session_end_time: sessionEndTimeWIB.toISOString(),
                payment_completed_at: nowIso,
              },
              success: true,
              processedAt: nowIso,
            })
          }
        }

        for (let i = 0; i < needed; i++) {
          ticketsToInsert.push({
            ticket_code: generateTicketCode(),
            order_item_id: orderItemId,
            user_id: userId,
            ticket_id: item.ticket_id,
            valid_date: selectedDate,
            time_slot: timeSlotForTicket,
            status: 'active',
            created_at: nowIso,
            updated_at: nowIso,
          })
        }

        const rawSlots = slots.length > 0 ? slots : ['all-day']
        const slotsForCapacity = slotExpired ? [null] : rawSlots.map((slot) => normalizeAvailabilityTimeSlot(String(slot)))
        const uniqueSlots = Array.from(new Set(slotsForCapacity.map((s) => (s == null ? '' : String(s)))))
        const ticketId = Number(item.ticket_id ?? 0)
        if (!ticketId || !selectedDate) continue

        for (const slotKey of uniqueSlots) {
          const timeSlot = slotKey === '' ? null : slotKey
          const key = `${ticketId}|${selectedDate}|${timeSlot ?? ''}`
          const existingUpdate = capacityUpdates.get(key)
          if (existingUpdate) {
            existingUpdate.qty += needed
          } else {
            capacityUpdates.set(key, { ticketId, selectedDate, timeSlot, qty: needed })
          }
        }
      }

      if (ticketsToInsert.length > 0) {
        const { error: insertError } = await supabase.from('purchased_tickets').insert(ticketsToInsert)
        if (insertError) {
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'ticket_issue_failed',
            payload: { error: insertError.message },
            success: false,
            errorMessage: insertError.message,
            processedAt: nowIso,
          })
          throw new Error(`Failed to insert purchased tickets: ${insertError.message}`)
        }
      }

      for (const update of capacityUpdates.values()) {
        const { data: finalized, error: finalizeError } = await supabase.rpc('finalize_ticket_capacity', {
          p_ticket_id: update.ticketId,
          p_date: update.selectedDate,
          p_time_slot: update.timeSlot,
          p_quantity: update.qty,
        })

        if (finalizeError || finalized !== true) {
          throw new Error(
            finalizeError?.message ??
              `Failed to finalize ticket capacity for ${update.ticketId} on ${update.selectedDate}`
          )
        }
      }

      if (!order.tickets_issued_at && (totalNeeded > 0 || ticketsToInsert.length === 0)) {
        const { error: markIssuedError } = await supabase
          .from('orders')
          .update({ tickets_issued_at: nowIso, updated_at: nowIso })
          .eq('id', order.id)

        if (markIssuedError) {
          throw new Error(`Failed to mark tickets as issued: ${markIssuedError.message}`)
        }
      }

      return { issued: totalNeeded, skipped: false }
    },
  })
}

export async function sendTicketNotificationsIfNeeded(params: {
  supabase: ServiceClient
  order: TicketOrder
  nowIso: string
}) {
  const { supabase, order, nowIso } = params

  return withPaymentEffectRun({
    supabase,
    scope: 'ticket_order',
    orderRef: order.order_number,
    effectType: 'send_ticket_notifications',
    skipResult: { notified: false, skipped: true },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      // Fetch order details with customer info and first booking date
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, user_id, customer_name, customer_email, customer_phone')
        .eq('id', order.id)
        .single()

      if (orderError || !orderData) {
        throw new Error(`Failed to fetch order details: ${orderError?.message}`)
      }

      const { customer_email, customer_phone, customer_name, user_id } = orderData as any

      // Get order items with dates and time slots
      const { data: orderItems, error: itemsError } = await supabase
        .from('order_items')
        .select('quantity, selected_date, selected_time_slots')
        .eq('order_id', order.id)

      if (itemsError) {
        throw new Error(`Failed to fetch order items: ${itemsError.message}`)
      }

      const itemsArray = Array.isArray(orderItems) ? orderItems : []
      const totalQuantity = itemsArray.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)

      // Get first booking date and time slot for notification
      const firstItem = itemsArray[0]
      const firstBookingDate = firstItem?.selected_date || ''
      const firstTimeSlots = firstItem?.selected_time_slots || []
      const firstTimeSlot = Array.isArray(firstTimeSlots) && firstTimeSlots.length > 0 
        ? String(firstTimeSlots[0]).split(' ')[0] // Extract time only
        : 'TBA'

      // Fetch first ticket code (TKT-...) for invoice number
      const { data: ticketsData, error: ticketsError } = await supabase
        .from('purchased_tickets')
        .select('ticket_code')
        .eq('order_item_id', (firstItem as any)?.id || 0)
        .order('created_at', { ascending: true })
        .limit(1)
        .single()

      const invoiceNumber = (ticketsData as any)?.ticket_code || order.order_number

      // Log notification attempt
      console.log('[sendTicketNotifications] Attempting to notify order:', {
        order_id: order.id,
        order_number: order.order_number,
        invoice_number: invoiceNumber,
        customer_email,
        customer_phone,
        total_quantity: totalQuantity,
      })

      // Send WhatsApp notification if phone provided
      let whatsappSent = false
      let whatsappError: string | null = null

      if (customer_phone && customer_phone.trim()) {
        try {
          const whatsappEnv = getDokuWhatsAppEnv()
          
          if (whatsappEnv.isEnabled) {
            console.log('[sendTicketNotifications] Sending WhatsApp notification to:', customer_phone)
            
            // Build template parameters for DOKU WhatsApp API
            const templateParams = buildTicketConfirmationParams({
              customerName: customer_name || 'Guest',
              invoiceNumber,
              bookingDate: firstBookingDate,
              sessionTime: firstTimeSlot,
              ticketCount: totalQuantity,
              venueName: 'SPARK STAGE 55',
            })

            // Send via DOKU WhatsApp API
            const result = await sendWhatsAppMessage({
              clientId: whatsappEnv.clientId,
              secretKey: whatsappEnv.secretKey,
              isProduction: whatsappEnv.isProduction,
              templateId: whatsappEnv.ticketConfirmationTemplateId,
              destinationPhone: customer_phone,
              params: templateParams,
            })

            if (result.success) {
              console.log('[sendTicketNotifications] WhatsApp sent successfully:', {
                messageId: result.messageId,
                phone: customer_phone,
              })
              whatsappSent = true

              // Log to whatsapp_messages table
              try {
                await supabase.from('whatsapp_messages').insert({
                  order_id: order.id,
                  order_number: order.order_number,
                  customer_phone: customer_phone.trim(),
                  customer_name: customer_name || null,
                  template_id: whatsappEnv.ticketConfirmationTemplateId,
                  params: templateParams,
                  ticket_code: invoiceNumber,
                  booking_date: firstBookingDate,
                  session_time: firstTimeSlot,
                  ticket_count: totalQuantity,
                  doku_message_id: result.messageId || null,
                  provider_status: 'submitted',
                  delivery_status: 'submitted',
                  sent_at: new Date().toISOString(),
                })
              } catch (logError) {
                console.error('[sendTicketNotifications] Failed to log to whatsapp_messages:', logError)
              }
            } else {
              console.error('[sendTicketNotifications] WhatsApp send failed:', result.error)
              whatsappError = result.error || 'Unknown error'

              // Log failed attempt to whatsapp_messages table
              try {
                await supabase.from('whatsapp_messages').insert({
                  order_id: order.id,
                  order_number: order.order_number,
                  customer_phone: customer_phone.trim(),
                  customer_name: customer_name || null,
                  template_id: whatsappEnv.ticketConfirmationTemplateId,
                  params: templateParams,
                  ticket_code: invoiceNumber,
                  booking_date: firstBookingDate,
                  session_time: firstTimeSlot,
                  ticket_count: totalQuantity,
                  provider_status: 'failed',
                  delivery_status: 'failed',
                  error_message: whatsappError,
                  sent_at: new Date().toISOString(),
                })
              } catch (logError) {
                console.error('[sendTicketNotifications] Failed to log failure to whatsapp_messages:', logError)
              }
              
              // Log the failure but don't throw - we want other notifications to proceed
              await logWebhookEvent(supabase, {
                orderNumber: order.order_number,
                eventType: 'whatsapp_notification_failed',
                payload: {
                  phone: customer_phone,
                  error: whatsappError,
                  details: result.details,
                },
                success: false,
                errorMessage: whatsappError,
                processedAt: nowIso,
              })
            }
          } else {
            console.log('[sendTicketNotifications] WhatsApp notifications disabled in environment')
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          console.error('[sendTicketNotifications] Exception sending WhatsApp:', errorMsg)
          whatsappError = errorMsg
          
          // Log exception but don't throw
          await logWebhookEvent(supabase, {
            orderNumber: order.order_number,
            eventType: 'whatsapp_notification_exception',
            payload: { phone: customer_phone, error: errorMsg },
            success: false,
            errorMessage: errorMsg,
            processedAt: nowIso,
          })
        }
      }

      // Award loyalty points (this is always done)
      let pointsAwarded = false
      if (user_id && totalQuantity > 0) {
        try {
          const { data: pointsResult, error: pointsError } = await supabase.rpc('award_loyalty_points', {
            p_user_id: user_id,
            p_order_id: order.id,
            p_ticket_quantity: totalQuantity,
            p_reason: 'Ticket purchase reward',
          })

          if (pointsError) {
            console.error('[sendTicketNotifications] Error awarding points:', pointsError.message)
          } else {
            console.log('[sendTicketNotifications] Loyalty points awarded:', pointsResult)
            pointsAwarded = true
          }
        } catch (error) {
          console.error('[sendTicketNotifications] Exception awarding points:', error)
        }
      }

      return { 
        notified: true, 
        skipped: false, 
        details: { 
          whatsapp_sent: whatsappSent,
          whatsapp_error: whatsappError,
          phone: customer_phone ? `${customer_phone.slice(0, 3)}***` : null,
          email: !!customer_email,
          points_awarded: pointsAwarded,
        } 
      }
    },
  })
}

export async function releaseTicketCapacityIfNeeded(params: {
  supabase: ServiceClient
  order: TicketOrder
  orderItems?: TicketOrderItem[]
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.capacity_released_at) return { released: false }

  return withPaymentEffectRun({
    supabase,
    scope: 'ticket_order',
    orderRef: order.order_number,
    effectType: 'release_ticket_capacity',
    skipResult: { released: false },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      const orderItemsResult =
        params.orderItems == null
          ? await supabase
              .from('order_items')
              .select('id, ticket_id, selected_date, selected_time_slots, quantity')
              .eq('order_id', order.id)
          : null

      const orderItems = params.orderItems ?? orderItemsResult?.data

      if (orderItemsResult?.error) {
        throw new Error(`Failed to load ticket order items for capacity release: ${orderItemsResult.error.message}`)
      }

      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return { released: false }
      }

      const releases = new Map<string, { ticketId: number; selectedDate: string; timeSlot: string | null; qty: number }>()
      for (const row of orderItems) {
        const qty = Math.max(1, Math.floor(Number(row.quantity ?? 0)))
        const ticketId = Number(row.ticket_id ?? 0)
        const selectedDate = String(row.selected_date ?? '')
        if (!ticketId || !selectedDate || qty <= 0) continue

        const slots = normalizeSelectedTimeSlots(row.selected_time_slots)
        const normalizedSlots = slots.length > 0 ? slots : ['all-day']
        for (const slot of normalizedSlots) {
          const timeSlot = normalizeAvailabilityTimeSlot(String(slot))
          const key = `${ticketId}|${selectedDate}|${timeSlot ?? ''}`
          const existing = releases.get(key)
          if (existing) {
            existing.qty += qty
          } else {
            releases.set(key, { ticketId, selectedDate, timeSlot, qty })
          }
        }
      }

      for (const release of releases.values()) {
        const { data: released, error: releaseError } = await supabase.rpc('release_ticket_capacity', {
          p_ticket_id: release.ticketId,
          p_date: release.selectedDate,
          p_time_slot: release.timeSlot,
          p_quantity: release.qty,
        })

        if (releaseError || released !== true) {
          throw new Error(
            releaseError?.message ??
              `Failed to release ticket capacity for ${release.ticketId} on ${release.selectedDate}`
          )
        }
      }

      const { error: markReleasedError } = await supabase
        .from('orders')
        .update({ capacity_released_at: nowIso, updated_at: nowIso })
        .eq('id', order.id)

      if (markReleasedError) {
        throw new Error(`Failed to mark ticket capacity as released: ${markReleasedError.message}`)
      }

      return { released: true }
    },
  })
}

export async function ensureVoucherUsageIfNeeded(params: {
  supabase: ServiceClient
  orderNumber: string
  voucherId: string | null
  voucherCode?: string | null
  userId: string | null
  orderProductId: number
  discountAmount: unknown
  nowIso: string
}) {
  const { supabase, orderNumber, voucherId, voucherCode, userId, orderProductId, discountAmount, nowIso } = params
  if (!voucherId || !userId) return { ensured: false }

  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: orderNumber,
    effectType: 'ensure_voucher_usage',
    effectKey: voucherId,
    skipResult: { ensured: false },
    metadataOnComplete: { order_product_id: orderProductId, processed_at: nowIso },
    run: async () => {
      const { error } = await supabase
        .from('voucher_usage')
        .upsert(
          {
            voucher_id: voucherId,
            user_id: userId,
            order_product_id: orderProductId,
            discount_amount: toNumber(discountAmount, 0),
            used_at: nowIso,
          },
          { onConflict: 'order_product_id' }
        )

      if (error) {
        await logWebhookEvent(supabase, {
          orderNumber,
          eventType: 'voucher_usage_create_failed',
          payload: { voucher_id: voucherId, voucher_code: voucherCode ?? null, error: error.message },
          success: false,
          errorMessage: error.message,
          processedAt: nowIso,
        })
        throw new Error(`Failed to record voucher usage: ${error.message}`)
      }

      return { ensured: true }
    },
  })
}

export async function releaseVoucherQuotaIfNeeded(params: {
  supabase: ServiceClient
  orderNumber: string
  voucherId: string | null
  voucherCode?: string | null
  nextStatus: string
  nowIso: string
}) {
  const { supabase, orderNumber, voucherId, voucherCode, nextStatus, nowIso } = params
  if (!voucherId) return { released: false, skipped: true }

  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: orderNumber,
    effectType: 'release_voucher_quota',
    effectKey: voucherId,
    skipResult: { released: false, skipped: true },
    metadataOnComplete: { voucher_id: voucherId, status: nextStatus, processed_at: nowIso },
    run: async () => {
      const { data: released, error: releaseError } = await supabase.rpc('release_voucher_quota', {
        p_voucher_id: voucherId,
      })

      await logWebhookEvent(supabase, {
        orderNumber,
        eventType: 'voucher_quota_released',
        payload: {
          voucher_id: voucherId,
          voucher_code: voucherCode ?? null,
          result: released,
          status: nextStatus,
          error: releaseError?.message,
        },
        success: !releaseError && released === true,
        errorMessage: releaseError?.message ?? (released === true ? null : 'Voucher quota release returned false'),
        processedAt: nowIso,
      })

      if (releaseError || released !== true) {
        throw new Error(releaseError?.message ?? 'Failed to release voucher quota')
      }

      return { released: true, skipped: false }
    },
  })
}

export async function ensureProductPaidSideEffects(params: {
  supabase: ServiceClient
  order: ProductOrder
  nowIso: string
  grossAmount?: unknown
  defaultStatus?: string
  shouldSetPaidAt?: boolean
}) {
  const { supabase, order, nowIso } = params
  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: order.order_number,
    effectType: 'ensure_paid_side_effects',
    skipResult: { pickupCode: order.pickup_code || '', finalStatus: String(order.status || 'processing') },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_product_items')
        .select('product_variant_id, quantity')
        .eq('order_product_id', order.id)

      if (orderItemsError) {
        throw new Error(`Failed to load product order items: ${orderItemsError.message}`)
      }

      let stockValidationFailed = false
      const stockIssues: string[] = []

      if (Array.isArray(orderItems)) {
        const variantIds = Array.from(
          new Set(
            orderItems
              .map((row) => Number((row as { product_variant_id: number | string }).product_variant_id))
              .filter((id) => id > 0)
          )
        )
        const { data: variantRows, error: variantRowsError } = variantIds.length
          ? await supabase.from('product_variants').select('id, stock, reserved_stock').in('id', variantIds)
          : { data: [] as unknown[], error: null }

        if (variantRowsError) {
          throw new Error(`Failed to load product variants for payment validation: ${variantRowsError.message}`)
        }

        const variantsById = new Map<number, { stock: number; reserved_stock: number }>()
        if (Array.isArray(variantRows)) {
          for (const v of variantRows) {
            const id = Number((v as { id?: number | string }).id ?? 0)
            if (!id) continue
            variantsById.set(id, {
              stock: Number((v as { stock?: unknown }).stock ?? 0),
              reserved_stock: Number((v as { reserved_stock?: unknown }).reserved_stock ?? 0),
            })
          }
        }

        for (const row of orderItems as ProductOrderItem[]) {
          const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
          const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))
          const variant = variantsById.get(variantId)
          if (!variant) continue
          const currentStock = variant.stock
          const currentReserved = variant.reserved_stock

          if (currentReserved < qty) {
            stockValidationFailed = true
            stockIssues.push(`Variant ${variantId}: reserved=${currentReserved}, needed=${qty}`)
          }

          if (currentStock < qty) {
            stockValidationFailed = true
            stockIssues.push(`Variant ${variantId}: stock=${currentStock}, needed=${qty}`)
          }
        }
      }

      const expectedTotal = toNumber(order.total, 0)
      const paidTotal = toNumber(params.grossAmount, 0)
      const amountMismatch =
        expectedTotal > 0 && paidTotal > 0 && Math.abs(expectedTotal - paidTotal) > 0.01

      if (stockValidationFailed) {
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'stock_validation_failed_requires_review',
          payload: {
            order_id: order.order_number,
            stock_issues: stockIssues,
            payment_completed_at: nowIso,
          },
          success: true,
          errorMessage: `Stock insufficient: ${stockIssues.join('; ')}`,
          processedAt: nowIso,
        })
      }

      if (amountMismatch) {
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'amount_mismatch_requires_review',
          payload: {
            expected_total: expectedTotal,
            gross_amount: paidTotal,
          },
          success: true,
          errorMessage: `Amount mismatch: expected ${expectedTotal}, got ${paidTotal}`,
          processedAt: nowIso,
        })
      }

      const baseStatus = params.defaultStatus || String(order.status || 'processing')
      const finalStatus = stockValidationFailed || amountMismatch ? 'requires_review' : baseStatus
      
      // Determine pickup_status based on delivery method
      // If shipping_courier exists and is not 'pickup', it's a shipping order
      const isShippingOrder = order.shipping_courier && order.shipping_courier !== 'pickup'
      const normalPickupStatus = isShippingOrder ? 'pending_shipment' : 'pending_pickup'
      const finalPickupStatus = stockValidationFailed || amountMismatch ? 'pending_review' : normalPickupStatus

      let pickupCode = order.pickup_code || ''
      if (!pickupCode) {
        const { data: pickupCodeRow, error: pickupCodeError } = await supabase.rpc('generate_pickup_code', {})
        if (pickupCodeError) {
          throw new Error(`Failed to generate pickup code: ${pickupCodeError.message}`)
        }
        pickupCode = String(pickupCodeRow || '')
        if (!pickupCode) {
          throw new Error('Failed to generate pickup code')
        }
      }

      const updateFields: Record<string, unknown> = {
        status: finalStatus,
        payment_status: 'paid',
        pickup_status: finalPickupStatus,
        updated_at: nowIso,
      }

      if (pickupCode) {
        updateFields.pickup_code = pickupCode
        if (!order.pickup_expires_at) {
          updateFields.pickup_expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      }

      if (params.shouldSetPaidAt) {
        updateFields.paid_at = nowIso
      }

      const { error: updateError } = await supabase.from('order_products').update(updateFields).eq('id', order.id)
      if (updateError) {
        throw new Error(`Failed to finalize paid product side effects: ${updateError.message}`)
      }

      // Award loyalty points: 20 points per item quantity (covers products + rentals)
      const userId = (order as unknown as { user_id?: string | null }).user_id ?? null
      if (userId && Array.isArray(orderItems) && orderItems.length > 0) {
        try {
          const totalQty = (orderItems as ProductOrderItem[]).reduce(
            (sum, row) => sum + Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity))),
            0
          )
          if (totalQty > 0) {
            const { error: pointsError } = await supabase.rpc('award_product_loyalty_points', {
              p_user_id: userId,
              p_order_product_id: order.id,
              p_total_quantity: totalQty,
              p_reason: 'Product/rental purchase reward',
            })
            if (pointsError) {
              console.error('[ensureProductPaidSideEffects] Error awarding product points:', pointsError.message)
            } else {
              console.log('[ensureProductPaidSideEffects] Loyalty points awarded for product order:', order.order_number, 'qty:', totalQty)
            }
          }
        } catch (pointsErr) {
          console.error('[ensureProductPaidSideEffects] Exception awarding product points:', pointsErr)
        }
      }

      return { pickupCode, finalStatus }
    },
  })
}


export async function releaseProductReservedStockIfNeeded(params: {
  supabase: ServiceClient
  order: ProductOrder
  nowIso: string
}) {
  const { supabase, order, nowIso } = params
  if (order.stock_released_at) return { released: false }

  return withPaymentEffectRun({
    supabase,
    scope: 'product_order',
    orderRef: order.order_number,
    effectType: 'release_reserved_stock',
    skipResult: { released: false },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      const { data: orderItems, error: orderItemsError } = await supabase
        .from('order_product_items')
        .select('product_variant_id, quantity')
        .eq('order_product_id', order.id)

      if (orderItemsError) {
        throw new Error(`Failed to load product order items for stock release: ${orderItemsError.message}`)
      }

      if (!Array.isArray(orderItems) || orderItems.length === 0) {
        return { released: false }
      }

      const qtyByVariantId = new Map<number, number>()
      for (const row of orderItems as ProductOrderItem[]) {
        const variantId = Number((row as { product_variant_id: number | string }).product_variant_id)
        const qty = Math.max(1, Math.floor(Number((row as { quantity: number | string }).quantity)))
        if (!variantId || qty <= 0) continue
        qtyByVariantId.set(variantId, (qtyByVariantId.get(variantId) ?? 0) + qty)
      }

      const variantIds = Array.from(qtyByVariantId.keys())
      const { data: variantRows, error: variantRowsError } = variantIds.length
        ? await supabase.from('product_variants').select('id, reserved_stock').in('id', variantIds)
        : { data: [] as unknown[], error: null }

      if (variantRowsError) {
        throw new Error(`Failed to load product variants for stock release: ${variantRowsError.message}`)
      }

      const reservedByVariantId = new Map<number, number>()
      if (Array.isArray(variantRows)) {
        for (const row of variantRows) {
          const variantId = Number((row as { id?: unknown }).id ?? 0)
          if (!variantId) continue
          reservedByVariantId.set(
            variantId,
            Math.max(0, Math.floor(Number((row as { reserved_stock?: unknown }).reserved_stock ?? 0)))
          )
        }
      }

      for (const [variantId, qty] of qtyByVariantId.entries()) {
        const releasableQty = Math.min(qty, reservedByVariantId.get(variantId) ?? 0)
        if (releasableQty <= 0) continue

        const { data: released, error: releaseError } = await supabase.rpc('release_product_stock', {
          p_variant_id: variantId,
          p_quantity: releasableQty,
        })

        if (releaseError || released !== true) {
          throw new Error(releaseError?.message ?? `Failed to release stock for variant ${variantId}`)
        }
      }

      const { error: markReleasedError } = await supabase
        .from('order_products')
        .update({ stock_released_at: nowIso, updated_at: nowIso })
        .eq('id', order.id)

      if (markReleasedError) {
        throw new Error(`Failed to mark product stock as released: ${markReleasedError.message}`)
      }

      return { released: true }
    },
  })
}

/**
 * Send WhatsApp invoice via Fonnte API after payment success
 * Uses Fonnte for flexible text-based invoicing (no templates required)
 * Handles duplicate prevention and error tracking
 */
export async function sendWhatsAppInvoiceViaFontneIfNeeded(params: {
  supabase: ServiceClient
  order: TicketOrder
  orderType?: 'ticket' | 'product'
  nowIso: string
}) {
  const { supabase, order, orderType = 'ticket', nowIso } = params

  return withPaymentEffectRun({
    supabase,
    scope: 'ticket_order',
    orderRef: order.order_number,
    effectType: 'send_whatsapp_invoice_fonnte',
    skipResult: { sent: false, skipped: true },
    metadataOnComplete: { order_id: order.id, processed_at: nowIso },
    run: async () => {
      // Get Fonnte token from environment (device token preferred, fallback to account token)
      let fontneToken = Deno.env.get('FONNTE_DEVICE_TOKEN')
      if (!fontneToken) {
        fontneToken = Deno.env.get('FONNTE_API_TOKEN')
      }
      
      if (!fontneToken) {
        console.log('[sendWhatsAppInvoiceViaFonnte] FONNTE_DEVICE_TOKEN or FONNTE_API_TOKEN not configured, skipping')
        return { sent: false, skipped: true, reason: 'fonnte_not_configured' }
      }

      // Fetch order with profile and details
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, order_number, user_id, status')
        .eq('id', order.id)
        .single()

      if (orderError || !orderData) {
        throw new Error(`Failed to fetch order details: ${orderError?.message}`)
      }

      const orderId = (orderData as { id: number }).id
      const userId = (orderData as { user_id: string | null }).user_id

      // Fetch user profile for phone and name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, phone_number')
        .eq('id', userId)
        .single()

      if (profileError || !profileData) {
        console.log('[sendWhatsAppInvoiceViaFonnte] Profile not found:', profileError?.message)
        return { sent: false, skipped: true, reason: 'profile_not_found' }
      }

      const customerName = (profileData as { full_name?: string }).full_name || 'Valued Customer'
      const customerPhone = (profileData as { phone_number?: string }).phone_number

      if (!customerPhone) {
        console.log('[sendWhatsAppInvoiceViaFonnte] Customer phone not found')
        return { sent: false, skipped: true, reason: 'no_phone_number' }
      }

      // Check if already sent (prevent duplicates)
      const { data: existingMessages, error: checkError } = await supabase
        .from('whatsapp_messages')
        .select('id, delivery_status')
        .eq('order_number', order.order_number)
        .neq('delivery_status', 'failed')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!checkError && Array.isArray(existingMessages) && existingMessages.length > 0) {
        console.log('[sendWhatsAppInvoiceViaFonnte] Message already sent:', order.order_number)
        return { sent: false, skipped: true, reason: 'already_sent' }
      }

      // Get booking date and time for ticket orders
      let bookingDate = new Date().toLocaleDateString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      let sessionTime = 'TBA'
      let quantity = 1

      if (orderType === 'ticket') {
        const { data: orderItemsData, error: itemsError } = await supabase
          .from('order_items')
          .select('selected_date, selected_time_slots, quantity')
          .eq('order_id', orderId)
          .limit(1)

        if (!itemsError && Array.isArray(orderItemsData) && orderItemsData.length > 0) {
          const firstItem = orderItemsData[0] as {
            selected_date: string
            selected_time_slots: unknown
            quantity: number
          }
          bookingDate = new Date(firstItem.selected_date).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })
          quantity = firstItem.quantity

          // Extract time from time slots
          const timeSlots = Array.isArray(firstItem.selected_time_slots)
            ? firstItem.selected_time_slots
            : []
          if (timeSlots.length > 0) {
            const firstSlot = String(timeSlots[0])
            const timeMatch = firstSlot.match(/^\d{2}:\d{2}/)
            if (timeMatch) {
              sessionTime = timeMatch[0]
            }
          }
        }
      }

      // Build invoice message using Fonnte format
      const invoiceMessage = buildInvoiceMessage({
        customerName,
        invoiceNumber: order.order_number,
        eventDate: bookingDate,
        eventTime: sessionTime,
        ticketQuantity: quantity,
        venueName: 'SPARK STAGE 55',
      })

      console.log('[sendWhatsAppInvoiceViaFonnte] Sending invoice to:', {
        customerName,
        phone: customerPhone.substring(0, 5) + '***',
        orderNumber: order.order_number,
      })

      // Send via Fonnte
      const result = await sendWhatsAppViaFonnte({
        deviceToken: fontneToken,
        destinationPhone: customerPhone,
        message: invoiceMessage,
      })

      // Log to whatsapp_messages table
      const deliveryStatus = result.success ? 'submitted' : 'failed'
      try {
        await supabase.from('whatsapp_messages').insert({
          order_id: orderId,
          order_number: order.order_number,
          customer_phone: customerPhone,
          customer_name: customerName,
          template_id: 'invoice_confirmation', // Label for Fonnte
          params: [customerName, order.order_number, bookingDate, sessionTime, quantity, 'SPARK STAGE 55'],
          booking_date: bookingDate,
          session_time: sessionTime,
          ticket_count: quantity,
          doku_message_id: result.messageId || null,
          provider_status: 'fonnte',
          sent_at: new Date().toISOString(),
          delivery_status: deliveryStatus,
          error_message: result.error || null,
        })
      } catch (logError) {
        console.error('[sendWhatsAppInvoiceViaFonnte] Failed to log message:', logError)
      }

      if (!result.success) {
        console.error('[sendWhatsAppInvoiceViaFonnte] Failed to send:', result.error)
        // Log to webhook_logs for tracking
        await logWebhookEvent(supabase, {
          orderNumber: order.order_number,
          eventType: 'whatsapp_invoice_fonnte_failed',
          payload: {
            phone: customerPhone.substring(0, 5) + '***',
            error: result.error,
            details: result.details,
          },
          success: false,
          errorMessage: result.error || 'Unknown error',
          processedAt: nowIso,
        })
        
        throw new Error(`Failed to send WhatsApp invoice: ${result.error}`)
      }

      console.log('[sendWhatsAppInvoiceViaFonnte] Invoice sent successfully:', {
        messageId: result.messageId,
        orderNumber: order.order_number,
      })

      return { sent: true, skipped: false, messageId: result.messageId }
    },
  })
}
