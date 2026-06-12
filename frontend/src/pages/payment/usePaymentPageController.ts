import { useEffect, useMemo, useState } from 'react';
import type { NavigateFunction, Location } from 'react-router-dom';
import { loadDokuCheckoutScript, openDokuCheckout, resetDokuCheckoutState, clearAllPaymentSessions, storePaymentContext, validatePaymentTypeMatch } from '../../utils/dokuCheckout';
import {
  restoreBookingState,
  hasBookingState,
  clearBookingState,
} from '../../utils/bookingStateManager';
import { SessionErrorHandler } from '../../utils/sessionErrorHandler';
import { buildBookingSuccessState, getPaymentBookingDetails, hasRequiredPaymentDetails } from './paymentHelpers';
import { createCheckoutPayment, validatePaymentSession } from './paymentDoku';
import type { PaymentLocationState, PreservedBookingData } from './paymentTypes';

type UsePaymentPageControllerParams = {
  location: Location;
  navigate: NavigateFunction;
  locationState: PaymentLocationState;
  user: {
    email?: string | null;
    user_metadata?: { name?: string | null };
  } | null;
};

export function usePaymentPageController({
  location,
  navigate,
  locationState,
  user,
}: UsePaymentPageControllerParams) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [checkoutReady, setCheckoutReady] = useState(false);

  const bookingDetails = useMemo(() => getPaymentBookingDetails(locationState), [locationState]);

  useEffect(() => {
    loadDokuCheckoutScript()
      .then(() => setCheckoutReady(true))
      .catch((loadError) => {
        console.error('Failed to load DOKU Checkout:', loadError);
        setError('Failed to load payment system. Please refresh the page.');
      });

    // CRITICAL: Clear all old payment sessions when entering ticket checkout
    // Prevents product payment PRD- invoice from being reused in ticket payment
    // Must happen BEFORE page setup to ensure clean payment context
    clearAllPaymentSessions();

    // Cleanup: Reset DOKU state when component unmounts to prevent session reuse
    // Fixes: "saat user cancel payment popup: payment session lama harus dihapus"
    return () => {
      resetDokuCheckoutState();
    };
  }, []);

  useEffect(() => {
    if (user?.user_metadata?.name) {
      setCustomerName(user.user_metadata.name);
      return;
    }
    if (user?.email) {
      setCustomerName(user.email.split('@')[0] || '');
    }
  }, [user]);

  useEffect(() => {
    if (hasRequiredPaymentDetails(bookingDetails)) {
      return;
    }

    if (hasBookingState()) {
      const restored = restoreBookingState();
      if (restored) {
        console.log('Restoring booking state after session recovery');
        navigate(location.pathname, { state: restored, replace: true });
        return;
      }
    }

    setError(
      "We couldn't find your booking details. Your selection may have timed out. Please go back and select your session again."
    );
  }, [bookingDetails, location.pathname, navigate]);

  const errorHandler = useMemo(
    () =>
      new SessionErrorHandler({
        onSessionExpired: (returnPath, state) => {
          navigate('/login', { state: { returnTo: returnPath, returnState: state } });
        },
        preserveState: true,
      }),
    [navigate]
  );

  const handlePay = async () => {
    if (!user) {
      setError("Please log in to complete your payment. We'll save your booking details so you can continue immediately after signing in.");
      navigate('/login', { state: { returnTo: location.pathname, returnState: locationState } });
      return;
    }

    if (!customerName.trim()) {
      setError('Harap isi nama Anda untuk melanjutkan');
      return;
    }


    setLoading(true);
    setError(null);

    const bookingData: PreservedBookingData = {
      ticketId: bookingDetails.ticketId,
      ticketName: bookingDetails.ticketName,
      ticketType: bookingDetails.ticketType,
      price: bookingDetails.price,
      date: bookingDetails.bookingDate,
      time: bookingDetails.timeSlot,
      quantity: bookingDetails.quantity,
      total: bookingDetails.total,
    };

    try {
      console.log('[PaymentPage] Validating session with getUser()...');
      const { session, error: sessionError } = await validatePaymentSession();

      if (sessionError || !session?.access_token) {
        console.error('[PaymentPage] Session validation failed:', sessionError);
        setError("Your session has expired. We've saved your booking details, so please log in again to complete payment.");
        await errorHandler.handleAuthError({ status: 401 }, { returnPath: location.pathname, state: bookingData });
        return;
      }

      console.log('[PaymentPage] Session validated and refreshed successfully');

      const response = await createCheckoutPayment({
        booking: bookingDetails,
        customerName: customerName.trim(),
        customerEmail: user.email || '',
        customerPhone: customerPhone.trim() || undefined,
        token: session.access_token,
      });

      if (!checkoutReady) {
        throw new Error('Payment system is still loading. Please try again.');
      }

      // CRITICAL: Validate payment type isolation - SPK invoice for tickets ONLY
      if (!validatePaymentTypeMatch('ticket', response.order_number)) {
        throw new Error('Invalid ticket payment session. Please refresh and try again.');
      }

      clearBookingState();
      
      // Reset DOKU state TWICE to ensure old payment session completely gone
      // First reset closes the old popup, second reset clears SDK state
      resetDokuCheckoutState();
      
      // Store new payment context for isolation validation
      storePaymentContext('ticket', response.order_number, response.payment_url);
      
      // Open fresh payment popup with correct SPK invoice
      openDokuCheckout(response.payment_url, response.order_number);
      navigate(`/booking-success?order_id=${encodeURIComponent(response.order_number)}&pending=1`, {
        state: buildBookingSuccessState({
          orderNumber: response.order_number,
          orderId: response.order_id,
          ticketName: bookingDetails.ticketName,
          total: bookingDetails.total,
          date: bookingDetails.bookingDate,
          time: bookingDetails.timeSlot,
          customerName: customerName.trim(),
        }),
      });
    } catch (paymentError) {
      if ((paymentError as { status?: number }).status === 401) {
        console.error('Auth error from edge function:', paymentError);
        setError("Your session timed out for security. Your booking details are still saved, so please log in again to finish.");
        await errorHandler.handleAuthError({ status: 401 }, { returnPath: location.pathname, state: bookingData });
        return;
      }

      console.error('Payment error:', paymentError);
      
      // Extract detailed error message including server details if available
      const errorMessage = paymentError instanceof Error ? paymentError.message : 'Failed to process payment';
      const errorDetails = (paymentError as { details?: unknown }).details;
      const detailedMessage = errorDetails 
        ? typeof errorDetails === 'string' 
          ? errorDetails 
          : typeof errorDetails === 'object'
            ? JSON.stringify(errorDetails)
            : String(errorDetails)
        : null;
      
      const userMessage = detailedMessage 
        ? `Payment processing failed: ${errorMessage}. Details: ${detailedMessage}`
        : errorMessage;
      
      setError(userMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    customerName,
    customerPhone,
    checkoutReady,
    bookingDetails,
    setCustomerName,
    setCustomerPhone,
    handlePay,
  };
}
