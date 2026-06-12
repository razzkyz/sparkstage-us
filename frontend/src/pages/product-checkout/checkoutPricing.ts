import type { CartItem } from '../../contexts/cartStore';
import type { CheckoutOrderItem } from './checkoutTypes';

export function selectCheckoutItems(allItems: CartItem[], selectedVariantIds?: number[]) {
  if (selectedVariantIds && Array.isArray(selectedVariantIds) && selectedVariantIds.length > 0) {
    return allItems.filter((item) => selectedVariantIds.includes(item.variantId));
  }

  return allItems;
}

export function calculateSubtotal(items: CartItem[]) {
  return items.reduce((sum, item) => {
    const unitPrice = item.unitPrice * item.quantity;
    return sum + unitPrice;
  }, 0);
}

export function mapCheckoutOrderItems(items: CartItem[]): CheckoutOrderItem[] {
  return items.map((item) => ({
    product_variant_id: item.variantId,
    product_name: item.productName,
    variant_name: item.variantName,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    subtotal: item.unitPrice * item.quantity,
    is_rental: item.isRental,
    deposit_amount: item.depositAmount,
    rental_daily_rate: item.rentalDailyRate,
    rental_duration_days: item.rentalDurationDays,
  }));
}

export function calculateFinalTotal(subtotal: number, discountAmount: number) {
  return Math.max(0, subtotal - discountAmount);
}

export function calculateFinalTotalWithPoints(
  subtotal: number,
  voucherDiscount: number,
  pointsDiscount: number
) {
  return Math.max(0, subtotal - voucherDiscount - pointsDiscount);
}
