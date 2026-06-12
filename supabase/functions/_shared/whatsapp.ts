interface WhatsAppMessageParams {
  destinationPhone: string;
  templateId: string;
  params: string[];
}

interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  details?: Record<string, unknown>;
}

/**
 * Generate DOKU API signature for WhatsApp message requests
 * Using Web Crypto API (built-in, no external imports needed)
 * Based on DOKU's generate-signature documentation
 */
async function generateDokuSignature(params: {
  clientId: string;
  secretKey: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  body: string;
}): Promise<string> {
  const { clientId, secretKey, requestId, requestTimestamp, requestTarget, body } = params;

  // Build the canonical request: ClientId + RequestId + RequestTimestamp + RequestTarget + Body
  const canonicalRequest = `${clientId}${requestId}${requestTimestamp}${requestTarget}${body}`;

  // Encode secret key and canonical request as bytes
  const secretKeyBytes = new TextEncoder().encode(secretKey);
  const canonicalRequestBytes = new TextEncoder().encode(canonicalRequest);

  // Create HMAC key
  const key = await crypto.subtle.importKey(
    "raw",
    secretKeyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // Generate signature
  const signatureBytes = await crypto.subtle.sign("HMAC", key, canonicalRequestBytes);

  // Convert to hex string
  const signatureArray = Array.from(new Uint8Array(signatureBytes));
  const signatureHex = signatureArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");

  return signatureHex;
}

/**
 * Generate a unique request ID for DOKU API
 */
function generateRequestId(): string {
  const chars = "0123456789abcdef";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * 16));
  }
  return result;
}

/**
 * Generate epoch timestamp in milliseconds
 */
function generateRequestTimestamp(): string {
  return Date.now().toString();
}

/**
 * Normalize phone number for WhatsApp (remove non-numeric characters, ensure country code)
 * Expects format like: +62821234567 or 0821234567 (Indonesia)
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters
  const cleaned = phone.replace(/\D/g, "");

  // Handle Indonesian numbers (starts with 0 or 62)
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
 * Send WhatsApp message via DOKU Message Service
 */
export async function sendWhatsAppMessage(params: {
  clientId: string;
  secretKey: string;
  isProduction: boolean;
  templateId: string;
  destinationPhone: string;
  params: string[];
}): Promise<WhatsAppSendResult> {
  const { clientId, secretKey, isProduction, templateId, destinationPhone, params: messageParams } = params;

  const baseUrl = isProduction
    ? "https://app.doku.com"
    : "https://app-uat.doku.com";
  const requestTarget = "/message-as-a-service/v1/whatsapp/messages";
  const url = `${baseUrl}${requestTarget}`;

  // Normalize phone number
  const normalizedPhone = normalizePhoneNumber(destinationPhone);

  // Prepare request
  const requestId = generateRequestId();
  const requestTimestamp = generateRequestTimestamp();
  const body = JSON.stringify({
    templateId,
    params: messageParams,
    destinationPhone: normalizedPhone,
  });

  // Generate signature
  const signature = await generateDokuSignature({
    clientId,
    secretKey,
    requestId,
    requestTimestamp,
    requestTarget,
    body,
  });

  // Build headers
  const headers = new Headers({
    "Content-Type": "application/json",
    "Client-Id": clientId,
    "Request-Timestamp": requestTimestamp,
    "Request-Id": requestId,
    "Signature": signature,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body,
    });

    const responseText = await response.text();
    let responseData: Record<string, unknown> | null = null;

    try {
      responseData = JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      // Response is not JSON
    }

    if (!response.ok) {
      console.error("[WhatsApp] Send failed:", {
        status: response.status,
        statusText: response.statusText,
        body: responseData ?? responseText,
      });

      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        details: responseData ?? { raw: responseText },
      };
    }

    // Check for success response
    const status = (responseData as any)?.status;
    const messageId = (responseData as any)?.messageId;

    if (status === "submitted" && messageId) {
      console.log("[WhatsApp] Message sent successfully:", {
        messageId,
        destinationPhone: normalizedPhone,
        templateId,
      });

      return {
        success: true,
        messageId,
      };
    }

    // Unexpected response format
    console.error("[WhatsApp] Unexpected response:", responseData);
    return {
      success: false,
      error: "Unexpected response format",
      details: responseData ?? { raw: responseText },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[WhatsApp] Network error:", errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Build template parameters for ticket confirmation message
 */
export function buildTicketConfirmationParams(params: {
  customerName: string;
  invoiceNumber: string;
  bookingDate: string;
  sessionTime: string;
  ticketCount: number;
  venueName: string;
}): string[] {
  return [
    params.customerName || "Guest",
    params.invoiceNumber || "Unknown",
    params.bookingDate || "",
    params.sessionTime || "",
    String(params.ticketCount || 0),
    params.venueName || "SPARK STAGE 55",
  ];
}
