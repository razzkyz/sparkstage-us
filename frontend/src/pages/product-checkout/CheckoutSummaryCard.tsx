import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatters';
import type { CheckoutOrderItem, AppliedVoucher, AppliedPoints } from './checkoutTypes';

type CheckoutSummaryCardProps = {
  orderItems: CheckoutOrderItem[];
  subtotal: number;
  discountAmount: number;
  finalTotal: number;
  appliedVoucher: AppliedVoucher | null;
  appliedPoints: AppliedPoints | null;
  shippingCost?: number;
};

export function CheckoutSummaryCard({
  orderItems,
  subtotal,
  discountAmount,
  finalTotal,
  appliedVoucher,
  appliedPoints,
  shippingCost = 0,
}: CheckoutSummaryCardProps) {
  const { t } = useTranslation();

  return (
    <div className="bg-white p-6 rounded-xl border border-rose-100 shadow-sm">
      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">shopping_bag</span>
        Order Summary
      </h3>

      <div className="space-y-4">
        {orderItems.map((item) => (
          <div
            key={item.product_variant_id}
            className="flex justify-between items-start border-b border-dashed border-rose-100 pb-4 last:border-0 last:pb-0"
          >
            <div>
              <p className="font-bold text-neutral-950">{item.product_name}</p>
              <p className="text-sm text-rose-700">{item.variant_name}</p>
              <p className="text-xs text-gray-500 mt-1">
                {item.quantity} x {formatCurrency(item.unit_price)}
              </p>
              {item.is_rental && item.deposit_amount && item.rental_daily_rate && item.rental_duration_days ? (
                <div className="text-xs mt-1 space-y-0.5">
                  <p className="text-gray-500">Harga: {formatCurrency((item.unit_price - item.deposit_amount - (item.rental_daily_rate * item.rental_duration_days)) * item.quantity)}</p>
                  <p className="text-gray-500">Sewa: {formatCurrency(item.rental_daily_rate * item.rental_duration_days * item.quantity)}</p>
                  <p className="text-yellow-700">Deposit: {formatCurrency(item.deposit_amount * item.quantity)}</p>
                </div>
              ) : item.is_rental && item.deposit_amount ? (
                <div className="text-xs mt-1 space-y-0.5">
                  <p className="text-yellow-700">Deposit: {formatCurrency(item.deposit_amount * item.quantity)}</p>
                </div>
              ) : null}
            </div>
            <p className="font-semibold">{formatCurrency(item.subtotal)}</p>
          </div>
        ))}

        <div className="pt-6 border-t border-rose-100 mt-4 space-y-2">
          <div className="flex justify-between text-sm text-rose-700">
            <span>{t('voucher.summary.subtotal')}</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {shippingCost > 0 && (
            <div className="flex justify-between text-sm text-rose-700">
              <span>Ongkos Kirim</span>
              <span>{formatCurrency(shippingCost)}</span>
            </div>
          )}
          {appliedVoucher && discountAmount > 0 && (
            <div className="flex justify-between text-sm text-green-700">
              <span>{t('voucher.summary.discount', { code: appliedVoucher.code })}</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {appliedPoints && appliedPoints.discountAmount > 0 && (
            <div className="flex justify-between text-sm" style={{ color: '#a855f7' }}>
              <span>⭐ SPARK CLUB ({appliedPoints.pointsUsed.toLocaleString()} poin)</span>
              <span>-{formatCurrency(appliedPoints.discountAmount)}</span>
            </div>
          )}
          <div className="flex justify-between items-end">
            <p className="text-lg font-bold">{t('voucher.summary.total')}</p>
            <div className="text-right">
              <p className="text-2xl font-black text-primary tracking-tight">{formatCurrency(finalTotal)}</p>
              <p className="text-[10px] text-rose-700 uppercase tracking-wider">{t('voucher.summary.taxes')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
