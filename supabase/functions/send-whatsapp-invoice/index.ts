import { serve } from "../_shared/deps.ts";
import { getCorsHeaders, handleCors, jsonErrorWithDetails } from "../_shared/http.ts";
import { getSupabaseEnv } from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import {
  sendWhatsAppViaFonnte,
  buildInvoiceMessage,
  type SendWhatsAppResult,
} from "../_shared/fonnte.ts";

/**
 * Edge Function: Send WhatsApp invoice confirmation
 * 
 * Triggered by:
 * - POST from payment webhook after successful payment
 * - Manual triggering via API
 * 
 * Handles:
 * - Phone number normalization
 * - Duplicate prevention (checks if already sent)
 * - Error handling and logging
 * - Message persistence to whatsapp_messages table
 * 
 * Request body:
 * {
 *   "orderNumber": "TKT-240513-ABC123",
 *   "orderType": "ticket" | "product", // Optional, defaults to ticket
 *   "forceSend": false // Optional, skip duplicate check
 * }
 */

interface WhatsAppInvoiceParams {
  orderNumber: string;
  orderType?: "ticket" | "product";
  forceSend?: boolean;
}

interface TicketOrderData {
  id: number;
  order_number: string;
  user_id: string;
  status: string;
}

interface ProfileData {
  id: string;
  full_name?: string;
  phone_number?: string;
}

interface OrderItemData {
  selected_date: string;
  selected_time_slots: unknown;
  quantity: number;
  id?: number;
}

interface PurchasedTicketData {
  ticket_code: string;
  id: number;
}

interface UserData {
  id: string;
  email: string;
}

interface WhatsAppMessageRow {
  id: number;
  order_number: string;
  delivery_status: string;
  sent_at: string | null;
}

async function getTicketOrderDetails(
  supabase: ReturnType<typeof createServiceClient>,
  orderNumber: string,
): Promise<{
  order: TicketOrderData | null;
  profile: ProfileData | null;
  orderItem: OrderItemData | null;
  ticketCode?: string;
  error?: string;
}> {
  // Fetch order
  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("id, order_number, user_id, status")
    .eq("order_number", orderNumber)
    .single();

  if (orderError || !orderData) {
    return {
      order: null,
      profile: null,
      orderItem: null,
      error: orderError?.message || "Order not found",
    };
  }

  const order = orderData as TicketOrderData;

  // Fetch user profile
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number")
    .eq("id", order.user_id)
    .single();

  if (profileError) {
    console.error("[WhatsApp] Profile fetch error:", profileError);
  }

  const profile = (profileData as ProfileData | null) || null;

  // Fetch first order item for date/time info
  const { data: orderItemsData, error: orderItemError } = await supabase
    .from("order_items")
    .select("id, selected_date, selected_time_slots, quantity")
    .eq("order_id", order.id)
    .limit(1);

  if (orderItemError) {
    console.error("[WhatsApp] Order items fetch error:", orderItemError);
  }

  const orderItem = (Array.isArray(orderItemsData) && orderItemsData.length > 0
    ? (orderItemsData[0] as OrderItemData)
    : null) || null;

  // Fetch first ticket code from purchased_tickets
  let ticketCode: string | undefined;
  if (orderItem && orderItem.id) {
    const { data: ticketData, error: ticketError } = await supabase
      .from("purchased_tickets")
      .select("ticket_code")
      .eq("order_item_id", orderItem.id)
      .limit(1);

    if (ticketError) {
      console.error("[WhatsApp] Ticket code fetch error:", ticketError);
    }

    if (Array.isArray(ticketData) && ticketData.length > 0) {
      ticketCode = (ticketData[0] as PurchasedTicketData).ticket_code;
    }
  }

  return { order, profile, orderItem, ticketCode };
}

async function getProductOrderDetails(
  supabase: ReturnType<typeof createServiceClient>,
  orderNumber: string,
): Promise<{
  order: { id: number; order_number: string; user_id: string; status: string } | null;
  profile: ProfileData | null;
  error?: string;
}> {
  // Fetch product order
  const { data: orderData, error: orderError } = await supabase
    .from("order_products")
    .select("id, order_number, user_id, status")
    .eq("order_number", orderNumber)
    .single();

  if (orderError || !orderData) {
    return {
      order: null,
      profile: null,
      error: orderError?.message || "Product order not found",
    };
  }

  const order = orderData as {
    id: number;
    order_number: string;
    user_id: string;
    status: string;
  };

  // Fetch user profile
  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone_number")
    .eq("id", order.user_id)
    .single();

  if (profileError) {
    console.error("[WhatsApp] Profile fetch error:", profileError);
  }

  const profile = (profileData as ProfileData | null) || null;

  return { order, profile };
}

