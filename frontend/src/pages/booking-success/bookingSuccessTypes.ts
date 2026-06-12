export interface BookingSuccessLocationState {
  orderNumber?: string;
  orderId?: number;
  ticketName?: string;
  total?: number;
  date?: string;
  time?: string;
  customerName?: string;
  paymentResult?: unknown;
  isPending?: boolean;
  ticketCode?: string;
}

export interface PurchasedTicket {
  id: number;
  ticket_code: string;
  valid_date: string;
  time_slot: string | null;
  queue_number: number | null;
  queue_overflow: boolean;
  status: string;
  ticket: {
    name: string;
    type: string;
  };
}

export interface PurchasedTicketRow {
  id: number;
  ticket_code: string;
  valid_date: string;
  time_slot: string | null;
  queue_number?: number | null;
  queue_overflow?: boolean | null;
  status: string;
  order_item_id?: number | null;
  tickets?: {
    name: string;
    type: string;
  } | { name: string; type: string }[] | null;
}

export interface OrderItem {
  id: number;
  order_id: number;
  ticket_id: number;
  selected_date: string;
  selected_time_slots: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface OrderRow {
  id: number;
  order_number: string;
  user_id?: string | null;
  status: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  total_amount?: number | null;
  expires_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  payment_url?: string | null;
  profiles?: {
    name?: string | null;
  } | null;
}

export interface OrderDataFromRpc extends OrderRow {
  order_items: Array<OrderItem | Omit<OrderItem, 'order_id'>>;
}

export type OrderData = OrderRow & { order_items: OrderItem[] };
export type OrderState = OrderData | OrderRow | { status?: string | null; expires_at?: string | null; customer_name?: string | null; payment_url?: string | null; profiles?: { name?: string | null } | null };
