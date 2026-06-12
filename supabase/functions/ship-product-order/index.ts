import { serve } from "../_shared/deps.ts";
import {
  handleCors,
  json,
  jsonError,
  jsonErrorWithDetails,
} from "../_shared/http.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { requireAuthenticatedRequest } from "../_shared/auth.ts";

type ShipOrderRequest = {
  orderNumber: string;
  trackingNumber: string;
};

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const authResult = await requireAuthenticatedRequest(req);
    if (authResult.response) return authResult.response;

    const auth = authResult.context!;

    // Create service client with SERVICE ROLE KEY
    const supabase = createServiceClient(
      auth.supabaseEnv.url,
      auth.supabaseEnv.serviceRoleKey,
    );

    // Check if user is admin
    const { data: roleData, error: roleError } = await supabase
      .from("user_role_assignments")
      .select("role")
      .eq("user_id", auth.user.id)
      .in("role", ["admin", "super_admin"])
      .single();

    if (roleError || !roleData) {
      return jsonError(req, 403, "Admin access required");
    }

    const payload = (await req.json()) as ShipOrderRequest;
    const orderNumber = String(payload.orderNumber || "").trim();
    const trackingNumber = String(payload.trackingNumber || "")
      .trim()
      .toUpperCase();

    if (!orderNumber) {
      return jsonError(req, 400, "Order number required");
    }

    if (!trackingNumber) {
      return jsonError(req, 400, "Tracking number required");
    }

    if (trackingNumber.length < 8) {
      return jsonError(req, 400, "Tracking number too short (min 8 characters)");
    }

    // Fetch order
    const { data: order, error: orderError } = await supabase
      .from("order_products")
      .select("id, order_number, payment_status, status, shipping_courier, tracking_number")
      .eq("order_number", orderNumber)
      .single();

    if (orderError || !order) {
      console.error("[ship-product-order] Order not found:", orderError);
      return jsonError(req, 404, "Order not found");
    }

    // Validate order state
    if (order.payment_status !== "paid") {
      return jsonError(req, 400, "Order must be paid before shipping");
    }

    if (!order.shipping_courier) {
      return jsonError(req, 400, "Order is pickup only (no shipping)");
    }

    if (order.tracking_number) {
      return jsonError(req, 400, `Order already shipped with tracking: ${order.tracking_number}`);
    }

    // Update order with tracking number and shipped_at timestamp
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("order_products")
      .update({
        tracking_number: trackingNumber,
        shipped_at: now,
        status: "shipped", // Update status to shipped
        updated_at: now,
      })
      .eq("id", order.id);

    if (updateError) {
      console.error("[ship-product-order] Failed to update order:", updateError);
      return jsonErrorWithDetails(req, 500, {
        error: "Failed to update order",
        code: "UPDATE_FAILED",
        details: updateError.message,
      });
    }

    console.log(`[ship-product-order] Order ${orderNumber} marked as shipped with tracking: ${trackingNumber}`);

    // TODO: Send WhatsApp notification with tracking number to customer
    // Can call send-whatsapp-invoice function or similar notification service

    return json(req, {
      success: true,
      order_number: orderNumber,
      tracking_number: trackingNumber,
      shipped_at: now,
    });
  } catch (error) {
    console.error("[ship-product-order] Error:", error);
    return jsonError(
      req,
      500,
      error instanceof Error ? error.message : "Internal server error",
    );
  }
});
