function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function readCsvList(name: string): string[] {
  const value = Deno.env.get(name);
  if (!value) return [];

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readUrlList(name: string): string[] {
  const value = Deno.env.get(name);
  if (!value) return [];

  return value
    .split(",")
    .map((item) => normalizeUrl(item))
    .filter(Boolean);
}

export function getSupabaseEnv() {
  return {
    url: getRequiredEnv("SUPABASE_URL"),
    anonKey: getRequiredEnv("SUPABASE_ANON_KEY"),
    serviceRoleKey: getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  };
}

export function getDokuEnv() {
  const isProduction =
    (Deno.env.get("DOKU_IS_PRODUCTION") ?? "").toLowerCase() === "true";
  const secretKey = Deno.env.get("DOKU_SECRET_KEY") ||
    Deno.env.get("DOKU_CLIENT_SECRET") ||
    Deno.env.get("DOKU_SHARED_KEY");

  if (!secretKey) {
    throw new Error("Missing env: DOKU_SECRET_KEY");
  }

  const frontendMode = Deno.env.get("VITE_DOKU_IS_PRODUCTION");
  if (typeof frontendMode === "string" && frontendMode.trim()) {
    const frontendIsProduction = frontendMode.trim().toLowerCase() === "true";
    if (frontendIsProduction !== isProduction) {
      throw new Error(
        "DOKU mode mismatch: DOKU_IS_PRODUCTION and VITE_DOKU_IS_PRODUCTION disagree",
      );
    }
  }

  return {
    clientId: getRequiredEnv("DOKU_CLIENT_ID"),
    secretKey,
    isProduction,
    paymentMethodTypes: Array.from(
      new Set([
        ...readCsvList("DOKU_PAYMENT_METHOD_TYPES"),
        ...readCsvList("DOKU_ALLOWED_PAYMENT_METHOD_TYPES"),
      ]),
    ),
  };
}

export function getImageKitEnv() {
  const productImagesBasePathRaw =
    Deno.env.get("IMAGEKIT_PRODUCT_IMAGES_BASE_PATH") ?? "/products";
  const normalizedBasePath = `/${
    productImagesBasePathRaw.replace(/^\/+|\/+$/g, "")
  }`.replace(/\/{2,}/g, "/");
  return {
    publicKey: getRequiredEnv("IMAGEKIT_PUBLIC_KEY"),
    privateKey: getRequiredEnv("IMAGEKIT_PRIVATE_KEY"),
    urlEndpoint: getRequiredEnv("IMAGEKIT_URL_ENDPOINT").replace(/\/+$/, ""),
    productImagesBasePath: normalizedBasePath === "/"
      ? "/products"
      : normalizedBasePath,
  };
}

export function getAllowedAppOrigins(): string[] {
  const values = [
    ...readUrlList("APP_ALLOWED_ORIGINS"),
    ...readUrlList("ALLOWED_CORS_ORIGINS"),
    Deno.env.get("PUBLIC_APP_URL"),
    Deno.env.get("SITE_URL"),
    Deno.env.get("VITE_PUBLIC_APP_URL"),
    Deno.env.get("VITE_APP_URL"),
  ];

  return Array.from(
    new Set(
      values
        .map((value) => (typeof value === "string" ? normalizeUrl(value) : ""))
        .filter(Boolean),
    ),
  );
}

export function getPublicAppUrl(): string | null {
  const preferredValues = [
    Deno.env.get("PUBLIC_APP_URL"),
    Deno.env.get("APP_URL"),
    Deno.env.get("SITE_URL"),
    Deno.env.get("VITE_PUBLIC_APP_URL"),
    Deno.env.get("VITE_APP_URL"),
  ];

  const preferred = preferredValues
    .map((value) => (typeof value === "string" ? normalizeUrl(value) : ""))
    .find(Boolean);

  return preferred || getAllowedAppOrigins()[0] || null;
}

export function getDokuWhatsAppEnv() {
  const isEnabled =
    (Deno.env.get("DOKU_WHATSAPP_ENABLED") ?? "").toLowerCase() === "true";

  if (!isEnabled) {
    return {
      isEnabled: false,
      clientId: "",
      secretKey: "",
      ticketConfirmationTemplateId: "",
      isProduction: false,
    };
  }

  return {
    isEnabled: true,
    clientId: getRequiredEnv("DOKU_CLIENT_ID"),
    secretKey:
      Deno.env.get("DOKU_SECRET_KEY") ||
      Deno.env.get("DOKU_CLIENT_SECRET") ||
      Deno.env.get("DOKU_SHARED_KEY") ||
      "",
    ticketConfirmationTemplateId: getRequiredEnv(
      "DOKU_WHATSAPP_TICKET_CONFIRMATION_TEMPLATE_ID",
    ),
    isProduction:
      (Deno.env.get("DOKU_IS_PRODUCTION") ?? "").toLowerCase() === "true",
  };
}

export function getFontneEnv() {
  const isEnabled =
    (Deno.env.get("FONNTE_ENABLED") ?? "").toLowerCase() === "true";

  if (!isEnabled) {
    return {
      isEnabled: false,
      deviceToken: "",
    };
  }

  return {
    isEnabled: true,
    deviceToken: getRequiredEnv("FONNTE_DEVICE_TOKEN"),
  };
}
