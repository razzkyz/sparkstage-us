const DOKU_CHECKOUT_PATH = "/checkout/v1/payment";
const DOKU_STATUS_PATH_PREFIX = "/orders/v1/status/";
const DOKU_SAFE_CHARS = /[^a-zA-Z0-9 .\-/+,=_:'@%]/g;
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "[::1]"]);

function toBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

async function sha256Base64(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return toBase64(new Uint8Array(digest));
}

async function hmacSha256Base64(params: {
  secretKey: string;
  value: string;
}) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(params.secretKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(params.value),
  );
  return toBase64(new Uint8Array(signature));
}

function normalizeIsoTimestamp(value: string) {
  return value.replace(/\.\d{3}Z$/, "Z");
}

export function getDokuApiBaseUrl(isProduction: boolean) {
  return isProduction ? "https://api.doku.com" : "https://api-sandbox.doku.com";
}

export function getDokuCheckoutSdkUrl(isProduction: boolean) {
  return isProduction
    ? "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js"
    : "https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js";
}

export function getDokuCheckoutPath() {
  return DOKU_CHECKOUT_PATH;
}

export function getDokuStatusPath(orderNumber: string) {
  return `${DOKU_STATUS_PATH_PREFIX}${encodeURIComponent(orderNumber)}`;
}

function normalizeOriginLike(value: string) {
  try {
    const url = new URL(value.trim());
    return `${url.protocol}//${url.host}`;
  } catch {
    return value.trim().replace(/\/+$/, "");
  }
}

