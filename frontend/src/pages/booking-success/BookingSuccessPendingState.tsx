import BrandedLoader from '../../components/BrandedLoader';

type BookingSuccessPendingStateProps = {
  effectiveStatus: string | null;
  orderNumber: string;
  loadingTimedOut: boolean;
  showManualButton: boolean;
  syncing: boolean;
  autoSyncInProgress: boolean;
  syncError: string | null;
  onRetryLoad: () => void;
  onManualCheck: () => void;
  paymentUrl?: string | null;
};

export function BookingSuccessPendingState(props: BookingSuccessPendingStateProps) {
  const {
    effectiveStatus,
    orderNumber,
    loadingTimedOut,
    showManualButton,
    syncing,
    autoSyncInProgress,
    syncError,
    onRetryLoad,
    onManualCheck,
    paymentUrl,
  } = props;

  return (
    <div className="flex flex-col gap-6">
      <div className="relative bg-white rounded-xl shadow-2xl overflow-hidden border border-[#f4e7e7]">
        <div className="h-2 bg-primary"></div>
        <div className="p-8 md:p-12 text-center">
          {effectiveStatus === 'pending' ? (
            <div className="flex flex-col items-center justify-center py-4">
              <BrandedLoader text="Summoning Your Pass..." size="lg" className="py-8" />
              <p className="text-gray-500 font-medium mt-4">Finalizing your magical journey to the stage.</p>
              <p className="text-xs text-gray-400 mt-8 font-mono">Order Ref: {orderNumber}</p>

              {loadingTimedOut && !showManualButton && (
                <div className="mt-6 animate-fade-in">
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-700">
                      <span className="material-symbols-outlined text-base align-middle mr-1">warning</span>
                      Loading is taking longer than expected. You can retry or check status manually.
                    </p>
                  </div>
                  <button onClick={onRetryLoad} className="h-11 px-5 rounded-xl border border-red-200 text-red-700 font-bold hover:bg-red-50 transition-all">
                    Retry Loading
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <span className="material-symbols-outlined text-6xl text-gray-400 mb-4">confirmation_number</span>
              <h2 className="text-xl font-bold mb-2">No Tickets Found</h2>
              <p className="text-gray-500">Your tickets may still be processing. Please check back in a moment.</p>
              {loadingTimedOut && (
                <div className="mt-6">
                  <button onClick={onRetryLoad} className="h-11 px-5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 transition-all">
                    Retry Loading
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {effectiveStatus === 'pending' && (
        <div className="animate-fade-in relative bg-white rounded-xl shadow-md border border-gray-100 p-6 md:p-8">
          <div className="text-left w-full max-w-lg mx-auto">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-6 text-gray-400">Payment Instructions</h3>
            <div className="space-y-6">
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                Tap “Check Status Manually” to refresh, or use “Pay Now” to continue payment.
              </div>
              
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center flex-shrink-0">1</span>
                  <p className="text-sm text-gray-600 pt-0.5">Complete the payment using your selected method.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center flex-shrink-0">2</span>
                  <p className="text-sm text-gray-600 pt-0.5">Return to this page and tap "Check Status Manually" to refresh.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-gray-200 text-xs flex items-center justify-center flex-shrink-0">3</span>
                  <p className="text-sm text-gray-600 pt-0.5">If the status remains pending, please wait a moment and try again.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm mt-8">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Payment Actions</p>
                <div className="flex flex-col gap-3">
                  {paymentUrl && (
                    <a
                      href={paymentUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
                    >
                      <span className="material-symbols-outlined text-lg">open_in_new</span>
                      PAY NOW
                    </a>
                  )}
                  {showManualButton && (
                    <button
                      onClick={onManualCheck}
                      disabled={syncing || autoSyncInProgress}
                      className="w-full h-12 px-5 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 disabled:opacity-60 transition-all"
                    >
                      {syncing || autoSyncInProgress ? 'Checking...' : 'Check Status Manually'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {syncError && <p className="text-sm text-red-600 mt-3 text-center">{syncError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
