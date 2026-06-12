export type CreateProductTokenResponse = {
  payment_provider: 'doku_checkout';
  payment_url: string;
  payment_sdk_url?: string | null;
  payment_due_date?: string | null;
  order_number: string;
  discount_amount?: number;
};

export type CreateCashierOrderResponse = {
  order_number: string;
};

export type InvokeErrorWithContext = {
  status?: number;
  context?: {
    status?: number;
    statusCode?: number;
    response?: Response;
  };
};

export type AppliedVoucher = {
  id: string;
  code: string;
  discountAmount: number;
  discountType?: string | null;
  discountValue?: number | null;
};

export type AppliedPoints = {
  pointsUsed: number;
  discountAmount: number;
};

export type ValidateVoucherResult = {
  voucher_id?: string | null;
  discount_type?: string | null;
  discount_value?: number | string | null;
  discount_amount?: number | string | null;
  error_message?: string | null;
  error_code?: string | null;
  applicable_category_names?: string[] | null;
};

export type CheckoutOrderItem = {
  product_variant_id: number;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_rental?: boolean;
  deposit_amount?: number;
  rental_daily_rate?: number;
  rental_duration_days?: number;
};
