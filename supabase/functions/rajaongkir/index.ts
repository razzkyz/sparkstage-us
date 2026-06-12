import { handleCors, json, jsonError } from "../_shared/http.ts";

// @ts-ignore
const RAJAONGKIR_API_KEY = Deno.env.get("RAJAONGKIR_API_KEY");
const BASE_URL = "https://rajaongkir.komerce.id/api/v1/destination";

// Helper to detect rate limit or API errors
function parseApiError(
  data: any,
  statusCode: number,
): { message: string; code: string } | null {
  // Check HTTP status codes
  if (statusCode === 429) {
    return { message: "Daily request limit exceeded", code: "RATE_LIMIT" };
  }
  if (statusCode === 401 || statusCode === 403) {
    return { message: "Invalid or expired API key", code: "AUTH_ERROR" };
  }

  // Check meta.code in response
  if (data?.meta?.code === 429 || data?.meta?.code === 408) {
    return {
      message: "Daily request limit exceeded. Please try again tomorrow.",
      code: "RATE_LIMIT",
    };
  }
  if (data?.meta?.code === 401 || data?.meta?.code === 403) {
    return { message: "Invalid or expired API key", code: "AUTH_ERROR" };
  }

  // Check for rate limit keywords in message
  const message =
    data?.meta?.message?.toLowerCase() || data?.message?.toLowerCase() || "";
  if (
    message.includes("limit") ||
    message.includes("quota") ||
    message.includes("exceeded")
  ) {
    return {
      message: "Daily request limit exceeded. Please try again tomorrow.",
      code: "RATE_LIMIT",
    };
  }
  if (
    message.includes("key") ||
    message.includes("auth") ||
    message.includes("invalid")
  ) {
    return { message: "Invalid or expired API key", code: "AUTH_ERROR" };
  }

  return null;
}

