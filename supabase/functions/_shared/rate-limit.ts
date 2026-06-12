/**
 * Rate Limiting Middleware for Sensitive Operations
 * Prevents brute force attacks on:
 * - Checkout endpoints
 * - Login attempts
 * - Ticket validation
 * - OTP/2FA endpoints
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // milliseconds
  keyPrefix: string;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Check if a request should be rate limited
 * Uses a simple counter stored in Supabase
 */
export async function checkRateLimit(
  supabaseClient: any,
  identifier: string, // IP, user_id, email, etc.
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `${config.keyPrefix}:${identifier}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  try {
    // Get current request count for this identifier
    const { data, error } = await supabaseClient
      .from('rate_limit_logs')
      .select('request_count, window_start')
      .eq('key', key)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found (first request)
      throw error;
    }

    const existingRecord = data;

    // If window has passed, reset counter
    if (existingRecord && existingRecord.window_start < windowStart) {
      await supabaseClient
        .from('rate_limit_logs')
        .update({
          request_count: 1,
          window_start: now,
          last_request_at: now,
        })
        .eq('key', key);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: now + config.windowMs,
      };
    }

    // Check if limit exceeded
    const newCount = (existingRecord?.request_count ?? 0) + 1;
    const isAllowed = newCount <= config.maxRequests;

    // Update counter
    if (existingRecord) {
      await supabaseClient
        .from('rate_limit_logs')
        .update({
          request_count: newCount,
          last_request_at: now,
        })
        .eq('key', key);
    } else {
      await supabaseClient
        .from('rate_limit_logs')
        .insert([
          {
            key,
            request_count: 1,
            window_start: now,
            last_request_at: now,
          },
        ]);
    }

    const resetTime =
      existingRecord?.window_start + config.windowMs || now + config.windowMs;

    return {
      allowed: isAllowed,
      remaining: Math.max(0, config.maxRequests - newCount),
      resetTime,
      retryAfter: !isAllowed
        ? Math.ceil((resetTime - now) / 1000)
        : undefined,
    };
  } catch (error) {
    console.error('Rate limit check error:', error);
    // On error, allow the request but log it
    return {
      allowed: true,
      remaining: config.maxRequests,
      resetTime: now + config.windowMs,
    };
  }
}

/**
 * Common rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
  LOGIN: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    keyPrefix: 'login',
  },
  CHECKOUT: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'checkout',
  },
  TICKET_VALIDATION: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'ticket_validation',
  },
  OTP: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
    keyPrefix: 'otp',
  },
  API_GENERAL: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    keyPrefix: 'api_general',
  },
};

/**
 * Format rate limit response for HTTP
 */
export function getRateLimitHeaders(result: RateLimitResult) {
  return {
    'X-RateLimit-Limit': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
    ...(result.retryAfter && { 'Retry-After': String(result.retryAfter) }),
  };
}
