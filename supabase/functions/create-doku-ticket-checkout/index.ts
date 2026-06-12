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
import {
  normalizeBookingTimeSlot,
  normalizeTicketTimeSlots,
} from "../_shared/tickets.ts";
import { requireAuthenticatedRequest } from "../_shared/auth.ts";

interface OrderItem {
  ticketId: number;
  ticketName: string;
  price: number;
  quantity: number;
  date: string;
  timeSlot: string;
}

interface CreateTokenRequest {
  items: OrderItem[];
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
}

type ReservedTicketHold = {
  ticketId: number;
  date: string;
  timeSlot: string | null;
  quantity: number;
};

const DEFAULT_MAX_TICKETS_PER_BOOKING = 5;
const DEFAULT_BOOKING_WINDOW_DAYS = 30;

function extractDateOnly(value: unknown): string {
  return String(value ?? "").split("T")[0].split(" ")[0];
}

function formatWibDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "1970";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return `${year}-${month}-${day}`;
}

function addDaysWib(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00+07:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatWibDate(date);
}

async function releaseReservedTicketHolds(params: {
  supabase: ReturnType<typeof createServiceClient>;
  holds: ReservedTicketHold[];
}) {
  for (const hold of params.holds) {
    const { error } = await params.supabase.rpc("release_ticket_capacity", {
      p_ticket_id: hold.ticketId,
      p_date: hold.date,
      p_time_slot: hold.timeSlot,
      p_quantity: hold.quantity,
    });

    if (error) {
      console.error(
        "[create-doku-ticket-checkout] Failed to release reserved hold:",
        error,
      );
    }
  }
}

async function rollbackCreatedTicketOrder(params: {
  supabase: ReturnType<typeof createServiceClient>;
  orderId: number;
  holds: ReservedTicketHold[];
}) {
  await params.supabase.from("order_items").delete().eq(
    "order_id",
    params.orderId,
  );
  await params.supabase.from("orders").delete().eq("id", params.orderId);
  await releaseReservedTicketHolds({
    supabase: params.supabase,
    holds: params.holds,
  });
}

async function persistTicketPaymentData(params: {
  supabase: ReturnType<typeof createServiceClient>;
  orderId: number;
  paymentData: Record<string, unknown>;
  paymentId?: string | null;
  paymentUrl?: string | null;
}) {
  const updateFields: Record<string, unknown> = {
    payment_data: params.paymentData,
    updated_at: new Date().toISOString(),
  };

  if (typeof params.paymentId !== "undefined") {
    updateFields.payment_id = params.paymentId;
  }

  if (typeof params.paymentUrl !== "undefined") {
    updateFields.payment_url = params.paymentUrl;
  }

  const { error } = await params.supabase
    .from("orders")
    .update(updateFields)
    .eq("id", params.orderId);

  if (error) {
    console.error(
      "[create-doku-ticket-checkout] Failed to persist payment_data:",
      error,
    );
  }
}

serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let supabase: ReturnType<typeof createServiceClient> | null = null;
  let createdOrderId: number | null = null;
  let reservedHolds: ReservedTicketHold[] = [];

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
        keyPrefix: "checkout_ticket",
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

    // Create separate client with SERVICE ROLE KEY for database operations
    supabase = createServiceClient(
      auth.supabaseEnv.url,
      auth.supabaseEnv.serviceRoleKey,
    );

    const payload = (await req.json()) as CreateTokenRequest;
    const items = payload.items;
    const customerName = payload.customerName;
    const customerEmail = payload.customerEmail;
    const customerPhone = payload.customerPhone;

    if (!items || items.length === 0) {
      return jsonError(req, 400, "No items provided");
    }

    if (!customerName?.trim() || !customerEmail?.trim()) {
      return jsonError(req, 400, "Missing customer info");
    }

    // Validate that sessions haven't ended yet
    // NEW LOGIC (Jan 2026): Allow booking as long as session hasn't ended
    // - Session duration: 2.5 hours (150 minutes)
    // - Customers can book even after session starts
    // - Booking closes when session END time is reached
    // Timezone: WIB (UTC+7) for Bandung business operations
    const SESSION_DURATION_MINUTES = 150; // 2.5 hours
    const now = new Date();

    // Calculate dynamic payment expiry based on earliest slot END time
    let minMinutesToSessionEnd = Infinity;

    for (const item of items) {
      const normalizedTimeSlot = normalizeBookingTimeSlot(item.timeSlot);

      // Skip validation for all-day tickets
      if (normalizedTimeSlot === "all-day") continue;

      // Parse booking date and time in WIB
      // item.date format: YYYY-MM-DD, item.timeSlot format: HH:MM
      const sessionStartTimeWIB = new Date(
        `${item.date}T${normalizedTimeSlot}:00+07:00`,
      );
      const sessionEndTimeWIB = new Date(
        sessionStartTimeWIB.getTime() + SESSION_DURATION_MINUTES * 60 * 1000,
      );

      // NEW: Check if session has ended (not if it's about to start)
      if (now > sessionEndTimeWIB) {
        console.error(
          `Session has ended: ${item.date} ${normalizedTimeSlot} WIB (ended at ${sessionEndTimeWIB.toISOString()})`,
        );
        return jsonErrorWithDetails(req, 400, {
          error: "Session has ended",
          code: "SESSION_ENDED",
          details:
            `The selected session (${normalizedTimeSlot} on ${item.date}) has already ended. Please select a different time slot.`,
        });
      }

      // Track earliest session end time for payment expiry calculation
      const minutesToSessionEnd = Math.floor(
        (sessionEndTimeWIB.getTime() - now.getTime()) / (60 * 1000),
      );
      minMinutesToSessionEnd = Math.min(
        minMinutesToSessionEnd,
        minutesToSessionEnd,
      );
    }

    // Calculate dynamic payment expiry
    // Formula: Give user time to pay, but ensure payment completes before session ends
    // Max 20 minutes, or (time_to_session_end - 5min buffer), whichever is smaller
    const MAX_PAYMENT_MINUTES = 20;
    const PAYMENT_BUFFER_MINUTES = 5;
    let paymentExpiryMinutes = MAX_PAYMENT_MINUTES;

    if (minMinutesToSessionEnd !== Infinity) {
      // For time-specific slots, limit payment window to before session ends
      paymentExpiryMinutes = Math.min(
        MAX_PAYMENT_MINUTES,
        Math.max(10, minMinutesToSessionEnd - PAYMENT_BUFFER_MINUTES), // Minimum 10 minutes to pay
      );
    }

    console.log(
      `Payment expiry set to ${paymentExpiryMinutes} minutes (session ends in ${minMinutesToSessionEnd} minutes)`,
    );

    const userId = auth.user.id;

    const normalizedItems = items.map((item) => ({
      ticketId: toNumber(item.ticketId, 0),
      date: String(item.date || ""),
      timeSlot: normalizeBookingTimeSlot(item.timeSlot),
      quantity: Math.max(1, Math.floor(toNumber(item.quantity, 1))),
    }));

    if (
      normalizedItems.some(
        (i) =>
          !i.ticketId ||
          !/^\d{4}-\d{2}-\d{2}$/.test(i.date) ||
          !(i.timeSlot === "all-day" || /^\d{2}:\d{2}$/.test(i.timeSlot)) ||
          i.quantity <= 0,
      )
    ) {
      return jsonError(req, 400, "Invalid items");
    }

    const ticketIds = Array.from(
      new Set(normalizedItems.map((i) => i.ticketId)),
    );
    const { data: ticketRows, error: ticketsError } = await supabase
      .from("tickets")
      .select(
        "id, name, price, is_active, available_from, available_until, time_slots",
      )
      .in("id", ticketIds);

    if (ticketsError || !Array.isArray(ticketRows)) {
      return jsonError(req, 500, "Failed to load tickets");
    }

    const { data: settingsRows, error: settingsError } = await supabase
      .from("ticket_booking_settings")
      .select("ticket_id, max_tickets_per_booking, booking_window_days")
      .in("ticket_id", ticketIds);

    if (settingsError || !Array.isArray(settingsRows)) {
      return jsonError(req, 500, "Failed to load ticket booking settings");
    }

    const ticketMap = new Map<number, {
      id: number;
      name: string;
      price: unknown;
      is_active: unknown;
      available_from: unknown;
      available_until: unknown;
      time_slots: unknown;
    }>();
    for (
      const row of ticketRows as Array<{
        id: number;
        name: string;
        price: unknown;
        is_active: unknown;
        available_from: unknown;
        available_until: unknown;
        time_slots: unknown;
      }>
    ) {
      ticketMap.set(Number(row.id), row);
    }

    const settingsMap = new Map<
      number,
      { max_tickets_per_booking: number; booking_window_days: number }
    >();
    for (
      const row of settingsRows as Array<
        {
          ticket_id: number | string;
          max_tickets_per_booking: unknown;
          booking_window_days: unknown;
        }
      >
    ) {
      settingsMap.set(Number(row.ticket_id), {
        max_tickets_per_booking: Math.max(
          1,
          Math.floor(
            toNumber(
              row.max_tickets_per_booking,
              DEFAULT_MAX_TICKETS_PER_BOOKING,
            ),
          ),
        ),
        booking_window_days: Math.max(
          1,
          Math.floor(
            toNumber(row.booking_window_days, DEFAULT_BOOKING_WINDOW_DAYS),
          ),
        ),
      });
    }

    const todayWib = formatWibDate(now);
    const quantitiesByTicket = new Map<number, number>();

    const resolvedItems: Array<
      {
        ticketId: number;
        ticketName: string;
        unitPrice: number;
        quantity: number;
        date: string;
        timeSlot: string;
      }
    > = [];
    for (const item of normalizedItems) {
      const ticket = ticketMap.get(item.ticketId);
      if (!ticket) {
        return jsonError(req, 400, `Ticket not found: ${item.ticketId}`);
      }
      if ((ticket as { is_active: unknown }).is_active === false) {
        return jsonError(req, 400, `Ticket inactive: ${item.ticketId}`);
      }
      const ticketSettings = settingsMap.get(item.ticketId) ?? {
        max_tickets_per_booking: DEFAULT_MAX_TICKETS_PER_BOOKING,
        booking_window_days: DEFAULT_BOOKING_WINDOW_DAYS,
      };
      const availableFrom = extractDateOnly(
        (ticket as { available_from: unknown }).available_from,
      );
      const availableUntil = extractDateOnly(
        (ticket as { available_until: unknown }).available_until,
      );
      const maxBookableDate = addDaysWib(
        todayWib,
        ticketSettings.booking_window_days,
      );
      if (item.date < todayWib || item.date > maxBookableDate) {
        return jsonError(req, 400, `Date outside booking window: ${item.date}`);
      }
      if (
        (availableFrom && item.date < availableFrom) ||
        (availableUntil && item.date > availableUntil)
      ) {
        return jsonError(req, 400, `Date unavailable for ticket: ${item.date}`);
      }
      if (item.timeSlot !== "all-day") {
        const allowedSlots = normalizeTicketTimeSlots(
          (ticket as { time_slots: unknown }).time_slots,
        );
        if (
          allowedSlots.length > 0 &&
          !allowedSlots.some((slot) => slot.slice(0, 5) === item.timeSlot)
        ) {
          return jsonError(
            req,
            400,
            `Invalid time slot for ticket: ${item.timeSlot}`,
          );
        }
      }
      const unitPrice = toNumber((ticket as { price: unknown }).price, 0);
      if (unitPrice <= 0) {
        return jsonError(req, 400, `Invalid ticket price: ${item.ticketId}`);
      }
      quantitiesByTicket.set(
        item.ticketId,
        (quantitiesByTicket.get(item.ticketId) ?? 0) + item.quantity,
      );
      resolvedItems.push({
        ticketId: item.ticketId,
        ticketName: String((ticket as { name: unknown }).name || "").slice(
          0,
          50,
        ),
        unitPrice,
        quantity: item.quantity,
        date: item.date,
        timeSlot: item.timeSlot,
      });
    }

    for (const [ticketId, totalQuantity] of quantitiesByTicket.entries()) {
      const ticketSettings = settingsMap.get(ticketId) ?? {
        max_tickets_per_booking: DEFAULT_MAX_TICKETS_PER_BOOKING,
        booking_window_days: DEFAULT_BOOKING_WINDOW_DAYS,
      };
      if (totalQuantity > ticketSettings.max_tickets_per_booking) {
        return jsonError(
          req,
          400,
          `Maximum ${ticketSettings.max_tickets_per_booking} tickets per booking`,
        );
      }
    }

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

    const totalAmount = resolvedItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0,
    );

    const holdsBySlot = new Map<
      string,
      {
        ticketId: number;
        date: string;
        timeSlot: string | null;
        quantity: number;
      }
    >();
    for (const item of resolvedItems) {
      const timeSlot = item.timeSlot === "all-day" ? null : item.timeSlot;
      const key = `${item.ticketId}|${item.date}|${timeSlot ?? ""}`;
      const existing = holdsBySlot.get(key);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        holdsBySlot.set(key, {
          ticketId: item.ticketId,
          date: item.date,
          timeSlot,
          quantity: item.quantity,
        });
      }
    }

    for (const hold of holdsBySlot.values()) {
      const { data: reserved, error: reserveError } = await supabase.rpc(
        "reserve_ticket_capacity",
        {
          p_ticket_id: hold.ticketId,
          p_date: hold.date,
          p_time_slot: hold.timeSlot,
          p_quantity: hold.quantity,
        },
      );

      if (reserveError) {
        await releaseReservedTicketHolds({ supabase, holds: reservedHolds });

        console.error("Ticket capacity reservation error:", reserveError);
        return jsonErrorWithDetails(req, 500, {
          error: "Failed to reserve ticket capacity",
          code: "RESERVE_TICKET_CAPACITY_FAILED",
          details: reserveError.message,
        });
      }

      if (reserved !== true) {
        await releaseReservedTicketHolds({ supabase, holds: reservedHolds });

        return jsonError(req, 409, "Slot sold out");
      }

      reservedHolds.push(hold);
    }

    // Generate unique order number
    const orderNumber = `SPK-${Date.now()}-${
      Math.random().toString(36).substring(2, 7).toUpperCase()
    }`;

    // Create order in database
    const expiresAt = new Date(Date.now() + paymentExpiryMinutes * 60 * 1000);

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        user_id: userId,
        customer_name: customerName.trim(),
        customer_email: customerEmail.trim(),
        customer_phone: (customerPhone && customerPhone.trim()) || null,
        total_amount: totalAmount,
        status: "pending",
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error("Order creation error:", orderError);
      await releaseReservedTicketHolds({ supabase, holds: reservedHolds });
      return jsonError(req, 500, "Failed to create order");
    }

    createdOrderId = order.id;

    // Create order items
    const orderItems = resolvedItems.map((item) => ({
      order_id: order.id,
      ticket_id: item.ticketId,
      selected_date: item.date,
      selected_time_slots: JSON.stringify([item.timeSlot]),
      quantity: item.quantity,
      unit_price: item.unitPrice,
      subtotal: item.unitPrice * item.quantity,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { error: itemsError } = await supabase
      .from("order_items")
      .insert(orderItems);

    if (itemsError) {
      console.error("Order items creation error:", itemsError);
      await rollbackCreatedTicketOrder({
        supabase,
        orderId: order.id,
        holds: reservedHolds,
      });
      return jsonError(req, 500, "Failed to create order items");
    }

    const callbackUrl = `${appUrl}/booking-success?order_id=${
      encodeURIComponent(orderNumber)
    }&pending=1`;
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

    const dokuPayload = {
      order: {
        amount: totalAmount,
        invoice_number: invoiceNumber,
        currency: "IDR",
        callback_url: callbackUrl,
        callback_url_result: callbackUrl,
        line_items: resolvedItems.map((item) => ({
          name: sanitizeDokuString(item.ticketName, 90) || "Ticket",
          quantity: item.quantity,
          price: item.unitPrice,
          sku: sanitizeDokuString(`ticket-${item.ticketId}`, 64),
          category: "ticketing",
          type: "DIGITAL",
        })),
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
        payment_expired_at: expiresAt.toISOString(),
        callback_url: callbackUrl,
        callback_url_result: callbackUrl,
        line_item_count: resolvedItems.length,
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

    await persistTicketPaymentData({
      supabase,
      orderId: order.id,
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
    let dokuResponseText = "";
    let dokuData: Record<string, unknown> | null = null;
    try {
      dokuResponse = await fetch(dokuUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...dokuHeaders,
        },
        body: dokuPayloadText,
      });

      dokuResponseText = await dokuResponse.text().catch(() => "");
      console.log(
        "[create-doku-ticket-checkout] DOKU response status:",
        dokuResponse.status,
        dokuResponse.statusText,
      );
      console.log(
        "[create-doku-ticket-checkout] DOKU response body:",
        dokuResponseText,
      );

      try {
        dokuData = JSON.parse(dokuResponseText) as Record<string, unknown>;
      } catch {
        dokuData = null;
      }
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
            expiresAt.toISOString(),
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

      await persistTicketPaymentData({
        supabase,
        orderId: order.id,
        paymentData,
        paymentId: recovery.provider_payment_id,
        paymentUrl: recovery.payment_url,
      });

      if (recovery.ok && recovery.payment_url) {
        return json(req, {
          payment_provider: "doku_checkout",
          payment_url: recovery.payment_url,
          payment_sdk_url: getDokuCheckoutSdkUrl(dokuEnv.isProduction),
          payment_due_date: recovery.provider_expired_at ??
            expiresAt.toISOString(),
          order_number: orderNumber,
          order_id: order.id,
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
      console.error(
        "[create-doku-ticket-checkout] DOKU error status:",
        dokuResponse.status,
      );
      console.error(
        "[create-doku-ticket-checkout] DOKU error body:",
        dokuResponseText,
      );
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
              body: dokuData ?? dokuResponseText,
            },
            status_recovery: {
              attempted: true,
              status_code: recovery.statusCode,
              request_id: recovery.requestId,
              request_timestamp: recovery.requestTimestamp,
              request_target: recovery.requestTarget,
              raw_response: recovery.data,
            },
            raw_response: dokuData ?? dokuResponseText,
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

        await persistTicketPaymentData({
          supabase,
          orderId: order.id,
          paymentData,
          paymentId: recovery.provider_payment_id,
          paymentUrl: recovery.payment_url,
        });

        if (recovery.ok && recovery.payment_url) {
          return json(req, {
            payment_provider: "doku_checkout",
            payment_url: recovery.payment_url,
            payment_sdk_url: getDokuCheckoutSdkUrl(dokuEnv.isProduction),
            payment_due_date: recovery.provider_expired_at ??
              expiresAt.toISOString(),
            order_number: orderNumber,
            order_id: order.id,
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

      await rollbackCreatedTicketOrder({
        supabase,
        orderId: order.id,
        holds: reservedHolds,
      });
      createdOrderId = null;
      reservedHolds = [];
      return jsonErrorWithDetails(req, 500, {
        error: "Failed to create payment checkout",
        code: "DOKU_CHECKOUT_FAILED",
        details: dokuData ?? dokuResponseText,
      });
    }

    const checkoutResponse = extractDokuCheckoutResponse(
      dokuData,
      dokuRequestId,
    );
    const paymentUrl = checkoutResponse.paymentUrl;
    const paymentId = checkoutResponse.paymentId;
    const providerExpiresAt = checkoutResponse.providerExpiresAt ??
      expiresAt.toISOString();

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
      await persistTicketPaymentData({
        supabase,
        orderId: order.id,
        paymentData,
        paymentId,
      });
      await rollbackCreatedTicketOrder({
        supabase,
        orderId: order.id,
        holds: reservedHolds,
      });
      createdOrderId = null;
      reservedHolds = [];
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
        provider_payment_id: paymentId,
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
        provider_payment_id: paymentId,
      },
    });

    await persistTicketPaymentData({
      supabase,
      orderId: order.id,
      paymentData,
      paymentId,
      paymentUrl,
    });

    return json(req, {
      payment_provider: "doku_checkout",
      payment_url: paymentUrl,
      payment_sdk_url: getDokuCheckoutSdkUrl(dokuEnv.isProduction),
      payment_due_date: providerExpiresAt,
      order_number: orderNumber,
      order_id: order.id,
    });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack : undefined;
    console.error("[create-doku-ticket-checkout] Unhandled error:", errMsg);
    console.error("[create-doku-ticket-checkout] Stack:", errStack);
    if (supabase && createdOrderId) {
      await rollbackCreatedTicketOrder({
        supabase,
        orderId: createdOrderId,
        holds: reservedHolds,
      });
    } else if (supabase && reservedHolds.length > 0) {
      await releaseReservedTicketHolds({ supabase, holds: reservedHolds });
    }
    return jsonErrorWithDetails(req, 500, {
      error: "Internal server error",
      code: "UNHANDLED_ERROR",
      details: errMsg,
    });
  }
});
