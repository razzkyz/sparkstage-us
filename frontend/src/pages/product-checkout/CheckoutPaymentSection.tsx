import { formatCurrency } from '../../utils/formatters';

type CheckoutPaymentSectionProps = {
  loading: boolean;
  canCheckout: boolean;
  finalTotal: number;
  cashierCheckoutEnabled: boolean;
  cashierDisabled: boolean;
  totalItems: number;
  onPay: () => void;
  onCashierCheckout: () => void;
};

export function CheckoutPaymentSection({
  loading,
  canCheckout,
  finalTotal,
  cashierCheckoutEnabled,
  cashierDisabled,
  totalItems,
  onPay,
  onCashierCheckout,
}: CheckoutPaymentSectionProps) {
  const pointsToEarn = totalItems * 20;

  return (
    <>
      <div className="mb-4 p-4 bg-indigo-50 rounded-lg border border-indigo-100">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 mt-0.5 text-indigo-600 shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4 4C2.89 4 2 4.89 2 6V18C2 19.11 2.89 20 4 20H20C21.11 20 22 19.11 22 18V6C22 4.89 21.11 4 20 4H4M4 6H20V8H4V6M4 10H20V18H4V10M6 12V14H16V12H6Z"/>
          </svg>
          <div>
            <p className="text-sm font-semibold text-indigo-800">Secure payment via Stripe</p>
            <p className="text-xs text-indigo-600 mt-1">
              Pay with Credit Card, Debit Card, Apple Pay, or Google Pay. You'll be redirected to Stripe's secure checkout page.
            </p>
          </div>
        </div>
      </div>

      {/* SPARK CLUB Points Info */}
      {pointsToEarn > 0 && (
        <div
          className="mb-4 rounded-xl px-4 py-3 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #fff0f5, #ffe4ef)', border: '1px solid rgba(255,75,134,0.2)' }}
        >
          <span className="text-2xl flex-shrink-0">⭐</span>
          <div className="min-w-0">
            <p className="text-sm font-bold" style={{ color: '#e63d75' }}>
              You'll earn {pointsToEarn.toLocaleString()} SPARK CLUB Points!
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {totalItems} item × 20 pts — redeem for discounts on your next purchase 🎁
            </p>
          </div>
        </div>
      )}

      <button
        onClick={onPay}
        disabled={loading || !canCheckout}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <span className="material-symbols-outlined animate-spin">progress_activity</span>
            Redirecting to Stripe...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-[20px]">lock</span>
            Pay {formatCurrency(finalTotal)} with Stripe
          </>
        )}
      </button>

      {/* Stripe trust badge */}
      <div className="mt-3 flex items-center justify-center gap-2 text-xs text-gray-400">
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.5 1L2 6V12C2 17.55 6.08 22.74 11.5 23.93C16.92 22.74 21 17.55 21 12V6L11.5 1Z"/>
        </svg>
        <span>Powered by <strong className="text-indigo-600">Stripe</strong> — 256-bit SSL encrypted</span>
      </div>

      {cashierCheckoutEnabled && (
        <button
          onClick={onCashierCheckout}
          disabled={loading || cashierDisabled}
          className="w-full mt-3 bg-[#ff4b86] hover:bg-[#e63d75] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all flex flex-col items-center justify-center"
        >
          <span>Pay at Cashier</span>
          <span className="text-xs font-semibold text-white/80 mt-1">Checkout at cashier</span>
        </button>
      )}
    </>
  );
}

