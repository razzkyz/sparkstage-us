import Stripe from "npm:stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/http.ts";
import { getPublicAppUrl } from "../_shared/env.ts";

function getStripeEnv() {
  const secretKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!secretKey) throw new Error("Missing env: STRIPE_SECRET_KEY");
  return { secretKey };
}

function getSupabaseEnv() {
  return {
    url: Deno.env.get("SUPABASE_URL")!,
    serviceRoleKey: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.slice(7);

    const supabaseEnv = getSupabaseEnv();
    const supabase = createClient(supabaseEnv.url, supabaseEnv.serviceRoleKey);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Parse Body ────────────────────────────────────────────────────────────
    const body = await req.json();
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      customerAddress,
      shippingCourier,
      shippingService,
      shippingCost,
      voucherCode,
      pointsRedeemed,
    } = body as {
      items: Array<{ productVariantId: number; name: string; price: number; quantity: number }>;
      customerName: string;
      customerEmail: string;
      customerPhone?: string;
      customerAddress?: string;
      shippingCourier?: string;
      shippingService?: string;
      shippingCost?: number;
      voucherCode?: string;
      pointsRedeemed?: number;
    };

    if (!items?.length) {
      return new Response(JSON.stringify({ error: "No items provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Validate stock & get prices from DB ───────────────────────────────────
    const variantIds = items.map((i) => i.productVariantId);
    const { data: variants, error: variantError } = await supabase
      .from("product_variants")
      .select("id, price, stock, name, products(name)")
      .in("id", variantIds);

    if (variantError) throw variantError;
    if (!variants?.length) throw new Error("Products not found");

    // ── Apply voucher discount if provided ────────────────────────────────────
    let discountAmount = 0;
    let voucherId: number | null = null;

    if (voucherCode) {
      const subtotalForVoucher = variants.reduce((sum, v) => {
        const item = items.find((i) => i.productVariantId === v.id);
        return sum + (v.price * (item?.quantity ?? 1));
      }, 0);

      const { data: voucherResult } = await supabase.rpc("validate_voucher", {
        p_code: voucherCode.trim().toUpperCase(),
        p_subtotal: subtotalForVoucher,
        p_category_ids: [],
      });

      const vResult = Array.isArray(voucherResult) ? voucherResult[0] : voucherResult;
      if (vResult && !vResult.error_message) {
        discountAmount = Number(vResult.discount_amount ?? 0);
        voucherId = vResult.voucher_id ?? null;
      }
    }

    // ── Points discount ───────────────────────────────────────────────────────
    const pointsDiscount = pointsRedeemed ?? 0;

    // ── Generate order number ─────────────────────────────────────────────────
    const timestamp = Date.now().toString(36).toUpperCase();
    const orderNumber = `PRD-${timestamp}`;

    // ── Calculate totals (prices in USD) ──────────────────────────────────────
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const variant = variants.find((v) => v.id === item.productVariantId);
      if (!variant) throw new Error(`Variant ${item.productVariantId} not found`);

      const product = variant.products as unknown as { name: string } | null;
      const productName = product?.name ?? item.name;

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${productName} - ${variant.name}`,
          },
          // Stripe expects price in cents
          unit_amount: Math.round(variant.price * 100),
        },
        quantity: item.quantity,
      };
    });

    // Add shipping line item if applicable
    const finalShippingCost = shippingCost ?? 0;
    if (finalShippingCost > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: `Shipping (${shippingCourier ?? "Standard"})` },
          unit_amount: Math.round(finalShippingCost * 100),
        },
        quantity: 1,
      });
    }

    // Add discount line item (negative) if applicable
    const totalDiscount = discountAmount + pointsDiscount;
    if (totalDiscount > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: { name: "Discount / Points" },
          unit_amount: -Math.round(totalDiscount * 100),
        },
        quantity: 1,
      });
    }

    // ── Create Stripe Checkout Session ────────────────────────────────────────
    const { secretKey } = getStripeEnv();
    const stripe = new Stripe(secretKey, { apiVersion: "2024-06-20" });

    const appUrl = getPublicAppUrl() ?? "https://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      customer_email: customerEmail,
      payment_method_types: ["card"],
      success_url: `${appUrl}/order/product/success/${orderNumber}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/checkout`,
      metadata: {
        order_number: orderNumber,
        user_id: user.id,
        customer_name: customerName,
        customer_phone: customerPhone ?? "",
        customer_address: customerAddress ?? "",
        shipping_courier: shippingCourier ?? "pickup",
        shipping_service: shippingService ?? "",
        shipping_cost: String(finalShippingCost),
        voucher_code: voucherCode ?? "",
        voucher_id: String(voucherId ?? ""),
        discount_amount: String(totalDiscount),
        points_redeemed: String(pointsDiscount),
      },
    });

    // ── Save pending order to DB ──────────────────────────────────────────────
    const subtotal = variants.reduce((sum, v) => {
      const item = items.find((i) => i.productVariantId === v.id);
      return sum + (v.price * (item?.quantity ?? 1));
    }, 0);
    const finalTotal = Math.max(0, subtotal - totalDiscount + finalShippingCost);

    const { error: orderError } = await supabase.from("product_orders").insert({
      order_number: orderNumber,
      user_id: user.id,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone ?? null,
      customer_address: customerAddress ?? null,
      shipping_courier: shippingCourier ?? "pickup",
      shipping_service: shippingService ?? null,
      shipping_cost: finalShippingCost,
      voucher_id: voucherId,
      voucher_code: voucherCode ?? null,
      discount_amount: totalDiscount,
      total: finalTotal,
      status: "pending",
      payment_status: "unpaid",
      payment_data: { stripe_session_id: session.id, stripe_session_url: session.url },
    });

    if (orderError) throw orderError;

    // ── Save order items ──────────────────────────────────────────────────────
    const orderItemsToInsert = items.map((item) => {
      const variant = variants.find((v) => v.id === item.productVariantId);
      return {
        order_number: orderNumber,
        product_variant_id: item.productVariantId,
        quantity: item.quantity,
        unit_price: variant?.price ?? item.price,
        subtotal: (variant?.price ?? item.price) * item.quantity,
      };
    });

    const { error: itemsError } = await supabase.from("product_order_items").insert(orderItemsToInsert);
    if (itemsError) throw itemsError;

    // ── Reserve stock ─────────────────────────────────────────────────────────
    for (const item of items) {
      await supabase.rpc("decrement_product_stock", {
        p_variant_id: item.productVariantId,
        p_quantity: item.quantity,
      }).maybeSingle();
    }

    return new Response(
      JSON.stringify({
        payment_url: session.url,
        order_number: orderNumber,
        stripe_session_id: session.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[create-stripe-checkout-session]", err);
    const message = err instanceof Error ? err.message : "Internal server error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
