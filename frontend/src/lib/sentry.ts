/**
 * Sentry Error Tracking Configuration
 * Phase 4: Production monitoring & error tracking setup
 * 
 * Initialize Sentry for frontend error tracking, performance monitoring,
 * and user session tracking in production environment
 */

import * as Sentry from '@sentry/react'

export function initializeSentry() {
  const isDevelopment = import.meta.env.DEV
  const sentryDsn = import.meta.env.VITE_SENTRY_DSN

  if (isDevelopment || !sentryDsn) {
    console.log('[Sentry] Skipping initialization in development or missing DSN')
    return
  }

  Sentry.init({
    // ===== Core Configuration =====
    dsn: sentryDsn,
    environment: import.meta.env.VITE_ENV || 'production',
    release: import.meta.env.VITE_APP_VERSION || '1.0.0',
    tracesSampleRate: 0.1, // 10% of transactions

    // ===== Error Handling =====
    beforeSend(event: any, hint: any) {
      // Filter out specific errors
      if (event.exception) {
        const error = hint.originalException as Error
        
        // Ignore network errors and timeouts
        if (error?.message?.includes('NetworkError')) return null
        if (error?.message?.includes('timeout')) return null
        if (error?.message?.includes('cancelled')) return null
      }

      return event
    },

    // ===== Session Tracking =====
    attachStacktrace: true,
    maxBreadcrumbs: 50,
    
    // ===== Ignored Errors =====
    ignoreErrors: [
      // Browser extensions
      'top.GLOBALS',
      // Random plugins/extensions
      'chrome-extension://',
      'moz-extension://',
      // Common spurious errors
      'Non-Error promise rejection captured',
      'Network request failed',
      'Load failed',
    ],

    // ===== Denylisted URLs =====
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  })

  console.log('[Sentry] Initialized for production monitoring')
}

/**
 * Set user context for error tracking
 * Call after user authenticates
 */
export function setSentryUser(userId: string | null, email?: string, name?: string) {
  if (userId) {
    Sentry.setUser({
      id: userId,
      email: email || undefined,
      username: name || undefined,
    })
  } else {
    Sentry.setUser(null)
  }
}

/**
 * Capture checkout errors specifically
 * Used in ProductCheckoutPage error boundary
 */
export function captureCheckoutError(error: Error, context: Record<string, any>) {
  Sentry.captureException(error, {
    tags: {
      operation: 'checkout',
      type: context.type || 'payment',
    },
    extra: {
      ...context,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Capture referral system errors
 * Used in referral code application
 */
export function captureReferralError(error: Error, referralCode?: string) {
  Sentry.captureException(error, {
    tags: {
      operation: 'referral',
      referralCode: referralCode || 'unknown',
    },
    level: 'warning',
  })
}

/**
 * Capture rate limit events
 * Track when users hit rate limits
 */
export function captureRateLimit(userId: string, endpoint: string) {
  Sentry.captureMessage('Rate limit exceeded', {
    level: 'warning',
    tags: {
      event: 'rate_limit',
      endpoint,
    },
    extra: {
      userId,
      timestamp: new Date().toISOString(),
    },
  })
}

/**
 * Track performance metrics
 */
export function trackPerformanceMetric(metricName: string, value: number, unit = 'ms') {
  Sentry.captureMessage(`Performance: ${metricName}`, {
    level: 'info',
    tags: {
      metric: metricName,
    },
    extra: {
      value,
      unit,
    },
  })
}

/**
 * Sentry Error Boundary Component
 * Wrap around pages that might have errors
 */
export const SentryErrorBoundary = Sentry.withErrorBoundary
