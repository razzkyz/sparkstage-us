/**
 * Fonnte WhatsApp API helper for sending invoice messages
 * No templates needed - flexible text messaging
 * Docs: https://fonnte.com/api
 * 
 * Features:
 * - Send text messages without templates
 * - Support for emojis and special characters
 * - Phone number normalization (Indonesian format)
 * - Comprehensive error handling
 * - Response logging for debugging
 */

export interface FontneResponse {
  status: boolean;
  message: string;
  data?: {
    id?: string;
  };
}

export interface SendWhatsAppViaFontneParams {
  deviceToken: string;
  destinationPhone: string;
  message: string;
}

export interface SendWhatsAppResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Send WhatsApp message via Fonnte (for invoices, reminders, etc)
 * No templates needed - just send text directly
 * Supports: text, links, emojis
 * 
 * @param params - SendWhatsAppViaFontneParams
 * @returns SendWhatsAppResult with success status and message ID
 */
export async function sendWhatsAppViaFonnte(
  params: SendWhatsAppViaFontneParams,
): Promise<SendWhatsAppResult> {
  const { deviceToken, destinationPhone, message } = params;

  const baseUrl = "https://api.fonnte.com";
  const url = `${baseUrl}/send`;

  // Normalize phone number (Fonnte accepts numeric only or +62 format)
  const normalizedPhone = normalizePhoneForFonnte(destinationPhone);

  const payload = new URLSearchParams();
  payload.append("target", normalizedPhone);
  payload.append("message", message);
  payload.append("delay", "0");
  payload.append("typing", "false");

  try {
    console.log("[Fonnte] Sending message to:", normalizedPhone.substring(0, 5) + "***");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: deviceToken,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: payload.toString(),
    });

    const responseText = await response.text();
    let responseData: FontneResponse | null = null;

    try {
      responseData = JSON.parse(responseText) as FontneResponse;
    } catch {
      // Response might not be JSON
    }

    if (!response.ok) {
      console.error("[Fonnte] Send failed:", {
        status: response.status,
        statusText: response.statusText,
        phone: normalizedPhone.substring(0, 5) + "***",
        body: responseData ?? responseText,
      });

      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: responseData ?? { raw: responseText },
      };
    }

    // Check Fonnte success response
    if (!responseData?.status) {
      console.error("[Fonnte] API returned error:", responseData?.message);
      return {
        success: false,
        error: responseData?.message || "Unknown Fonnte error",
        details: responseData,
      };
    }

    const messageId = responseData.data?.id || `fonnte_${Date.now()}`;

    console.log("[Fonnte] Message sent successfully:", {
      phone: normalizedPhone.substring(0, 5) + "***",
      messageId,
    });

    return {
      success: true,
      messageId,
      details: responseData,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error("[Fonnte] Exception:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Normalize phone number for Fonnte
 * Accepts: 08..., +62..., 62..., or numeric only
 * Returns: numeric string suitable for Fonnte
 */
function normalizePhoneForFonnte(phone: string): string {
  // Remove all non-numeric characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");

  // Handle Indonesian numbers
  if (cleaned.startsWith("0")) {
    // Remove leading 0 and add country code 62
    return "62" + cleaned.substring(1);
  } else if (cleaned.startsWith("62")) {
    // Already has country code
    return cleaned;
  } else if (cleaned.startsWith("8")) {
    // Assume Indonesia if starts with 8
    return "62" + cleaned;
  }

  // Return as-is if format unclear
  return cleaned;
}

/**
 * Build invoice message with dynamic parameters
 * Matches the exact format specified in requirements
 */
export function buildInvoiceMessage(params: {
  customerName: string;
  invoiceNumber: string;
  eventDate: string;
  eventTime: string;
  ticketQuantity: number;
  venueName?: string;
}): string {
  const {
    customerName,
    invoiceNumber,
    eventDate,
    eventTime,
    ticketQuantity,
    venueName = "SPARK STAGE 55",
  } = params;

  return `Halo ${customerName}!

Booking kamu berhasil dengan invoice
${invoiceNumber}

Tanggal: ${eventDate}
Jam: ${eventTime}
Qty: ${ticketQuantity}
Venue: ${venueName}

Terima Kasih! 🎉`;
}

/**
 * Build reminder message
 */
export function buildTicketReminderMessage(params: {
  customerName: string;
  ticketCode: string;
  eventDate: string;
  eventTime: string;
  venueName?: string;
}): string {
  const { customerName, ticketCode, eventDate, eventTime, venueName = "SPARK STAGE 55" } = params;

  return `Halo ${customerName}! 👋

Reminder: Acara kamu besok!

📋 Kode Tiket: ${ticketCode}
📅 Tanggal: ${eventDate}
🕐 Jam: ${eventTime}
📍 Tempat: ${venueName}

Jangan lupa datang tepat waktu ya! Sampai jumpa di sana! 🎉`;
}

/**
 * Build expiry warning message
 */
export function buildTicketExpiryWarningMessage(params: {
  customerName: string;
  ticketCode: string;
  expiryTime: string;
}): string {
  const { customerName, ticketCode, expiryTime } = params;

  return `Halo ${customerName}!

⚠️ PERINGATAN: Tiket kamu akan expired dalam ${expiryTime}

🎫 Kode Tiket: ${ticketCode}

Segera gunakan atau bisa ditukar dengan jam yang berbeda. Hubungi customer service jika ada pertanyaan.`;
}
