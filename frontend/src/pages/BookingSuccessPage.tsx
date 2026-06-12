import { useLocation, useSearchParams } from 'react-router-dom';
import { getOrderStatusPresentation } from '../utils/paymentStatus';
import { useAuth } from '../contexts/AuthContext';
import BookingSuccessSkeleton from '../components/skeletons/BookingSuccessSkeleton';
import { BookingOrderInfo } from './booking-success/BookingOrderInfo';
import { BookingSuccessActions } from './booking-success/BookingSuccessActions';
import { BookingSuccessHero } from './booking-success/BookingSuccessHero';
import { BookingSuccessPendingState } from './booking-success/BookingSuccessPendingState';
import { BookingTicketCard } from './booking-success/BookingTicketCard';
import type { BookingSuccessLocationState } from './booking-success/bookingSuccessTypes';
import { useBookingSuccessController } from './booking-success/useBookingSuccessController';

export default function BookingSuccessPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as BookingSuccessLocationState;
  const { initialized, session, validateSession, getValidAccessToken, refreshSession } = useAuth();

  // Get order number from state or URL params
  const orderNumber = state?.orderNumber || searchParams.get('order_id') || '';
  const initialIsPending = state?.isPending || searchParams.get('pending') === '1';
  const {
    tickets,
    orderData,
    syncing,
    syncError,
    loadingTimedOut,
    showManualButton,
    autoSyncInProgress,
    effectiveStatus,
    showSkeleton,
    handleSyncStatus,
    handleRetryLoad,
  } = useBookingSuccessController({
    orderNumber,
    ticketCode: state?.ticketCode,
    initialIsPending,
    initialized,
    session,
    validateSession,
    getValidAccessToken,
    refreshSession,
  });

  const customerName = orderData?.customer_name || state?.customerName || 'Guest';

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    alert('Ticket has been sent to your email!');
  };

  const { icon: statusIcon, title: statusTitle, description: statusDescription } =
    getOrderStatusPresentation(effectiveStatus);

  if (showSkeleton) {
    return <BookingSuccessSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background-light">
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="layout-content-container flex flex-col max-w-[800px] flex-1">
          <BookingSuccessHero
            effectiveStatus={effectiveStatus}
            statusIcon={statusIcon}
            statusTitle={statusTitle}
            statusDescription={statusDescription}
            isInitialPending={initialIsPending}
          />

          {orderData && <BookingOrderInfo orderNumber={orderNumber} />}

          {tickets.length > 0 ? (
            tickets.map((ticket) => (
              <BookingTicketCard key={ticket.id} ticket={ticket} customerName={customerName} onPrint={handlePrint} onEmail={handleEmail} />
            ))
          ) : (
            <BookingSuccessPendingState
              effectiveStatus={effectiveStatus}
              orderNumber={orderNumber}
              loadingTimedOut={loadingTimedOut}
              showManualButton={showManualButton}
              syncing={syncing}
              autoSyncInProgress={autoSyncInProgress}
              syncError={syncError}
              onRetryLoad={handleRetryLoad}
              onManualCheck={() => handleSyncStatus(false)}
              paymentUrl={orderData?.payment_url}
            />
          )}

          <BookingSuccessActions hasTickets={tickets.length > 0} />
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-10 text-[#9c4949]/60 text-xs tracking-widest uppercase px-4 border-t border-[#f4e7e7]#3d2020]">
        Spark Stage • Premium Photography Experience
      </footer>
    </div>
  );
}
