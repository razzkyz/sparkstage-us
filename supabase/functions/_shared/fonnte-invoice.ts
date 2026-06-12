/**
 * Fonnte WhatsApp Integration for Ticket Invoice Notifications
 * This module handles sending invoice via Fonnte (no templates required)
 * Can be used as alternative or alongside DOKU
 */

import type { ServiceClient } from './supabase.ts'
import { sendWhatsAppViaFonnte, buildInvoiceMessage } from './fonnte.ts'
import { getFontneEnv } from './env.ts'

interface SendInvoiceParams {
  supabase: ServiceClient
  orderId: number
  orderNumber: string
  customerPhone: string
  customerName: string
  invoiceNumber: string
  eventDate: string
  eventTime: string
  ticketQuantity: number
  venueName?: string
  nowIso: string
}

interface SendInvoiceResult {
  success: boolean
  messageId?: string
  error?: string
}

/**
 * Send invoice via Fonnte WhatsApp
 * Logs to fonnte_whatsapp_logs table for tracking
 */
export async function sendInvoiceViaFonnte(
  params: SendInvoiceParams,
): Promise<SendInvoiceResult> {
  const {
    supabase,
    orderId,
    orderNumber,
    customerPhone,
    customerName,
    invoiceNumber,
    eventDate,
    eventTime,
    ticketQuantity,
    venueName = 'SPARK STAGE 55',
    nowIso,
  } = params

  try {
    const fontneEnv = getFontneEnv()

    if (!fontneEnv.isEnabled) {
      console.log('[Fonnte Invoice] Fonnte disabled in environment')
      return { success: false, error: 'Fonnte disabled' }
    }

    // Validate phone
    if (!customerPhone || !customerPhone.trim()) {
      console.warn('[Fonnte Invoice] No customer phone provided')
      return { success: false, error: 'No customer phone' }
    }

    // Build invoice message
    const message = buildInvoiceMessage({
      customerName,
      invoiceNumber,
      eventDate,
      eventTime,
      ticketQuantity,
      venueName,
    })

    console.log('[Fonnte Invoice] Sending invoice:', {
      orderNumber,
      customerPhone,
      invoiceNumber,
      messageLength: message.length,
    })

    // Send via Fonnte
    const result = await sendWhatsAppViaFonnte({
      deviceToken: fontneEnv.deviceToken,
      destinationPhone: customerPhone,
      message,
    })

    if (result.success) {
      console.log('[Fonnte Invoice] Invoice sent successfully:', {
        messageId: result.messageId,
        phone: customerPhone,
      })

      // Log to fonnte_whatsapp_logs table
      try {
        await supabase.from('fonnte_whatsapp_logs').insert({
          order_id: orderId,
          order_number: orderNumber,
          customer_phone: customerPhone.trim(),
          customer_name: customerName,
          invoice_number: invoiceNumber,
          message_type: 'invoice',
          fonnte_message_id: result.messageId || null,
          delivery_status: 'submitted',
          error_message: null,
          sent_at: nowIso,
          created_at: nowIso,
        })
      } catch (logError) {
        console.error('[Fonnte Invoice] Failed to log to fonnte_whatsapp_logs:', logError)
      }

      return {
        success: true,
        messageId: result.messageId,
      }
    } else {
      console.error('[Fonnte Invoice] Invoice send failed:', result.error)

      // Log failed attempt
      try {
        await supabase.from('fonnte_whatsapp_logs').insert({
          order_id: orderId,
          order_number: orderNumber,
          customer_phone: customerPhone.trim(),
          customer_name: customerName,
          invoice_number: invoiceNumber,
          message_type: 'invoice',
          delivery_status: 'failed',
          error_message: result.error || 'Unknown error',
          sent_at: nowIso,
          created_at: nowIso,
        })
      } catch (logError) {
        console.error('[Fonnte Invoice] Failed to log failure:', logError)
      }

      return {
        success: false,
        error: result.error,
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error('[Fonnte Invoice] Exception:', errorMessage)

    return {
      success: false,
      error: errorMessage,
    }
  }
}

/**
 * Check if invoice already sent to prevent duplicates
 */
export async function invoiceAlreadySent(
  supabase: ServiceClient,
  orderId: number,
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('fonnte_whatsapp_logs')
      .select('id')
      .eq('order_id', orderId)
      .eq('message_type', 'invoice')
      .eq('delivery_status', 'submitted')
      .limit(1)
      .single()

    if (error) {
      // Not found is expected
      return false
    }

    return !!data
  } catch (err) {
    console.error('[Fonnte Invoice] Error checking duplicate:', err)
    return false
  }
}

/**
 * Get invoice log for specific order
 */
export async function getInvoiceLog(
  supabase: ServiceClient,
  orderId: number,
) {
  try {
    const { data, error } = await supabase
      .from('fonnte_whatsapp_logs')
      .select('*')
      .eq('order_id', orderId)
      .eq('message_type', 'invoice')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      return null
    }

    return data
  } catch (err) {
    console.error('[Fonnte Invoice] Error getting log:', err)
    return null
  }
}