// @ts-ignore
Deno.serve(async (req: Request) => {
  // 1. Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (!RAJAONGKIR_API_KEY) {
    console.error("RAJAONGKIR_API_KEY is not set");
    return jsonError(req, 500, "Missing RAJAONGKIR_API_KEY configuration");
  }

  try {
    const headers = {
      key: RAJAONGKIR_API_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
    };

    // Default Supabase invoke uses POST, so we parse the body
    let body: any = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch (e) {
        body = {};
      }
    }

    const action = body.action;
    const requestId = crypto.randomUUID();
    console.log(`[RajaOngkir:${requestId}] Processing action: ${action}`, {
      provinceId: body.province_id,
      timestamp: new Date().toISOString(),
    });

    // ─── AMBIL DAFTAR PROVINSI ───
    if (action === "provinces") {
      const response = await fetch(`${BASE_URL}/province`, {
        method: "GET",
        headers,
      });
      const data = await response.json().catch(() => ({}));

      console.log(
        `[RajaOngkir:${requestId}] Provinces API response status: ${response.status}`,
        {
          hasMetaCode: !!data?.meta?.code,
          metaCode: data?.meta?.code,
          metaMessage: data?.meta?.message,
          dataCount: Array.isArray(data?.data) ? data.data.length : 0,
        },
      );

      // Check for API errors
      const apiError = parseApiError(data, response.status);
      if (apiError) {
        console.error(
          `[RajaOngkir:${requestId}] API Error [${apiError.code}]: ${apiError.message}`,
        );
        return jsonError(
          req,
          apiError.code === "RATE_LIMIT" ? 429 : 401,
          apiError.message,
        );
      }

      if (!response.ok) {
        console.error(
          `[RajaOngkir:${requestId}] HTTP error: ${response.status} ${response.statusText}`,
        );
        return jsonError(
          req,
          response.status,
          `RajaOngkir API error: ${response.statusText}`,
        );
      }

      // Normalize response
      const results =
        data?.data || data?.rajaongkir?.results || data?.results || [];

      console.log(
        `[RajaOngkir:${requestId}] Provinces: Returned ${results.length} results`,
      );
      return json(req, { data: results });
    }

    // ─── AMBIL DAFTAR KOTA/KABUPATEN ───
    if (action === "cities") {
      const provinceId = body.province_id;
      const targetUrl = provinceId
        ? `${BASE_URL}/city/${provinceId}`
        : `${BASE_URL}/city`;

      const response = await fetch(targetUrl, { method: "GET", headers });
      const data = await response.json().catch(() => ({}));

      console.log(
        `[RajaOngkir:${requestId}] Cities (province ${provinceId}) API response status: ${response.status}`,
        {
          hasMetaCode: !!data?.meta?.code,
          metaCode: data?.meta?.code,
          metaMessage: data?.meta?.message,
          dataCount: Array.isArray(data?.data) ? data.data.length : 0,
        },
      );

      // Check for API errors
      const apiError = parseApiError(data, response.status);
      if (apiError) {
        console.error(
          `[RajaOngkir:${requestId}] API Error [${apiError.code}]: ${apiError.message}`,
        );
        return jsonError(
          req,
          apiError.code === "RATE_LIMIT" ? 429 : 401,
          apiError.message,
        );
      }

      if (!response.ok) {
        console.error(
          `[RajaOngkir:${requestId}] HTTP error: ${response.status} ${response.statusText}`,
        );
        return jsonError(
          req,
          response.status,
          `RajaOngkir API error: ${response.statusText}`,
        );
      }

      // Normalize response
      const results =
        data?.data || data?.rajaongkir?.results || data?.results || [];

      console.log(
        `[RajaOngkir:${requestId}] Cities (province ${provinceId}): Returned ${results.length} results`,
      );
      return json(req, { data: results });
    }

    // ─── AMBIL DAFTAR KECAMATAN (DISTRICT) ───
    if (action === "subdistricts") {
      const cityId = body.city_id;
      if (!cityId) {
        console.error(`[RajaOngkir:${requestId}] Missing city_id for subdistricts`);
        return jsonError(req, 400, "city_id is required for subdistricts");
      }

      // Use DISTRICT endpoint (not subdistrict) - this is the correct endpoint!
      const targetUrl = `${BASE_URL}/district/${cityId}`;
      
      console.log(
        `[RajaOngkir:${requestId}] Fetching districts from: ${targetUrl}`,
        { cityId }
      );

      const response = await fetch(targetUrl, { method: "GET", headers });
      const data = await response.json().catch(() => ({}));

      console.log(
        `[RajaOngkir:${requestId}] Districts (city ${cityId}) API response:`,
        {
          status: response.status,
          statusText: response.statusText,
          metaCode: data?.meta?.code,
          metaMessage: data?.meta?.message,
          dataCount: Array.isArray(data?.data) ? data.data.length : 0,
        }
      );

      // Check for API errors
      const apiError = parseApiError(data, response.status);
      if (apiError) {
        console.error(
          `[RajaOngkir:${requestId}] API Error [${apiError.code}]: ${apiError.message}`,
        );
        return jsonError(
          req,
          apiError.code === "RATE_LIMIT" ? 429 : 401,
          apiError.message,
        );
      }

      if (!response.ok) {
        console.error(
          `[RajaOngkir:${requestId}] HTTP error: ${response.status} ${response.statusText}`
        );
        return jsonError(
          req,
          response.status,
          `RajaOngkir API error: ${response.statusText}`,
        );
      }

      // Normalize response from Komerce format
      const results = data?.data || [];

      console.log(
        `[RajaOngkir:${requestId}] Districts (city ${cityId}): Returned ${results.length} results`,
      );
      
      return json(req, { data: results });
    }

    // ─── CEK ONGKOS KIRIM ───
    if (action === "cost") {
      const formParams = new URLSearchParams();
      if (body.origin) formParams.append("origin", body.origin);
      if (body.destination) formParams.append("destination", body.destination);
      if (body.weight) formParams.append("weight", body.weight.toString());
      if (body.courier) formParams.append("courier", body.courier);

      console.log(
        `[RajaOngkir:${requestId}] Cost calculation: origin=${body.origin}, dest=${body.destination}, weight=${body.weight}kg, courier=${body.courier}`,
      );

      const response = await fetch(
        "https://rajaongkir.komerce.id/api/v1/calculate/domestic-cost",
        {
          method: "POST",
          headers,
          body: formParams.toString(),
        },
      );

      const data = await response.json().catch(() => ({}));

      console.log(
        `[RajaOngkir:${requestId}] Cost API response status: ${response.status}`,
        {
          hasMetaCode: !!data?.meta?.code,
          metaCode: data?.meta?.code,
          metaMessage: data?.meta?.message,
        },
      );

      // Check for API errors
      const apiError = parseApiError(data, response.status);
      if (apiError) {
        console.error(
          `[RajaOngkir:${requestId}] API Error [${apiError.code}]: ${apiError.message}`,
        );
        return jsonError(
          req,
          apiError.code === "RATE_LIMIT" ? 429 : 401,
          apiError.message,
        );
      }

      if (!response.ok) {
        console.error(
          `[RajaOngkir:${requestId}] HTTP error: ${response.status} ${response.statusText}`,
        );
        return jsonError(
          req,
          response.status,
          `RajaOngkir API error: ${response.statusText}`,
        );
      }

      console.log(`[RajaOngkir:${requestId}] Cost calculation: Success`);
      return json(req, data);
    }

    return jsonError(req, 400, "Action tidak valid atau tidak ditemukan");
  } catch (error) {
    console.error(`[RajaOngkir: Unhandled error:`, error);
    return jsonError(
      req,
      500,
      `Internal Server Error: ${(error as Error).message}`,
    );
  }
});