function extractTimeFromSlot(timeSlot: unknown): string {
  if (typeof timeSlot === "string" && /^\d{2}:\d{2}/.test(timeSlot)) {
    return timeSlot.substring(0, 5);
  }
  return "TBA";
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("id-ID", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateString;
  }
}

async function checkIfAlreadySent(
  supabase: ReturnType<typeof createServiceClient>,
  orderNumber: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("whatsapp_messages")
    .select("id, delivery_status")
    .eq("order_number", orderNumber)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[WhatsApp] Error checking duplicate:", error);
    return false;
  }

  if (!Array.isArray(data) || data.length === 0) {
    return false;
  }

  const lastMessage = data[0] as WhatsAppMessageRow;
  // Consider already sent if delivery_status is not 'failed'
  return lastMessage.delivery_status !== "failed" && lastMessage.delivery_status !== null;
}

async function saveWhatsAppMessage(
  supabase: ReturnType<typeof createServiceClient>,
  params: {
    orderId: number;
    orderNumber: string;
    customerPhone: string;
    customerName: string;
    invoiceNumber: string;
    ticketCode?: string;
    bookingDate: string;
    sessionTime: string;
    quantity: number;
    fontneMessageId: string;
    deliveryStatus: string;
    errorMessage?: string;
  },
): Promise<void> {
  try {
    const { error } = await supabase.from("whatsapp_messages").insert({
      order_id: params.orderId,
      order_number: params.orderNumber,
      customer_phone: params.customerPhone,
      customer_name: params.customerName,
      template_id: "invoice_confirmation", // For Fonnte, template_id is just a label
      params: [
        params.customerName,
        params.invoiceNumber,
        params.bookingDate,
        params.sessionTime,
        params.quantity,
        "SPARK STAGE 55",
      ],
      ticket_code: params.ticketCode || null,
      booking_date: params.bookingDate,
      session_time: params.sessionTime,
      ticket_count: params.quantity,
      doku_message_id: params.fontneMessageId,
      provider_status: "fonnte",
      sent_at: new Date().toISOString(),
      delivery_status: params.deliveryStatus,
      error_message: params.errorMessage || null,
    });

    if (error) {
      console.error("[WhatsApp] Failed to log message:", error);
    } else {
      console.log("[WhatsApp] Message logged successfully");
    }
  } catch (err) {
    console.error("[WhatsApp] Exception logging message:", err);
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req, { allowAllOrigins: true });
  if (corsResponse) return corsResponse;
  const corsHeaders = getCorsHeaders(req, { allowAllOrigins: true });

  try {
    // Only allow POST
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = getSupabaseEnv();
    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // Fonnte token check removed. n8n will handle WhatsApp delivery.

    // Parse request body
    const body = (await req.json()) as WhatsAppInvoiceParams;
    const { orderNumber, orderType = "ticket", forceSend = false } = body;

    if (!orderNumber || typeof orderNumber !== "string") {
      return jsonErrorWithDetails(
        req,
        400,
        {
          error: "Invalid request: missing or invalid orderNumber",
          code: "INVALID_REQUEST",
        },
        { allowAllOrigins: true },
      );
    }

    console.log("[WhatsApp] Processing invoice send for:", {
      orderNumber,
      orderType,
      forceSend,
    });

    // Fetch order and profile details
    let order: { id: number; order_number: string; user_id: string; status: string } | null =
      null;
    let profile: ProfileData | null = null;
    let bookingDate = "";
    let sessionTime = "";
    let ticketCode = "";
    let quantity = 1;

    if (orderType === "ticket") {
      const ticketDetails = await getTicketOrderDetails(supabase, orderNumber);
      if (ticketDetails.error) {
        return jsonErrorWithDetails(
          req,
          404,
          {
            error: ticketDetails.error,
            code: "ORDER_NOT_FOUND",
          },
          { allowAllOrigins: true },
        );
      }

      order = ticketDetails.order;
      profile = ticketDetails.profile;
      ticketCode = ticketDetails.ticketCode || "";

      if (ticketDetails.orderItem) {
        bookingDate = formatDate(ticketDetails.orderItem.selected_date);
        sessionTime = extractTimeFromSlot(
          Array.isArray(ticketDetails.orderItem.selected_time_slots)
            ? (ticketDetails.orderItem.selected_time_slots as unknown[])[0]
            : ticketDetails.orderItem.selected_time_slots,
        );
        quantity = ticketDetails.orderItem.quantity;
      }
    } else {
      const productDetails = await getProductOrderDetails(supabase, orderNumber);
      if (productDetails.error) {
        return jsonErrorWithDetails(
          req,
          404,
          {
            error: productDetails.error,
            code: "ORDER_NOT_FOUND",
          },
          { allowAllOrigins: true },
        );
      }

      order = productDetails.order;
      profile = productDetails.profile;
      bookingDate = new Date().toLocaleDateString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    }

    if (!order || !profile) {
      return jsonErrorWithDetails(
        req,
        404,
        {
          error: "Order or profile not found",
          code: "DATA_NOT_FOUND",
        },
        { allowAllOrigins: true },
      );
    }

    // Check phone number
    const phoneNumber = profile.phone_number;
    if (!phoneNumber) {
      return jsonErrorWithDetails(
        req,
        400,
        {
          error: "Customer phone number not found",
          code: "NO_PHONE_NUMBER",
        },
        { allowAllOrigins: true },
      );
    }

    // Prevent duplicate sends
    if (!forceSend) {
      const alreadySent = await checkIfAlreadySent(supabase, orderNumber);
      if (alreadySent) {
        console.log("[WhatsApp] Message already sent (skipping duplicate):", orderNumber);
        await saveWhatsAppMessage(supabase, {
          orderId: order.id,
          orderNumber: order.order_number,
          customerPhone: phoneNumber,
          customerName: profile.full_name || "Valued Customer",
          invoiceNumber: orderNumber,
          ticketCode,
          bookingDate,
          sessionTime,
          quantity,
          fontneMessageId: `skipped_duplicate_${Date.now()}`,
          deliveryStatus: "skipped",
          errorMessage: "Already sent previously",
        });

        return new Response(
          JSON.stringify({
            status: "skipped",
            message: "Message already sent previously",
            orderNumber,
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    // Build invoice message
    const customerName = profile.full_name || "Valued Customer";
    const invoiceMessage = buildInvoiceMessage({
      customerName,
      invoiceNumber: orderNumber,
      eventDate: bookingDate,
      eventTime: sessionTime,
      ticketQuantity: quantity,
      venueName: "SPARK STAGE 55",
    });

    console.log("[WhatsApp] Built invoice message:", {
      customerName,
      orderNumber,
      phoneNumber: phoneNumber.substring(0, 5) + "***",
      messageLength: invoiceMessage.length,
    });

    // Send via n8n Webhook
    let n8nSuccess = false;
    let n8nError = "";
    let n8nMessageId = `n8n_${Date.now()}`;
    
    try {
      const n8nPayload = {
        customer_name: customerName,
        phone_number: phoneNumber,
        invoice_number: orderNumber,
        visit_date: bookingDate,
        visit_time: sessionTime,
        payment_status: "PAID",
        ticket_code: ticketCode
      };

      const n8nWebhookUrl = "https://sparkland.app.n8n.cloud/webhook/spark-stage-paid-ticket";
      const response = await fetch(n8nWebhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(n8nPayload),
      });

      if (response.ok) {
        n8nSuccess = true;
        console.log("[WhatsApp] Successfully sent payload to n8n webhook");
      } else {
        const errText = await response.text();
        n8nError = `n8n API Error: ${response.status} - ${errText}`;
        console.error("[WhatsApp]", n8nError);
      }
    } catch (err) {
      n8nError = err instanceof Error ? err.message : String(err);
      console.error("[WhatsApp] Exception calling n8n webhook:", n8nError);
    }

    // Save WhatsApp message record regardless of result
    const deliveryStatus = n8nSuccess ? "submitted" : "failed";
    await saveWhatsAppMessage(supabase, {
      orderId: order.id,
      orderNumber: order.order_number,
      customerPhone: phoneNumber,
      customerName: customerName,
      invoiceNumber: orderNumber,
      ticketCode,
      bookingDate,
      sessionTime,
      quantity,
      fontneMessageId: n8nSuccess ? n8nMessageId : `n8n_error_${Date.now()}`,
      deliveryStatus,
      errorMessage: n8nError || undefined,
    });

    if (!n8nSuccess) {
      console.error("[WhatsApp] Failed to trigger n8n webhook:", {
        error: n8nError,
        orderNumber,
      });

      return jsonErrorWithDetails(
        req,
        500,
        {
          error: "Failed to trigger n8n webhook",
          code: "SEND_FAILED",
          details: {
            n8n_error: n8nError,
          },
        },
        { allowAllOrigins: true },
      );
    }

    console.log("[WhatsApp] Invoice sent successfully via n8n:", {
      orderNumber,
      messageId: n8nMessageId,
      phoneNumber: phoneNumber.substring(0, 5) + "***",
    });

    return new Response(
      JSON.stringify({
        status: "success",
        message: "WhatsApp invoice sent successfully",
        orderNumber,
        messageId: fontneResult.messageId,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[WhatsApp] Unexpected error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return jsonErrorWithDetails(
      req,
      500,
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: errorMessage,
      },
      { allowAllOrigins: true },
    );
  }
});
