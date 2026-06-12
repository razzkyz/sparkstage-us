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
import {
  getAllowedAppOrigins,
  getDokuEnv,
  getPublicAppUrl,
} from "../_shared/env.ts";
import { createServiceClient } from "../_shared/supabase.ts";
import { toNumber } from "../_shared/payment-effects.ts";
import { requireAuthenticatedRequest } from "../_shared/auth.ts";

type RentalItem = {
  productVariantId: number;
  productName: string;
  dailyRate: number;
  depositAmount: number;
  quantity: number;
  initialCondition?: Record<string, unknown>;
};

type CreateRentalCheckoutRequest = {
  items: RentalItem[];
  durationDays: number;
  rentalStartTime: string;
  rentalEndTime: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress: string;
  initialCondition?: Record<number, Record<string, unknown>>;
};

type RentalVariantRow = {
  id: number;
  price: unknown;
  stock: unknown;
  reserved_stock: unknown;
  is_active: unknown;
  deposit_amount: unknown;
};

async function persistRentalPaymentData(params: {
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
    .from("rental_orders")
    .update(updateFields)
    .eq("id", params.orderId);

  if (error) {
    console.error(
      "[create-doku-rental-checkout] Failed to persist payment_data:",
      error,
    );
  }
}

async function rollbackCreatedRentalOrder(params: {
  supabase: ReturnType<typeof createServiceClient>;
  orderId: number;
}) {
  await params.supabase.from("rental_order_items").delete().eq(
    "rental_order_id",
    params.orderId,
  );
  await params.supabase.from("rental_orders").delete().eq(
    "id",
    params.orderId,
  );
}

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let supabase: ReturnType<typeof createServiceClient> | null = null;
  let createdOrderId: number | null = null;

  try {
    const authResult = await requireAuthenticatedRequest(req);
    if (authResult.response) return authResult.response;

    const auth = authResult.context!;
    const dokuEnv = getDokuEnv();

    supabase = createServiceClient(
      auth.supabaseEnv.url,
      auth.supabaseEnv.serviceRoleKey,
    );

    const payload = (await req.json()) as CreateRentalCheckoutRequest;
    if (!payload.items || payload.items.length === 0) {
      return jsonError(req, 400, "No items provided");
    }

    if (!payload.customerName?.trim()) {
      return jsonError(req, 400, "Missing customer name");
    }

    if (!payload.customerEmail?.trim()) {
      return jsonError(req, 400, "Missing customer email");
    }

    if (!payload.durationDays || payload.durationDays < 1) {
      return jsonError(req, 400, "Invalid duration");
    }

    const userId = auth.user.id;

    const normalizedItems: RentalItem[] = payload.items.map((i) => ({
      productVariantId: toNumber(i.productVariantId, 0),
      productName: String(i.productName || "").slice(0, 100),
      dailyRate: toNumber(i.dailyRate, 0),
      depositAmount: toNumber(i.depositAmount, 0),
      quantity: Math.max(1, Math.floor(toNumber(i.quantity, 1))),
      initialCondition: i.initialCondition,
    }));

    if (
      normalizedItems.some((i) => !i.productVariantId || !i.productName || i.dailyRate < 0)
    ) {
      return jsonError(req, 400, "Invalid items");
    }

    const variantIds = normalizedItems.map((item) => item.productVariantId);

    const { data: variantRows, error: variantsError } = await supabase
      .from("dressing_room_product_variants")
      .select("id, price, available_quantity, reserved_quantity, is_active, deposit_amount, daily_rental_fee")
      .in("id", variantIds);

    if (variantsError || !Array.isArray(variantRows)) {
      return jsonError(req, 500, "Failed to load product variants");
    }

    const variantMap = new Map<
      number,
      RentalVariantRow
    >();
    for (const row of variantRows as unknown as RentalVariantRow[]) {
      variantMap.set(Number(row.id), row);
    }

    const resolvedItems: Array<
      {
        productVariantId: number;
        productName: string;
        quantity: number;
        dailyRate: number;
        itemDepositAmount: number;
        totalRentalCost: number;
      }
    > = [];
    for (const item of normalizedItems) {
      const variant = variantMap.get(item.productVariantId);
      if (!variant) {
        return jsonError(
          req,
          400,
          `Variant not found: ${item.productVariantId}`,
        );
      }
      const isActive = (variant as { is_active: unknown }).is_active;
      if (isActive === false) {
        return jsonError(
          req,
          400,
          `Variant inactive: ${item.productVariantId}`,
        );
      }

      // Use deposit_amount from DB if available, otherwise use provided value
      const dbDepositAmount = toNumber(variant.deposit_amount, 0);
      const itemDepositAmount = dbDepositAmount > 0
        ? dbDepositAmount
        : item.depositAmount;

      const totalRentalCost = item.dailyRate * payload.durationDays * item.quantity;

      resolvedItems.push({
        ...item,
        itemDepositAmount,
        totalRentalCost,
      });
    }

    // Calculate totals
    const totalRentalCost = resolvedItems.reduce(
      (sum, item) => sum + item.totalRentalCost,
      0,
    );
    const totalDeposit = resolvedItems.reduce(
      (sum, item) => sum + item.itemDepositAmount * item.quantity,
      0,
    );
    const totalAmount = totalRentalCost + totalDeposit;

    const orderNumber = `RTL-${Date.now()}-${
      Math.random().toString(36).substring(2, 7).toUpperCase()
    }`;
    const appUrl = getPublicAppUrl() ?? req.headers.get("origin") ?? "";
    if (!appUrl) {
      return jsonError(req, 500, "Missing app url");
    }

    if (dokuEnv.isProduction && dokuEnv.paymentMethodTypes.length === 0) {
      return jsonErrorWithDetails(req, 500, {
        error: "DOKU payment method scope is not configured",
        code: "DOKU_PAYMENT_METHOD_SCOPE_MISSING",
        details:
          "Set DOKU_PAYMENT_METHOD_TYPES for constrained production launch scope.",
      });
    }

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
    const rentalStartTime = new Date(payload.rentalStartTime);
    const rentalEndTime = new Date(payload.rentalEndTime);

    // Payment expiry: 30 minutes for rentals
    const paymentExpiryMinutes = 30;
    const paymentExpiredAt = new Date(
      now.getTime() + paymentExpiryMinutes * 60 * 1000,
    );

    // Create rental order
    const { data: order, error: orderError } = await supabase
      .from("rental_orders")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        duration_days: payload.durationDays,
        start_time: rentalStartTime.toISOString(),
        end_time: rentalEndTime.toISOString(),
        customer_name: payload.customerName.trim(),
        customer_email: payload.customerEmail.trim(),
        customer_phone: payload.customerPhone?.trim(),
        customer_address: payload.customerAddress.trim(),
        total_rental_cost: totalRentalCost,
        total_deposit: totalDeposit,
        total_amount: totalAmount,
        status: "awaiting_payment",
        payment_status: "unpaid",
        source: "online",
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      console.error(
        "[create-doku-rental-checkout] Failed to create rental order:",
        orderError?.message,
      );
      return jsonErrorWithDetails(req, 500, {
        error: "Failed to create rental order",
        code: "RENTAL_ORDER_CREATE_FAILED",
        details: orderError?.message,
      });
    }

    const orderId = (order as unknown as { id: number }).id;
    createdOrderId = orderId;

    // Create rental order items
    const orderItems = resolvedItems.map((item) => ({
      rental_order_id: orderId,
      dressing_room_product_variant_id: item.productVariantId,
      product_name: item.productName,
      quantity: item.quantity,
      daily_rate: item.dailyRate,
      item_deposit_amount: item.itemDepositAmount,
      total_rental_cost: item.totalRentalCost,
      current_status: 'reserved',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    }));

    const { error: itemsError } = await supabase.from("rental_order_items")
      .insert(orderItems);
    if (itemsError) {
      await rollbackCreatedRentalOrder({ supabase, orderId });
      createdOrderId = null;

      console.error(
        "[create-doku-rental-checkout] Failed to create rental order items:",
        itemsError.message,
      );
      return jsonErrorWithDetails(req, 500, {
        error: "Failed to create rental order items",
        code: "RENTAL_ORDER_ITEMS_CREATE_FAILED",
        details: itemsError.message,
      });
    }

    const callbackUrl = `${appUrl}/rental/success/${
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
      name: sanitizeDokuString(item.productName, 90) || "Rental Item",
      quantity: item.quantity,
      price: item.totalRentalCost,
      sku: sanitizeDokuString(`rental-${item.productVariantId}`, 64),
      category: "rental",
      type: "SERVICE",
    }));

    // Add deposit as separate line item
    lineItems.push({
      name: sanitizeDokuString("Deposit (Refundable)", 90) || "Deposit",
      quantity: 1,
      price: totalDeposit,
      sku: sanitizeDokuString(`rental-deposit-${orderId}`, 64),
      category: "deposit",
      type: "PROMOTION",
    });

    const dokuPayload = {
      order: {
        amount: totalAmount,
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
        amount: totalAmount,
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
        amount: totalAmount,
        mode: providerMode,
      },
    });

    await persistRentalPaymentData({
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

      await persistRentalPaymentData({
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

        await persistRentalPaymentData({
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

      await rollbackCreatedRentalOrder({ supabase, orderId });
      createdOrderId = null;

      console.error("[create-doku-rental-checkout] DOKU error:", dokuData);
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

      await persistRentalPaymentData({
        supabase,
        orderId,
        paymentData,
      });

      await rollbackCreatedRentalOrder({ supabase, orderId });
      createdOrderId = null;
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

    await persistRentalPaymentData({
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
    });
  } catch (error) {
    if (supabase && createdOrderId) {
      await rollbackCreatedRentalOrder({ supabase, orderId: createdOrderId });
    }

    console.error("[create-doku-rental-checkout] Unhandled error:", error);
    return jsonErrorWithDetails(req, 500, {
      error: "Internal server error",
      code: "INTERNAL_ERROR",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