function isLocalOrigin(value: string) {
  try {
    return LOCAL_HOSTNAMES.has(new URL(value).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function assertDokuCheckoutModeGuard(params: {
  isProduction: boolean;
  appUrl: string;
  requestOrigin?: string | null;
  allowedOrigins?: string[];
  paymentMethodTypes?: string[];
}) {
  if (!params.isProduction) return;

  const appUrl = normalizeOriginLike(params.appUrl);
  if (!appUrl) {
    throw new Error("PUBLIC_APP_URL is required for DOKU production checkout");
  }

  let parsedAppUrl: URL;
  try {
    parsedAppUrl = new URL(appUrl);
  } catch {
    throw new Error(
      "PUBLIC_APP_URL must be a valid absolute URL for DOKU production checkout",
    );
  }

  if (parsedAppUrl.protocol !== "https:") {
    throw new Error("PUBLIC_APP_URL must use https in DOKU production mode");
  }

  if (LOCAL_HOSTNAMES.has(parsedAppUrl.hostname.toLowerCase())) {
    throw new Error(
      "PUBLIC_APP_URL cannot point to localhost in DOKU production mode",
    );
  }

  const requestOrigin = normalizeOriginLike(params.requestOrigin ?? "");
  if (requestOrigin) {
    if (isLocalOrigin(requestOrigin)) {
      throw new Error(
        "Production DOKU checkout cannot be created from localhost origin",
      );
    }

    const allowedOrigins = Array.from(
      new Set(
        (params.allowedOrigins ?? []).map((origin) =>
          normalizeOriginLike(origin)
        ).filter(Boolean),
      ),
    );
    if (allowedOrigins.length > 0 && !allowedOrigins.includes(requestOrigin)) {
      throw new Error(
        `Origin ${requestOrigin} is not allowed for DOKU production checkout`,
      );
    }
  }

  const snapScopedTypes = (params.paymentMethodTypes ?? []).filter((value) =>
    value.toUpperCase().includes("SNAP")
  );
  if (snapScopedTypes.length > 0) {
    throw new Error(
      `SNAP payment methods are outside the current launch scope: ${
        snapScopedTypes.join(", ")
      }`,
    );
  }
}

export function sanitizeDokuString(value: string, maxLength?: number) {
  const cleaned = value.replace(DOKU_SAFE_CHARS, "").replace(/\s+/g, " ")
    .trim();
  return maxLength ? cleaned.substring(0, maxLength) : cleaned;
}

export function createDokuRequestId() {
  return crypto.randomUUID();
}

export function createDokuRequestTimestamp() {
  return normalizeIsoTimestamp(new Date().toISOString());
}

export async function createDokuSignature(params: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  secretKey: string;
  body?: string | null;
}) {
  const digest = typeof params.body === "string"
    ? await sha256Base64(params.body)
    : null;

  const signatureLines = [
    `Client-Id:${params.clientId}`,
    `Request-Id:${params.requestId}`,
    `Request-Timestamp:${params.requestTimestamp}`,
    `Request-Target:${params.requestTarget}`,
  ];

  if (digest) {
    signatureLines.push(`Digest:${digest}`);
  }

  const value = signatureLines.join("\n");
  const signedValue = await hmacSha256Base64({
    secretKey: params.secretKey,
    value,
  });

  return {
    digest,
    signature: `HMACSHA256=${signedValue}`,
  };
}

export async function buildDokuRequestHeaders(params: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  secretKey: string;
  body?: string | null;
}) {
  const { signature, digest } = await createDokuSignature(params);
  const headers: Record<string, string> = {
    "Client-Id": params.clientId,
    "Request-Id": params.requestId,
    "Request-Timestamp": params.requestTimestamp,
    Signature: signature,
  };
  if (digest) {
    headers["Digest"] = digest;
  }
  return headers;
}

export async function verifyDokuSignature(params: {
  clientId: string;
  requestId: string;
  requestTimestamp: string;
  requestTarget: string;
  secretKey: string;
  rawBody: string;
  providedSignature: string;
}) {
  const { signature } = await createDokuSignature({
    clientId: params.clientId,
    requestId: params.requestId,
    requestTimestamp: params.requestTimestamp,
    requestTarget: params.requestTarget,
    secretKey: params.secretKey,
    body: params.rawBody,
  });

  return signature === params.providedSignature.trim();
}

export function parseDokuExpiredDate(value: unknown): string | null {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second] = match;
  const parsed = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`,
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function mapDokuStatus(
  transactionStatus: unknown,
  orderStatus?: unknown,
): string {
  const tx = String(transactionStatus || "").trim().toUpperCase();
  const order = String(orderStatus || "").trim().toUpperCase();

  if (tx === "SUCCESS") return "paid";
  if (tx === "REFUNDED") return "refunded";
  if (tx === "EXPIRED" || order === "ORDER_EXPIRED") return "expired";
  if (tx === "FAILED") return "failed";
  if (tx === "PENDING" || tx === "TIMEOUT" || tx === "REDIRECT") {
    return "pending";
  }
  if (order === "ORDER_GENERATED" || order === "ORDER_RECOVERED") {
    return "pending";
  }

  return "pending";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function extractAttemptHistory(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item) => typeof item === "object" && item !== null)
    .slice(-9) as Record<string, unknown>[];
}

export function getDokuResponsePayload(data: unknown) {
  const root = asRecord(data) ?? {};
  return asRecord(root.response) ?? {};
}

export function getDokuOrderPayload(data: unknown) {
  return asRecord(getDokuResponsePayload(data).order) ?? {};
}

export function getDokuPaymentPayload(data: unknown) {
  return asRecord(getDokuResponsePayload(data).payment) ?? {};
}

export function getDokuRawOrderPayload(data: unknown) {
  const root = asRecord(data) ?? {};
  return asRecord(root.order) ?? {};
}

export function getDokuRawTransactionPayload(data: unknown) {
  const root = asRecord(data) ?? {};
  return asRecord(root.transaction) ?? {};
}

export function getDokuRawPaymentPayload(data: unknown) {
  const root = asRecord(data) ?? {};
  return asRecord(root.payment) ?? {};
}

export function summarizeDokuHttpResponse(response: Response) {
  const responseId = response.headers.get("Request-Id") ??
    response.headers.get("request-id") ?? null;
  const location = response.headers.get("Location") ??
    response.headers.get("location") ?? null;

  return {
    status: response.status,
    status_text: response.statusText,
    request_id: responseId,
    location,
  };
}

export function extractDokuStatusSnapshot(data: unknown) {
  const orderPayload = getDokuRawOrderPayload(data);
  const transactionPayload = getDokuRawTransactionPayload(data);
  const paymentPayload = getDokuRawPaymentPayload(data);

  const orderStatus = String(orderPayload.status || "").trim() || null;
  const transactionStatus = String(transactionPayload.status || "").trim() ||
    null;

  return {
    provider_status: mapDokuStatus(transactionStatus, orderStatus),
    provider_order_status: orderStatus,
    provider_transaction_status: transactionStatus,
    payment_url: String(paymentPayload.url || "").trim() || null,
    provider_payment_id:
      String(paymentPayload.token_id || orderPayload.session_id || "").trim() ||
      null,
    provider_expired_at: parseDokuExpiredDate(paymentPayload.expired_date),
  };
}

export function extractDokuCheckoutResponse(
  data: unknown,
  fallbackPaymentId: string,
) {
  const orderPayload = getDokuOrderPayload(data);
  const paymentPayload = getDokuPaymentPayload(data);
  const providerOrderStatus = String(orderPayload.status || "").trim() || null;
  const providerTransactionStatus =
    String(paymentPayload.status || "").trim() || null;

  return {
    paymentUrl: String(paymentPayload.url || "").trim(),
    paymentId: String(
      paymentPayload.token_id || orderPayload.session_id ||
        fallbackPaymentId || "",
    ).trim() || null,
    providerExpiresAt: parseDokuExpiredDate(paymentPayload.expired_date),
    providerStatus: mapDokuStatus(
      providerTransactionStatus,
      providerOrderStatus,
    ),
    providerOrderStatus,
    providerTransactionStatus,
  };
}

export function mergeDokuPaymentData(params: {
  existing: unknown;
  patch?: Record<string, unknown>;
  attempt?: Record<string, unknown> | null;
}) {
  const base = asRecord(params.existing) ?? {};
  const attempts = extractAttemptHistory(base.attempts);
  const nextAttempts = params.attempt
    ? [...attempts, params.attempt]
    : attempts;

  return {
    ...base,
    ...(params.patch ?? {}),
    attempts: nextAttempts,
  };
}

export async function fetchDokuOrderStatus(params: {
  clientId: string;
  secretKey: string;
  isProduction: boolean;
  orderNumber: string;
}) {
  const requestId = createDokuRequestId();
  const requestTimestamp = createDokuRequestTimestamp();
  const requestTarget = getDokuStatusPath(params.orderNumber);
  const url = `${getDokuApiBaseUrl(params.isProduction)}${requestTarget}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      ...await buildDokuRequestHeaders({
        clientId: params.clientId,
        requestId,
        requestTimestamp,
        requestTarget,
        secretKey: params.secretKey,
      }),
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  const data = await response.json().catch(() => null);
  const snapshot = extractDokuStatusSnapshot(data);

  return {
    ok: response.ok,
    statusCode: response.status,
    requestId,
    requestTimestamp,
    requestTarget,
    data,
    ...snapshot,
  };
}
