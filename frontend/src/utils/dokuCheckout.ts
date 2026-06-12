declare global {
  interface Window {
    loadJokulCheckout?: (paymentUrl: string) => void;
    JokulCheckout?: {
      closeCheckout?: () => void;
    };
  }
}

export type PaymentType = 'ticket' | 'product';

const PAYMENT_TYPE_KEY = 'doku_payment_type';
const PAYMENT_URL_KEY = 'doku_payment_url';
const PAYMENT_INVOICE_KEY = 'doku_invoice_number';

function getDokuCheckoutScriptUrl() {
  const isProduction = import.meta.env.VITE_DOKU_IS_PRODUCTION === 'true';
  return isProduction
    ? 'https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js'
    : 'https://sandbox.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js';
}

export function loadDokuCheckoutScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.loadJokulCheckout) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-doku-checkout="true"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => {
        // Make window properties configurable to allow DOKU library cleanup
        makeWindowPropertiesConfigurable();
        resolve();
      }, { once: true });
      existingScript.addEventListener('error', () => reject(new Error('Failed to load DOKU Checkout')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = getDokuCheckoutScriptUrl();
    script.async = true;
    script.dataset.dokuCheckout = 'true';
    script.onload = () => {
      // Make window properties configurable to allow DOKU library cleanup
      makeWindowPropertiesConfigurable();
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load DOKU Checkout'));
    document.head.appendChild(script);
  });
}

/**
 * Ensures DOKU-related window properties are configurable so the DOKU library can delete them.
 * Fixes: "Cannot delete property 'loadJokulCheckout' of #<Window>"
 */
function makeWindowPropertiesConfigurable() {
  const propertiesToMakeConfigurable = ['loadJokulCheckout', 'JokulCheckout'];
  
  for (const prop of propertiesToMakeConfigurable) {
    if (prop in window) {
      const descriptor = Object.getOwnPropertyDescriptor(window, prop);
      if (descriptor && !descriptor.configurable) {
        try {
          Object.defineProperty(window, prop, {
            ...descriptor,
            configurable: true,
          });
        } catch (err) {
          console.warn(`[dokuCheckout] Failed to make ${prop} configurable:`, err);
        }
      }
    }
  }
}

/**
 * Reset DOKU SDK state to prevent payment session reuse.
 * Must be called before opening a new checkout to ensure clean payment context.
 * Fixes: "saat user cancel payment: popup berikutnya wajib generate payment baru"
 */
export function resetDokuCheckoutState() {
  // Close any open DOKU checkout popup
  if (window.JokulCheckout?.closeCheckout) {
    try {
      window.JokulCheckout.closeCheckout();
    } catch (err) {
      console.warn('[dokuCheckout] Failed to close DOKU popup:', err);
    }
  }

  // Remove DOKU overlay/modal elements if they exist
  const dokuOverlay = document.querySelector('[data-doku-overlay], .jokul-checkout-overlay, .jokul-overlay');
  if (dokuOverlay) {
    dokuOverlay.remove();
  }

  // Clear DOKU popup state only (not the script loader function)
  // Keeps loadJokulCheckout intact so we can open new checkouts
  // Use assignment instead of delete to avoid strict mode errors
  window.JokulCheckout = undefined;

  console.log('[dokuCheckout] DOKU checkout state reset for clean payment session');
}

export function openDokuCheckout(paymentUrl: string, invoiceNumber?: string) {
  if (!window.loadJokulCheckout) {
    throw new Error('DOKU Checkout is not loaded yet.');
  }

  console.log('[dokuCheckout] Opening DOKU checkout with URL:', paymentUrl);
  
  if (invoiceNumber) {
    const invoicePrefix = invoiceNumber.substring(0, 4);
    const invoiceType = invoicePrefix === 'PRD-' ? 'PRODUCT' : invoicePrefix === 'SPK-' ? 'TICKET' : 'UNKNOWN';
    console.log('[dokuCheckout] Invoice type from order number:', invoiceType, `(${invoicePrefix})`);
  }
  
  window.loadJokulCheckout(paymentUrl);
}

/**
 * Store payment context to detect and prevent cross-payment-type reuse
 * CRITICAL: Ticket and Product payments must NEVER share state
 */
export function storePaymentContext(paymentType: PaymentType, invoiceNumber: string, paymentUrl: string) {
  try {
    sessionStorage.setItem(PAYMENT_TYPE_KEY, paymentType);
    sessionStorage.setItem(PAYMENT_INVOICE_KEY, invoiceNumber);
    sessionStorage.setItem(PAYMENT_URL_KEY, paymentUrl);
    console.log(`[dokuCheckout] Payment context stored: ${paymentType} invoice=${invoiceNumber}`);
  } catch (err) {
    console.warn('[dokuCheckout] Failed to store payment context:', err);
  }
}

/**
 * Get current payment context to validate payment type isolation
 */
export function getPaymentContext(): { paymentType: PaymentType | null; invoiceNumber: string | null; paymentUrl: string | null } {
  try {
    return {
      paymentType: (sessionStorage.getItem(PAYMENT_TYPE_KEY) || null) as PaymentType | null,
      invoiceNumber: sessionStorage.getItem(PAYMENT_INVOICE_KEY) || null,
      paymentUrl: sessionStorage.getItem(PAYMENT_URL_KEY) || null,
    };
  } catch (err) {
    console.warn('[dokuCheckout] Failed to read payment context:', err);
    return { paymentType: null, invoiceNumber: null, paymentUrl: null };
  }
}

/**
 * Clear all payment session data when switching payment types
 * CRITICAL: Must be called when navigating from Product → Ticket checkout
 * Prevents old PRD invoice from appearing in Ticket payment popup
 */
export function clearAllPaymentSessions() {
  try {
    // Close any open DOKU popup
    resetDokuCheckoutState();
    
    // Clear all payment-related sessionStorage keys
    sessionStorage.removeItem(PAYMENT_TYPE_KEY);
    sessionStorage.removeItem(PAYMENT_INVOICE_KEY);
    sessionStorage.removeItem(PAYMENT_URL_KEY);
    
    // Clear browser cache of payment URLs (force fresh fetch from server)
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          caches.open(cacheName).then(cache => {
            cache.keys().then(requests => {
              requests.forEach(request => {
                if (request.url.includes('doku') || request.url.includes('payment')) {
                  cache.delete(request);
                }
              });
            });
          });
        });
      }).catch(() => {
        // Cache API not available in this context
      });
    }
    
    console.log('[dokuCheckout] All payment sessions cleared - ready for fresh payment');
  } catch (err) {
    console.warn('[dokuCheckout] Error clearing payment sessions:', err);
  }
}

/**
 * Validate that payment type matches invoice prefix (PRD vs SPK)
 * CRITICAL: Detect when wrong payment type is being used
 */
export function validatePaymentTypeMatch(paymentType: PaymentType, invoiceNumber: string): boolean {
  const expectedPrefix = paymentType === 'ticket' ? 'SPK-' : 'PRD-';
  const actualPrefix = invoiceNumber.substring(0, 4);
  
  if (actualPrefix !== expectedPrefix) {
    console.error(
      `[dokuCheckout] PAYMENT TYPE MISMATCH: Expected ${paymentType} (${expectedPrefix}) but got invoice ${invoiceNumber}`,
    );
    return false;
  }
  
  return true;
}
