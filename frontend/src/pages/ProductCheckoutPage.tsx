import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/cartStore';
import { useToast } from '../components/Toast';
import { clearBookingState } from '../utils/bookingStateManager';
import { CheckoutCustomerForm } from './product-checkout/CheckoutCustomerForm';
import { CheckoutPaymentSection } from './product-checkout/CheckoutPaymentSection';
import { CheckoutPointsSection } from './product-checkout/CheckoutPointsSection';
import { CheckoutSummaryCard } from './product-checkout/CheckoutSummaryCard';
import { CheckoutVoucherSection } from './product-checkout/CheckoutVoucherSection';
import { CheckoutShippingSection } from './product-checkout/CheckoutShippingSection';
import { useProductCheckoutController } from './product-checkout/useProductCheckoutController';
import { useLoyaltyPoints } from '../hooks/useLoyaltyPoints';
import { useProfile } from '../hooks/useProfile';
import { ReferralCodeInput } from '../components/account/ReferralCodeInput';

export default function ProductCheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user, session, initialized, getValidAccessToken, refreshSession } = useAuth();
  const { items: cartItems, removeItem: removeCartItem } = useCart();
  const { showToast } = useToast();
  const cashierCheckoutEnabled = String(import.meta.env.VITE_ENABLE_CASHIER_CHECKOUT || '').toLowerCase() !== 'false';
  const { data: loyaltyData } = useLoyaltyPoints(user?.id);
  const { profile } = useProfile();
  const userPoints = loyaltyData?.total_points ?? 0;
  const userTierLevel = loyaltyData?.tier_level ?? 0;

  // Direct Buy handling
  const directItem = location.state?.directItem as any | undefined;
  const allItems = directItem ? [directItem] : cartItems;
  const removeItem = (variantId: number) => {
    if (!directItem) {
      removeCartItem(variantId);
    }
  };

  const {
    customerName,
    customerPhone,
    customerAddress,
    deliveryMethod,
    provinceId,
    cityId,
    subdistrictId,
    shippingCourier,
    shippingService,
    shippingCost,
    error,
    loading,
    voucherCode,
    appliedVoucher,
    voucherError,
    applyingVoucher,
    appliedPoints,
    orderItems,
    subtotal,
    discountAmount,
    finalTotal,
    canCheckout,
    setCustomerName,
    setCustomerPhone,
    setCustomerAddress,
    setDeliveryMethod,
    setProvinceId,
    setCityId,
    setSubdistrictId,
    setShippingCourier,
    setShippingService,
    setShippingCost,
    setVoucherCode,
    handleApplyVoucher,
    handleRemoveVoucher,
    handleApplyPoints,
    handleRemovePoints,
    handlePay,
    handleCashierCheckout,
    cashierDisabled,
  } = useProductCheckoutController({
    allItems,
    selectedVariantIds: directItem ? [directItem.variantId] : (location.state?.selectedVariantIds as number[] | undefined),
    user,
    sessionToken: session?.access_token,
    initialized,
    getValidAccessToken,
    refreshSession,
    t,
    navigate,
    queryClient,
    removeItem,
    showToast,
    cashierCheckoutEnabled,
    initialProfile: profile,
  });

  // Clear ticket booking state when entering product checkout
  // Prevents mixing ticket and product order data
  useEffect(() => {
    clearBookingState();
  }, []);

  return (
    <div className="min-h-screen bg-background-light flex flex-col">
       {/* Header */}


      <main className="max-w-4xl mx-auto px-6 py-10 flex-1 w-full">
         {/* Progress Bar */}
         <div className="max-w-[800px] mx-auto mb-8">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-base font-medium">Step 2 of 3</p>
              <p className="text-sm font-normal opacity-70">66% Complete</p>
            </div>
            <div className="rounded-full bg-rose-100 overflow-hidden">
              <div className="h-2.5 rounded-full bg-primary" style={{ width: '66%' }}></div>
            </div>
            <p className="text-primary text-sm font-medium">Payment Confirmation</p>
          </div>
        </div>

        {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <div className="flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                <span>{error}</span>
            </div>
            </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           {/* Left Side: Order Summary */}
           <div className="space-y-6">
            <CheckoutSummaryCard
              orderItems={orderItems}
              subtotal={subtotal}
              discountAmount={discountAmount}
              finalTotal={finalTotal}
              appliedVoucher={appliedVoucher}
              appliedPoints={appliedPoints}
              shippingCost={shippingCost}
            />

            <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-lg border border-primary/10">
              <span className="material-symbols-outlined text-primary">verified_user</span>
              <p className="text-xs leading-relaxed text-rose-700">
                Your payment is secured with 256-bit SSL encryption.
              </p>
            </div>
          </div>

          {/* Right Side: Customer Details & Pay */}
          <div>
            <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
              <h1 className="text-2xl font-bold mb-6">Complete Payment</h1>

              <CheckoutCustomerForm
                customerName={customerName}
                customerPhone={customerPhone}
                customerEmail={user?.email || ''}
                loading={loading}
                onChangeName={setCustomerName}
                onChangePhone={setCustomerPhone}
              />

              <CheckoutShippingSection
                customerAddress={customerAddress}
                deliveryMethod={deliveryMethod}
                provinceId={provinceId}
                cityId={cityId}
                subdistrictId={subdistrictId}
                selectedCourier={shippingCourier}
                selectedService={shippingService}
                loading={loading}
                totalWeight={orderItems.reduce((sum, item) => sum + (item.quantity * 1000), 0)} // Assume 1kg per item for now if not available
                onChangeDeliveryMethod={setDeliveryMethod}
                onChangeAddress={setCustomerAddress}
                onChangeProvince={setProvinceId}
                onChangeCity={setCityId}
                onChangeSubdistrict={setSubdistrictId}
                onChangeShipping={(courier, service, cost) => {
                  setShippingCourier(courier);
                  setShippingService(service);
                  setShippingCost(cost);
                }}
              />

              <CheckoutVoucherSection
                voucherCode={voucherCode}
                appliedVoucher={appliedVoucher}
                voucherError={voucherError}
                loading={loading}
                applyingVoucher={applyingVoucher}
                onChangeVoucherCode={setVoucherCode}
                onApplyVoucher={handleApplyVoucher}
                onRemoveVoucher={handleRemoveVoucher}
              />

              <CheckoutPointsSection
                userPoints={userPoints}
                userTierLevel={userTierLevel}
                subtotal={subtotal}
                appliedPoints={appliedPoints}
                loading={loading}
                onApplyPoints={handleApplyPoints}
                onRemovePoints={handleRemovePoints}
              />

              <div className="mt-4 pt-4 border-t border-rose-100">
                <p className="text-sm font-medium text-rose-900 mb-3">Have a referral code?</p>
                <ReferralCodeInput />
              </div>

              <CheckoutPaymentSection
                loading={loading}
                canCheckout={canCheckout}
                finalTotal={finalTotal}
                cashierCheckoutEnabled={cashierCheckoutEnabled}
                cashierDisabled={cashierDisabled}
                totalItems={orderItems.reduce((sum, i) => sum + i.quantity, 0)}
                onPay={handlePay}
                onCashierCheckout={handleCashierCheckout}
              />

              {/* Payment Method Logos */}
              <div className="mt-6 pt-6 border-t border-rose-100">
                <p className="text-xs text-center text-gray-500 mb-3">Accepted via Stripe</p>
                <div className="flex justify-center items-center gap-3 flex-wrap">
                  <img
                    alt="Visa"
                    className="h-6 rounded shadow-sm"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/200px-Visa_Inc._logo.svg.png"
                  />
                  <img
                    alt="Mastercard"
                    className="h-6 rounded shadow-sm"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2a/Mastercard-logo.svg/200px-Mastercard-logo.svg.png"
                  />
                  <img
                    alt="American Express"
                    className="h-6 rounded shadow-sm"
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/American_Express_logo_%282018%29.svg/200px-American_Express_logo_%282018%29.svg.png"
                  />
                  <div className="px-2 py-1 bg-black rounded text-white text-[10px] font-bold flex items-center gap-1">
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="white"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.78 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
                    Apple Pay
                  </div>
                  <div className="px-2 py-1 bg-white border border-gray-200 rounded text-gray-700 text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.79 15.71 17.57V20.34H19.28C21.36 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4"/><path d="M12 23C14.97 23 17.46 22.02 19.28 20.34L15.71 17.57C14.73 18.23 13.48 18.63 12 18.63C9.13 18.63 6.71 16.7 5.84 14.1H2.18V16.94C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/><path d="M5.84 14.09C5.62 13.43 5.49 12.73 5.49 12C5.49 11.27 5.62 10.57 5.84 9.91V7.07H2.18C1.43 8.55 1 10.22 1 12C1 13.78 1.43 15.45 2.18 16.93L5.84 14.09Z" fill="#FBBC05"/><path d="M12 5.38C13.62 5.38 15.06 5.94 16.21 7.02L19.36 3.87C17.45 2.09 14.97 1 12 1C7.7 1 3.99 3.47 2.18 7.07L5.84 9.91C6.71 7.31 9.13 5.38 12 5.38Z" fill="#EA4335"/></svg>
                    Google Pay
                  </div>
                </div>
              </div>
            </div>

            <p className="text-center mt-6 text-xs text-rose-700">
              By clicking "Pay Now", you agree to Spark Stage's{' '}
              <a className="underline" href="#">Terms of Service</a> and{' '}
              <a className="underline" href="#">Cancellation Policy</a>.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}

    </div>
  );
}
