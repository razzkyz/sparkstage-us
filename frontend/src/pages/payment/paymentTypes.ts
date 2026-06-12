import type { BookingState } from '../../utils/bookingStateManager';

export interface PaymentLocationState {
  ticketId?: number;
  ticketName?: string;
  ticketType?: string;
  price?: number;
  quantity?: number;
  date?: string;
  time?: string;
}

export interface PaymentBookingDetails {
  ticketId: number;
  ticketName: string;
  ticketType: string;
  price: number;
  bookingDate: string;
  timeSlot: string;
  quantity: number;
  total: number;
}

export interface CheckoutPaymentResponse {
  payment_provider: 'doku_checkout';
  payment_url: string;
  payment_sdk_url?: string | null;
  payment_due_date?: string | null;
  order_id: string | number;
  order_number: string;
}

export interface PaymentSuccessNavigationState {
  orderNumber: string;
  orderId: string | number;
  ticketName: string;
  total: number;
  date: string;
  time: string;
  customerName: string;
  paymentResult?: unknown;
  isPending: true;
}

export type PreservedBookingData = Omit<BookingState, 'timestamp'>;
