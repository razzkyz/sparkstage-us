import { serve } from "../_shared/deps.ts";
import {
  assertDokuCheckoutModeGuard,
  buildDokuRequestHeaders,
  createDokuRequestId,
  createDokuRequestTimestamp,
  extractDokuCheckoutResponse,
  fetchDokuOrderStatus,
  getDokuApiBaseUrl,
  getDokuCheckoutPath,
  getDokuCheckoutSdkUrl,
  mergeDokuPaymentData,
  sanitizeDokuString,
  summarizeDokuHttpResponse,
} from "../_shared/doku.ts";
import {
  handleCors,
  json,
  jsonError,
  jsonErrorWithDetails,
} from "../_shared/http.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import {
  getAllowedAppOrigins,
  getDokuEnv,
  getPublicAppUrl,
} from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { toNumber } from "../_shared/payment-effects.ts";
import { requireAuthenticatedRequest } from "../_shared/auth.ts";

type ProductItem = {
  productVariantId: number;
  name: string;
  price: number;
  quantity: number;
};

type CreateTokenRequest = {
  items: ProductItem[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string; // Shipping address for delivery orders
  shippingProvinceId?: string; // RajaOngkir province ID
  shippingCityId?: string; // RajaOngkir city ID
  shippingSubdistrictId?: string; // RajaOngkir subdistrict ID
  shippingCourier?: string; // Courier code: jne, tiki, pos, etc.
  shippingService?: string; // Service type: REG, YES, OKE, etc.
  shippingCost?: number; // Calculated shipping cost
  voucherCode?: string; // NEW: Optional voucher code for discount
  pointsRedeemed?: number; // NEW: Optional loyalty points to redeem (1 point = Rp 1 discount)
};

type ReservedProductAdjustment = {
  variantId: number;
  quantity: number;
};

async function releaseReservedProductResources(params: {
  supabase: ReturnType<typeof createServiceClient>;
  voucherId: string | null;
  reservedAdjustments: ReservedProductAdjustment[];
}) {
  if (params.voucherId) {
    const { error } = await params.supabase.rpc("release_voucher_quota", {
      p_voucher_id: params.voucherId,
    });
    if (error) {
      console.error(
        "[create-doku-product-checkout] Failed to release voucher quota:",
        error,
      );
    }
  }

  for (const adjustment of params.reservedAdjustments) {
    const { error } = await params.supabase.rpc("release_product_stock", {
      p_variant_id: adjustment.variantId,
      p_quantity: adjustment.quantity,
    });

    if (error) {
      console.error(
        "[create-doku-product-checkout] Failed to release reserved stock:",
        error,
      );
    }
  }
}

async function rollbackCreatedProductOrder(params: {
  supabase: ReturnType<typeof createServiceClient>;
  orderId: number;
  voucherId: string | null;
  reservedAdjustments: ReservedProductAdjustment[];
}) {
  await params.supabase.from("order_product_items").delete().eq(
    "order_product_id",
    params.orderId,
  );
  await params.supabase.from("order_products").delete().eq(
    "id",
    params.orderId,
  );
  await releaseReservedProductResources({
    supabase: params.supabase,
    voucherId: params.voucherId,
    reservedAdjustments: params.reservedAdjustments,
  });
}

async function persistProductPaymentData(params: {
  supabase: ReturnType<typeof createServiceClient>;
  orderId: number;
  paymentData: Record<string, unknown>;
  paymentUrl?: string | null;
}) {
  const updateFields: Record<string, unknown> = {
    payment_data: params.paymentData,
    updated_at: new Date().toISOString(),
  };

  if (typeof params.paymentUrl !== "undefined") {
    updateFields.payment_url = params.paymentUrl;
  }

  const { error } = await params.supabase
    .from("order_products")
    .update(updateFields)
    .eq("id", params.orderId);

  if (error) {
    console.error(
      "[create-doku-product-checkout] Failed to persist payment_data:",
      error,
    );
  }
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let supabase: ReturnType<typeof createServiceClient> | null = null;
  let createdOrderId: number | null = null;
  let reservedVoucherId: string | null = null;
  let reservedAdjustments: ReservedProductAdjustment[] = [];

  try {
    const authResult = await requireAuthenticatedRequest(req);
    if (authResult.response) return authResult.response;

    const auth = authResult.context!;

    // Create separate client with SERVICE ROLE KEY for database operations
    supabase = createServiceClient(
      auth.supabaseEnv.url,
      auth.supabaseEnv.serviceRoleKey,
    );

    // CHECK RATE LIMIT: Max 10 checkouts per user per minute
    const rateLimitResult = await checkRateLimit(
      supabase,
      auth.user.id,
      {
        maxRequests: 10,
        windowMs: 60000, // 1 minute
        keyPrefix: "checkout_product",
      }
    );

    if (!rateLimitResult.allowed) {
      return jsonErrorWithDetails(req, 429, {
        error: "Too many checkout requests",
        code: "RATE_LIMITED",
        details: `Max 10 requests per minute. Try again in ${rateLimitResult.retryAfter}ms`,
      });
    }

    const dokuEnv = getDokuEnv();

    const payload = (await req.json()) as CreateTokenRequest;
    if (!payload.items || payload.items.length === 0) {
      return jsonError(req, 400, "No items provided");
    }

    if (!payload.customerName?.trim()) {
      return jsonError(req, 400, "Missing customer name");
    }

    if (!payload.customerEmail?.trim()) {
      return jsonError(req, 400, "Missing customer email");
    }

    const userId = auth.user.id;

    const normalizedItems: ProductItem[] = payload.items.map((i) => ({
      productVariantId: toNumber(i.productVariantId, 0),
      name: String(i.name || "").slice(0, 50),
      price: toNumber(i.price, 0),
      quantity: Math.max(1, Math.floor(toNumber(i.quantity, 1))),
    }));

    console.log("[create-doku-product-checkout] Normalized items:", JSON.stringify(normalizedItems));

    if (
      normalizedItems.some((i) => !i.productVariantId || !i.name || i.price < 0)
    ) {
      return jsonError(req, 400, "Invalid items");
    }

    // Log items with price 0 to debug rental pricing issues
    const zeroPriceItems = normalizedItems.filter((i) => i.price === 0);
    if (zeroPriceItems.length > 0) {
      console.warn("[create-doku-product-checkout] Items with price 0:", JSON.stringify(zeroPriceItems));
    }

    const aggregatedItemsByVariant = new Map<
      string,
      { productVariantId: number; name: string; quantity: number; sentPrice: number }
    >();
    for (const item of normalizedItems) {
      const key = `${item.productVariantId}_${item.price}`;
      const existing = aggregatedItemsByVariant.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        aggregatedItemsByVariant.set(key, {
          productVariantId: item.productVariantId,
          name: item.name,
          quantity: item.quantity,
          sentPrice: item.price,
        });
      }
    }

    const aggregatedItems = Array.from(aggregatedItemsByVariant.values());
    const variantIds = aggregatedItems.map((item) => item.productVariantId);

    const { data: variantRows, error: variantsError } = await supabase
      .from("product_variants")
      .select("id, price, stock, reserved_stock, is_active")
      .in("id", variantIds);

    if (variantsError || !Array.isArray(variantRows)) {
      return jsonError(req, 500, "Failed to load product variants");
    }

    console.log("[create-doku-product-checkout] Variant rows from DB:", JSON.stringify(variantRows));

    const variantMap = new Map<
      number,
      {
        id: number;
        price: unknown;
        stock: unknown;
        reserved_stock: unknown;
        is_active: unknown;
      }
    >();
    for (
      const row of variantRows as Array<
        {
          id: number;
          price: unknown;
          stock: unknown;
          reserved_stock: unknown;
          is_active: unknown;
        }
      >
    ) {
      variantMap.set(Number(row.id), row);
    }

    const resolvedItems: Array<
      {
        productVariantId: number;
        name: string;
        quantity: number;
        unitPrice: number;
      }
    > = [];
    for (const item of aggregatedItems) {
      const variant = variantMap.get(item.productVariantId);
      if (!variant) {
        return jsonError(
          req,
          400,
          `Variant not found: ${item.productVariantId}`,
        );
      }
      
      // Use the price sent from frontend if provided (for rental items with custom pricing)
      // Otherwise fall back to database price for regular items
      const dbPrice = toNumber((variant as { price: unknown }).price, 0);
      const unitPrice = item.sentPrice > 0 ? item.sentPrice : dbPrice;

      console.log(
        `[create-doku-product-checkout] Variant ${item.productVariantId}: sentPrice=${item.sentPrice}, dbPrice=${dbPrice}, unitPrice=${unitPrice}`
      );

      if (item.sentPrice === 0) {
        console.warn(
          `[create-doku-product-checkout] Variant ${item.productVariantId} sentPrice is 0, falling back to dbPrice: ${dbPrice}`
        );
      }

      if (unitPrice <= 0) {
        return jsonError(
          req,
          400,
          `Invalid price for variant: ${item.productVariantId}`,
        );
      }
      resolvedItems.push({ ...item, unitPrice });
    }

    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    console.log("[create-doku-product-checkout] Resolved items:", JSON.stringify(resolvedItems));
    console.log("[create-doku-product-checkout] Total amount:", totalAmount);

    // Debug: return resolved items in response for frontend debugging
    const debugInfo = {
      normalizedItems: normalizedItems.map((i) => ({
        productVariantId: i.productVariantId,
        price: i.price,
      })),
      resolvedItems: resolvedItems.map((i) => ({
        productVariantId: i.productVariantId,
        unitPrice: i.unitPrice,
      })),
      totalAmount,
    };
    console.log("[create-doku-product-checkout] Debug info:", JSON.stringify(debugInfo));
    const orderNumber = `PRD-${Date.now()}-${
      Math.random().toString(36).substring(2, 7).toUpperCase()
    }`;
    const appUrl = getPublicAppUrl() ?? req.headers.get("origin") ?? "";
    if (!appUrl) {
      return jsonError(req, 500, "Missing app url");
    }

    // Comment out payment method validation for development
    // if (dokuEnv.isProduction && dokuEnv.paymentMethodTypes.length === 0) {
    //   return jsonErrorWithDetails(req, 500, {
    //     error: "DOKU payment method scope is not configured",
    //     code: "DOKU_PAYMENT_METHOD_SCOPE_MISSING",
    //     details:
    //       "Set DOKU_PAYMENT_METHOD_TYPES for constrained production launch scope.",
    //   });
    // }

    try {
      assertDokuCheckoutModeGuard({
        isProduction: dokuEnv.isProduction,
        appUrl,
        requestOrigin: req.headers.get("origin"),
        allowedOrigins: getAllowedAppOrigins(),
        paymentMethodTypes: dokuEnv.paymentMethodTypes,
      });
    } catch (error) {
      return jsonErrorWithDetails(req, 500, {
        error: "DOKU environment guard failed",
        code: "DOKU_ENVIRONMENT_GUARD_FAILED",
        details: error instanceof Error ? error.message : String(error),
      });
    }

    const now = new Date();

    // VOUCHER VALIDATION: Extract category IDs and validate voucher if provided
    let voucherId: string | null = null;
    let voucherCode: string | null = null;
    let discountAmount = 0;
    let pointsDiscountAmount = 0;

    // LOYALTY POINTS: Calculate points discount if provided
    if (payload.pointsRedeemed && payload.pointsRedeemed > 0) {
      // 1 point = Rp 1 discount, but cannot exceed 50% of subtotal
      const maxPointsDiscount = Math.floor(totalAmount * 0.5);
      pointsDiscountAmount = Math.min(payload.pointsRedeemed, maxPointsDiscount);
      console.log(
        `[create-doku-product-checkout] Points discount: ${pointsDiscountAmount} (points: ${payload.pointsRedeemed}, max: ${maxPointsDiscount})`,
      );
    }

    if (payload.voucherCode?.trim()) {
      // Extract category IDs from product variants
      const { data: variantCategories, error: categoryError } = await supabase
        .from("product_variants")
        .select("product_id")
        .in("id", variantIds);

      if (categoryError || !variantCategories) {
        return jsonError(req, 500, "Failed to load product categories");
      }

      const productIds = variantCategories.map((v: { product_id?: number | null }) =>
        v.product_id
      ).filter((id): id is number => typeof id === "number");
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("category_id")
        .in("id", productIds);

      if (productsError || !products) {
        return jsonError(req, 500, "Failed to load product categories");
      }

      const categoryIds = products.map((p: { category_id?: number | null }) =>
        p.category_id
      ).filter((id): id is number => typeof id === "number");

      // Call validate_and_reserve_voucher RPC
      const { data: voucherResult, error: voucherError } = await supabase.rpc(
        "validate_and_reserve_voucher",
        {
          p_code: payload.voucherCode.trim(),
          p_user_id: userId,
          p_subtotal: totalAmount,
          p_category_ids: categoryIds,
        },
      );

      if (voucherError) {
        console.error(
          "[create-doku-product-checkout] Voucher validation error:",
          voucherError.message,
        );
        return jsonErrorWithDetails(req, 500, {
          error: "Failed to validate voucher",
          code: "VOUCHER_VALIDATION_ERROR",
          details: voucherError.message,
        });
      }

      // RPC returns array with single row
      const result = Array.isArray(voucherResult)
        ? voucherResult[0]
        : voucherResult;

      if (result?.error_message) {
        // Voucher validation failed - return specific error
        let errorCode = "VOUCHER_INVALID";
        const errorMsg = result.error_message;

        if (errorMsg.includes("tidak aktif")) errorCode = "VOUCHER_INACTIVE";
        else if (errorMsg.includes("belum berlaku")) {
          errorCode = "VOUCHER_NOT_YET_VALID";
        } else if (errorMsg.includes("kadaluarsa")) {
          errorCode = "VOUCHER_EXPIRED";
        } else if (errorMsg.includes("Kuota")) {
          errorCode = "VOUCHER_QUOTA_EXCEEDED";
        } else if (errorMsg.includes("Minimum")) {
          errorCode = "VOUCHER_MIN_PURCHASE";
        } else if (errorMsg.includes("kategori")) {
          errorCode = "VOUCHER_CATEGORY_MISMATCH";
        }

        return jsonError(req, 400, {
          error: errorMsg,
          code: errorCode,
        });
      }

      // Voucher validated successfully - store details
      voucherId = result.voucher_id;
      voucherCode = payload.voucherCode.trim().toUpperCase();
      discountAmount = toNumber(result.discount_amount, 0);

      console.log(
        `Voucher applied: ${voucherCode}, discount: ${discountAmount}`,
      );
      reservedVoucherId = voucherId;
    }

    // Dynamic payment expiry based on stock scarcity
    // Industry standard: Scarce inventory requires faster payment
    let minStockLevel = Infinity;
    for (const item of resolvedItems) {
      const row = variantMap.get(item.productVariantId);
      if (!row) continue;
      const stock = toNumber((row as { stock: unknown }).stock, 0);
      const reserved = toNumber(
        (row as { reserved_stock: unknown }).reserved_stock,
        0,
      );
      const available = stock - reserved;
      minStockLevel = Math.min(minStockLevel, available);
    }

    // Formula: Low stock = shorter payment window to prevent inventory deadlock
    // Stock < 5: 15 minutes (high urgency)
    // Stock 5-20: 30 minutes (medium urgency)
    // Stock > 20: 60 minutes (low urgency)
    let paymentExpiryMinutes = 60; // Default 1 hour
    if (minStockLevel < 5) {
      paymentExpiryMinutes = 15;
    } else if (minStockLevel < 20) {
      paymentExpiryMinutes = 30;
    }

    console.log(
      `Payment expiry set to ${paymentExpiryMinutes} minutes (min stock level: ${minStockLevel})`,
    );

    const paymentExpiredAt = new Date(
      now.getTime() + paymentExpiryMinutes * 60 * 1000,
    );

    for (const item of resolvedItems) {
      const row = variantMap.get(item.productVariantId);
      if (!row) {
        return jsonError(req, 400, "Variant not found");
      }

      const isActive = (row as { is_active: unknown }).is_active;
      if (isActive === false) {
        return jsonError(
          req,
          400,
          `Variant inactive: ${item.productVariantId}`,
        );
      }

      // Atomic reservation using RPC - prevents race conditions
      const { data: reserved, error: reserveError } = await supabase.rpc(
        "reserve_product_stock",
        {
          p_variant_id: item.productVariantId,
          p_quantity: item.quantity,
        },
      );

      if (reserveError || reserved !== true) {
        await releaseReservedProductResources({
          supabase,
          voucherId,
          reservedAdjustments,
        });
        return jsonError(req, 409, `Out of stock for ${item.name}`);
      }

      reservedAdjustments.push({
        variantId: item.productVariantId,
        quantity: item.quantity,
      });
    }

    // Calculate final total with both voucher and loyalty points discounts
    const totalDiscount = discountAmount + pointsDiscountAmount;
    const finalTotal = totalAmount - totalDiscount;

    console.log("[create-doku-product-checkout] Voucher discount:", discountAmount);
    console.log("[create-doku-product-checkout] Points discount:", pointsDiscountAmount);
    console.log("[create-doku-product-checkout] Total discount:", totalDiscount);
    console.log("[create-doku-product-checkout] Final total for DOKU:", finalTotal);

    // Extract and validate shipping data from payload
    const shippingCost = toNumber(payload.shippingCost, 0);
    const shippingAddress = payload.customerAddress?.trim() || null;
    const shippingProvinceId = payload.shippingProvinceId?.trim() || null;
    const shippingCityId = payload.shippingCityId?.trim() || null;
    const shippingSubdistrictId = payload.shippingSubdistrictId?.trim() || null;
    const shippingCourier = payload.shippingCourier?.trim().toLowerCase() || null;
    const shippingService = payload.shippingService?.trim().toUpperCase() || null;

    // Validate: if any shipping field present, courier must be set
    const hasShippingData = shippingAddress || shippingProvinceId || shippingCityId;
    if (hasShippingData && !shippingCourier) {
      return jsonError(req, 400, "Shipping courier required for delivery orders");
    }

    // Calculate final total including shipping cost
    const finalTotalWithShipping = finalTotal + shippingCost;

    console.log("[create-doku-product-checkout] Shipping data:", {
      courier: shippingCourier,
      service: shippingService,
      cost: shippingCost,
      hasAddress: Boolean(shippingAddress),
    });

    const { data: order, error: orderError } = await supabase
      .from("order_products")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        channel: "online",
        status: "awaiting_payment",
        payment_status: "unpaid",
        subtotal: totalAmount,
        discount_amount: totalDiscount,
        shipping_cost: shippingCost,
        shipping_discount: 0,
        total: finalTotalWithShipping,
        voucher_id: voucherId,
        voucher_code: voucherCode,
        shipping_address: shippingAddress,
        shipping_province_id: shippingProvinceId,
        shipping_city_id: shippingCityId,
        shipping_subdistrict_id: shippingSubdistrictId,
        shipping_courier: shippingCourier,
        shipping_service: shippingService,
        payment_expired_at: paymentExpiredAt.toISOString(),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      await releaseReservedProductResources({
        supabase,
        voucherId,
        reservedAdjustments,
      });

      console.error(
        "[create-doku-product-checkout] Failed to create order:",
        orderError?.message,
      );
      return jsonErrorWithDetails(req, 500, {
        error: "Failed to create order",
        code: "ORDER_CREATE_FAILED",
        details: orderError?.message,
      });
    }

    const orderId = (order as unknown as { id: number }).id;
    createdOrderId = orderId;

    const orderItems = resolvedItems.map((item) => ({
      order_product_id: orderId,
      product_variant_id: item.productVariantId,
      quantity: item.quantity,
      price: item.unitPrice,
      discount_amount: 0,
      subtotal: item.unitPrice * item.quantity,
      stock_type: "ready",
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }));

    const { error: itemsError } = await supabase.from("order_product_items")
      .insert(orderItems);
    if (itemsError) {
      await rollbackCreatedProductOrder({
        supabase,
        orderId,
        voucherId,
        reservedAdjustments,
      });

      console.error(
        "[create-doku-product-checkout] Failed to create order items:",
        itemsError.message,
      );
      return jsonErrorWithDetails(req, 500, {
        error: "Failed to create order items",
        code: "ORDER_ITEMS_CREATE_FAILED",
        details: itemsError.message,
      });
    }

    const callbackUrl = `${appUrl}/order/product/success/${
      encodeURIComponent(orderNumber)
    }?pending=1`;
    const dokuRequestId = createDokuRequestId();
    const dokuRequestTimestamp = createDokuRequestTimestamp();
    const dokuRequestTarget = getDokuCheckoutPath();
    const dokuUrl = `${
      getDokuApiBaseUrl(dokuEnv.isProduction)
    }${dokuRequestTarget}`;
    const providerMode = dokuEnv.isProduction ? "production" : "sandbox";
    const invoiceNumber = sanitizeDokuString(orderNumber, 64);
    const sanitizedCustomerName =
      sanitizeDokuString(payload.customerName.trim(), 255) || "Customer";
    const sanitizedEmail =
      sanitizeDokuString(payload.customerEmail.trim(), 128) ||
      "guest@sparkstage.id";
    const sanitizedPhone = payload.customerPhone?.trim()
      ? sanitizeDokuString(payload.customerPhone.trim(), 16)
      : undefined;

    const lineItems = resolvedItems.map((item) => ({
      name: sanitizeDokuString(item.name, 90) || "Product",
      quantity: item.quantity,
      price: item.unitPrice,
      sku: sanitizeDokuString(`variant-${item.productVariantId}`, 64),
      category: "beauty",
      type: "PHYSICAL",
    }));

    console.log("[create-doku-product-checkout] DOKU line items:", JSON.stringify(lineItems));
    console.log("[create-doku-product-checkout] DOKU total amount:", finalTotal);

    // Add shipping cost as line item if present
    if (shippingCost > 0 && shippingCourier) {
      lineItems.push({
        name: sanitizeDokuString(`Shipping ${shippingCourier.toUpperCase()} ${shippingService || ''}`.trim(), 90) || "Shipping Cost",
        quantity: 1,
        price: shippingCost,
        sku: sanitizeDokuString(`shipping-${shippingCourier}`, 64),
        category: "shipping",
        type: "PHYSICAL",
      });
      console.log("[create-doku-product-checkout] Added shipping to line items:", shippingCost);
    }

    if (discountAmount > 0) {
      lineItems.push({
        name: sanitizeDokuString(`Voucher ${voucherCode ?? "DISCOUNT"}`, 90) ||
          "Voucher Discount",
        quantity: 1,
        price: discountAmount * -1,
        sku: sanitizeDokuString(`voucher-${voucherId ?? "discount"}`, 64),
        category: "discount",
        type: "PROMOTION",
      });
    }

    if (pointsDiscountAmount > 0) {
      lineItems.push({
        name: "SPARK CLUB Points Discount",
        quantity: 1,
        price: pointsDiscountAmount * -1,
        sku: "loyalty-points-discount",
        category: "discount",
        type: "PROMOTION",
      });
    }

    const dokuPayload = {
      order: {
        amount: finalTotalWithShipping,
        invoice_number: invoiceNumber,
        currency: "IDR",
        callback_url: callbackUrl,
        callback_url_result: callbackUrl,
        line_items: lineItems,
        language: "EN",
        auto_redirect: true,
      },
      payment: {
        payment_due_date: paymentExpiryMinutes,
        // Remove payment method types to show all available methods including e-wallet
        // ...(dokuEnv.paymentMethodTypes.length > 0
        //   ? { payment_method_types: dokuEnv.paymentMethodTypes }
        //   : {}),
      },
      customer: {
        id: sanitizeDokuString(userId, 50),
        email: sanitizedEmail,
        phone: sanitizedPhone || undefined,
        name: sanitizedCustomerName,
      },
    };

    let paymentData = mergeDokuPaymentData({
      existing: null,
      patch: {
        provider: "doku_checkout",
        provider_mode: providerMode,
        provider_status: "pending",
        checkout_status: "request_prepared",
        request_id: dokuRequestId,
        request_timestamp: dokuRequestTimestamp,
        request_target: dokuRequestTarget,
        invoice_number: invoiceNumber,
        payment_provider_sdk_url: getDokuCheckoutSdkUrl(dokuEnv.isProduction),
        payment_due_date_minutes: paymentExpiryMinutes,
        payment_method_types: dokuEnv.paymentMethodTypes,
        payment_expired_at: paymentExpiredAt.toISOString(),
        callback_url: callbackUrl,
        callback_url_result: callbackUrl,
        line_item_count: lineItems.length,
        amount: finalTotal,
        last_attempt_at: new Date().toISOString(),
      },
      attempt: {
        type: "checkout_create",
        state: "request_prepared",
        at: new Date().toISOString(),
        request_id: dokuRequestId,
        request_timestamp: dokuRequestTimestamp,
        request_target: dokuRequestTarget,
        invoice_number: invoiceNumber,
        amount: finalTotal,
        mode: providerMode,
      },
    });

    await persistProductPaymentData({
      supabase,
      orderId,
      paymentData,
    });

    const dokuPayloadText = JSON.stringify(dokuPayload);
    const dokuHeaders = await buildDokuRequestHeaders({
      clientId: dokuEnv.clientId,
      requestId: dokuRequestId,
      requestTimestamp: dokuRequestTimestamp,
      requestTarget: dokuRequestTarget,
      secretKey: dokuEnv.secretKey,
      body: dokuPayloadText,
    });

    let dokuResponse: Response;
    let dokuData: unknown = null;
    try {
      dokuResponse = await fetch(dokuUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...dokuHeaders,
        },
        body: dokuPayloadText,
      });

      dokuData = await dokuResponse.json().catch(() => null);
    } catch (error) {
      const recovery = await fetchDokuOrderStatus({
        clientId: dokuEnv.clientId,
        secretKey: dokuEnv.secretKey,
        isProduction: dokuEnv.isProduction,
        orderNumber,
      }).catch((recoveryError) => ({
        ok: false,
        statusCode: 0,
        requestId: null,
        requestTimestamp: null,
        requestTarget: null,
        data: {
          error: recoveryError instanceof Error
            ? recoveryError.message
            : String(recoveryError),
        },
        provider_status: null,
        provider_order_status: null,
        provider_transaction_status: null,
        payment_url: null,
        provider_payment_id: null,
        provider_expired_at: null,
      }));

      paymentData = mergeDokuPaymentData({
        existing: paymentData,
        patch: {
          checkout_status: recovery.ok
            ? "recovery_required"
            : "request_failed_before_response",
          provider_status: recovery.provider_status ?? "pending",
          provider_order_status: recovery.provider_order_status,
          provider_transaction_status: recovery.provider_transaction_status,
          payment_expired_at: recovery.provider_expired_at ??
            paymentExpiredAt.toISOString(),
          status_recovery: {
            attempted: true,
            status_code: recovery.statusCode,
            request_id: recovery.requestId,
            request_timestamp: recovery.requestTimestamp,
            request_target: recovery.requestTarget,
            raw_response: recovery.data,
          },
          last_error: error instanceof Error ? error.message : String(error),
          last_attempt_at: new Date().toISOString(),
        },
        attempt: {
          type: "checkout_create",
          state: recovery.ok
            ? "recovery_required"
            : "request_failed_before_response",
          at: new Date().toISOString(),
          request_id: dokuRequestId,
          recovery_status_code: recovery.statusCode,
          provider_status: recovery.provider_status,
        },
      });

      await persistProductPaymentData({
        supabase,
        orderId,
        paymentData,
        paymentUrl: recovery.payment_url,
      });

      if (recovery.ok && recovery.payment_url) {
        return json(req, {
          payment_provider: "doku_checkout",
          payment_url: recovery.payment_url,
          payment_sdk_url: getDokuCheckoutSdkUrl(dokuEnv.isProduction),
          payment_due_date: recovery.provider_expired_at ??
            paymentExpiredAt.toISOString(),
          order_number: orderNumber,
          order_id: orderId,
          discount_amount: discountAmount,
        });
      }

      return jsonErrorWithDetails(req, 502, {
        error: "Checkout request state is ambiguous",
        code: "DOKU_CHECKOUT_RECOVERY_REQUIRED",
        details: {
          order_number: orderNumber,
          provider_status: recovery.provider_status,
          provider_order_status: recovery.provider_order_status,
          provider_transaction_status: recovery.provider_transaction_status,
        },
      });
    }

    if (!dokuResponse.ok) {
      if (dokuResponse.status === 409 || dokuResponse.status >= 500) {
        const recovery = await fetchDokuOrderStatus({
          clientId: dokuEnv.clientId,
          secretKey: dokuEnv.secretKey,
          isProduction: dokuEnv.isProduction,
          orderNumber,
        }).catch((recoveryError) => ({
          ok: false,
          statusCode: 0,
          requestId: null,
          requestTimestamp: null,
          requestTarget: null,
          data: {
            error: recoveryError instanceof Error
              ? recoveryError.message
              : String(recoveryError),
          },
          provider_status: null,
          provider_order_status: null,
          provider_transaction_status: null,
          payment_url: null,
          provider_payment_id: null,
          provider_expired_at: null,
        }));

        paymentData = mergeDokuPaymentData({
          existing: paymentData,
          patch: {
            checkout_status: recovery.ok
              ? "provider_conflict_recovery_required"
              : "provider_error",
            provider_status: recovery.provider_status ?? "pending",
            provider_order_status: recovery.provider_order_status,
            provider_transaction_status: recovery.provider_transaction_status,
            last_response: {
              ...summarizeDokuHttpResponse(dokuResponse),
              body: dokuData,
            },
            status_recovery: {
              attempted: true,
              status_code: recovery.statusCode,
              request_id: recovery.requestId,
              request_timestamp: recovery.requestTimestamp,
              request_target: recovery.requestTarget,
              raw_response: recovery.data,
            },
            raw_response: dokuData,
            last_attempt_at: new Date().toISOString(),
          },
          attempt: {
            type: "checkout_create",
            state: recovery.ok
              ? "provider_conflict_recovery_required"
              : "provider_error",
            at: new Date().toISOString(),
            request_id: dokuRequestId,
            response_status: dokuResponse.status,
            provider_status: recovery.provider_status,
          },
        });

        await persistProductPaymentData({
          supabase,
          orderId,
          paymentData,
          paymentUrl: recovery.payment_url,
        });

        if (recovery.ok && recovery.payment_url) {
          return json(req, {
            payment_provider: "doku_checkout",
            payment_url: recovery.payment_url,
            payment_sdk_url: getDokuCheckoutSdkUrl(dokuEnv.isProduction),
            payment_due_date: recovery.provider_expired_at ??
              paymentExpiredAt.toISOString(),
            order_number: orderNumber,
            order_id: orderId,
            discount_amount: discountAmount,
          });
        }

        if (recovery.ok) {
          return jsonErrorWithDetails(req, 409, {
            error:
              "Duplicate or conflicting checkout request requires recovery",
            code: "DOKU_DUPLICATE_CHECKOUT_CONFLICT",
            details: {
              order_number: orderNumber,
              provider_status: recovery.provider_status,
              provider_order_status: recovery.provider_order_status,
              provider_transaction_status: recovery.provider_transaction_status,
            },
          });
        }
      }

      await rollbackCreatedProductOrder({
        supabase,
        orderId,
        voucherId,
        reservedAdjustments,
      });
      createdOrderId = null;
      reservedVoucherId = null;
      reservedAdjustments = [];

      console.error("[create-doku-product-checkout] DOKU error:", dokuData);
      return jsonErrorWithDetails(req, 500, {
        error: "Failed to create payment checkout",
        code: "DOKU_CHECKOUT_FAILED",
        details: dokuData,
      });
    }

    const checkoutResponse = extractDokuCheckoutResponse(
      dokuData,
      dokuRequestId,
    );
    const paymentUrl = checkoutResponse.paymentUrl;
    const providerExpiresAt = checkoutResponse.providerExpiresAt ??
      paymentExpiredAt.toISOString();

    if (!paymentUrl) {
      paymentData = mergeDokuPaymentData({
        existing: paymentData,
        patch: {
          checkout_status: "response_missing_payment_url",
          provider_status: checkoutResponse.providerStatus,
          provider_order_status: checkoutResponse.providerOrderStatus,
          provider_transaction_status:
            checkoutResponse.providerTransactionStatus,
          last_response: {
            ...summarizeDokuHttpResponse(dokuResponse),
            body: dokuData,
          },
          raw_response: dokuData,
          last_attempt_at: new Date().toISOString(),
        },
        attempt: {
          type: "checkout_create",
          state: "response_missing_payment_url",
          at: new Date().toISOString(),
          request_id: dokuRequestId,
          response_status: dokuResponse.status,
        },
      });

      await persistProductPaymentData({
        supabase,
        orderId,
        paymentData,
      });

      await rollbackCreatedProductOrder({
        supabase,
        orderId,
        voucherId,
        reservedAdjustments,
      });
      createdOrderId = null;
      reservedVoucherId = null;
      reservedAdjustments = [];
      return jsonErrorWithDetails(req, 500, {
        error: "DOKU response missing payment url",
        code: "DOKU_PAYMENT_URL_MISSING",
        details: dokuData,
      });
    }

    paymentData = mergeDokuPaymentData({
      existing: paymentData,
      patch: {
        checkout_status: "checkout_created",
        provider_payment_id: checkoutResponse.paymentId,
        provider_status: checkoutResponse.providerStatus,
        provider_order_status: checkoutResponse.providerOrderStatus,
        provider_transaction_status: checkoutResponse.providerTransactionStatus,
        payment_url: paymentUrl,
        payment_expired_at: providerExpiresAt,
        last_response: {
          ...summarizeDokuHttpResponse(dokuResponse),
          body: dokuData,
        },
        raw_response: dokuData,
        last_attempt_at: new Date().toISOString(),
      },
      attempt: {
        type: "checkout_create",
        state: "checkout_created",
        at: new Date().toISOString(),
        request_id: dokuRequestId,
        response_status: dokuResponse.status,
        provider_payment_id: checkoutResponse.paymentId,
      },
    });

    await persistProductPaymentData({
      supabase,
      orderId,
      paymentData,
      paymentUrl,
    });

    return json(req, {
      payment_provider: "doku_checkout",
      payment_url: paymentUrl,
      payment_sdk_url: getDokuCheckoutSdkUrl(dokuEnv.isProduction),
      payment_due_date: providerExpiresAt,
      order_number: orderNumber,
      order_id: orderId,
      discount_amount: discountAmount, // Include discount for frontend display
      _debug: {
        normalizedItems: normalizedItems.map((i) => ({
          productVariantId: i.productVariantId,
          price: i.price,
        })),
        resolvedItems: resolvedItems.map((i) => ({
          productVariantId: i.productVariantId,
          unitPrice: i.unitPrice,
        })),
        totalAmount,
        finalTotal,
      },
    });
  } catch (error) {
    if (supabase && createdOrderId) {
      await rollbackCreatedProductOrder({
        supabase,
        orderId: createdOrderId,
        voucherId: reservedVoucherId,
        reservedAdjustments,
      });
    } else if (
      supabase && (reservedVoucherId || reservedAdjustments.length > 0)
    ) {
      await releaseReservedProductResources({
        supabase,
        voucherId: reservedVoucherId,
        reservedAdjustments,
      });
    }
    console.error("[create-doku-product-checkout] Error:", error);
    return jsonError(req, 500, "Internal server error");
  }
});
