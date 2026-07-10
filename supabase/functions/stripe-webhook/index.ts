import Stripe from "npm:stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/http.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

  if (!stripeSecret || !webhookSecret) {
    console.error("[stripe-webhook] Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Config error", { status: 500 });
  }

  const stripe = new Stripe(stripeSecret, { apiVersion: "2024-06-20" });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    console.error("[stripe-webhook] Signature verification failed:", err);
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  console.log("[stripe-webhook] Received event:", event.type);

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const orderNumber = session.metadata?.order_number;

    if (!orderNumber) {
      console.error("[stripe-webhook] No order_number in metadata");
      return new Response("ok");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check current order status
    const { data: order } = await supabase
      .from("product_orders")
      .select("id, payment_status, user_id, total, voucher_id, voucher_code, discount_amount")
      .eq("order_number", orderNumber)
      .single();

    if (!order) {
      console.error("[stripe-webhook] Order not found:", orderNumber);
      return new Response("ok");
    }

    if (order.payment_status === "paid") {
      console.log("[stripe-webhook] Order already paid, skipping:", orderNumber);
      return new Response("ok");
    }

    // Mark order as paid
    const { error: updateError } = await supabase
      .from("product_orders")
      .update({
        status: "paid",
        payment_status: "paid",
        paid_at: new Date().toISOString(),
        payment_data: {
          provider: "stripe",
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent,
          amount_total: session.amount_total,
          currency: session.currency,
          paid_at: new Date().toISOString(),
        },
      })
      .eq("order_number", orderNumber);

    if (updateError) {
      console.error("[stripe-webhook] Failed to update order:", updateError);
      return new Response("DB update failed", { status: 500 });
    }

    // Mark voucher as used if applicable
    if (order.voucher_code) {
      await supabase.rpc("use_voucher", { p_code: order.voucher_code, p_user_id: order.user_id })
        .maybeSingle()
        .catch((e: unknown) => console.error("[stripe-webhook] use_voucher error:", e));
    }

    console.log("[stripe-webhook] ✅ Order marked as paid:", orderNumber);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
});
