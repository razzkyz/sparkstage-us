import { supabase } from '../../lib/supabase';
import { createQuerySignal } from '../../lib/fetchers';
import { withTimeout } from '../../utils/queryHelpers';
import type { OrderData, OrderItem, OrderRow, OrderState, PurchasedTicket, PurchasedTicketRow } from './bookingSuccessTypes';

type PublicBookingSuccessResult = {
  order_id: number;
  order_number: string;
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  order_items: Array<{
    id: number;
    ticket_id: number;
    selected_date: string;
    selected_time_slots: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
  }>;
  tickets: Array<{
    id: number;
    ticket_code: string;
    valid_date: string;
    time_slot: string | null;
    queue_number: number | null;
    queue_overflow: boolean;
    status: string;
    ticket_id: number;
    ticket_name: string;
    ticket_type: string;
  }>;
};

export const mapPurchasedTicket = (row: PurchasedTicketRow): PurchasedTicket => {
  const ticketMeta = Array.isArray(row.tickets) ? row.tickets[0] : row.tickets;
  return {
    id: row.id,
    ticket_code: row.ticket_code,
    valid_date: row.valid_date,
    time_slot: row.time_slot,
    queue_number: row.queue_number ?? null,
    queue_overflow: Boolean(row.queue_overflow),
    status: row.status,
    ticket: {
      name: ticketMeta?.name || 'Ticket',
      type: ticketMeta?.type || 'entrance',
    },
  };
};

export async function runBookingSuccessQueryWithTimeout<T>(
  fn: (signal: AbortSignal) => PromiseLike<T>,
  timeoutMs = 10000
) {
  const { signal, cleanup, didTimeout } = createQuerySignal(undefined, timeoutMs);
  try {
    return await withTimeout(Promise.resolve(fn(signal)), timeoutMs, 'Request timeout');
  } catch (error) {
    if (didTimeout() || (error instanceof Error && error.message.toLowerCase().includes('timeout'))) {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    cleanup();
  }
}

async function fetchPurchasedTicketByCode(ticketCode: string) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase
      .from('purchased_tickets')
      .select(`
        id,
        ticket_code,
        valid_date,
        time_slot,
        queue_number,
        queue_overflow,
        status,
        order_item_id,
        tickets:ticket_id (
          name,
          type
        )
      `)
      .eq('ticket_code', ticketCode)
      .abortSignal(signal)
      .single()
  );

  if (error || !data) {
    throw error ?? new Error('Ticket not found');
  }

  return mapPurchasedTicket(data as PurchasedTicketRow);
}

async function fetchOrderByNumber(orderNumber: string) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase
      .from('orders')
      .select('*')
      .eq('order_number', orderNumber)
      .abortSignal(signal)
      .single()
  );

  if (error || !data) {
    throw error ?? new Error('Order not found');
  }

  return data as OrderRow;
}

async function fetchOrderItems(orderId: number) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase.from('order_items').select('*').eq('order_id', orderId).abortSignal(signal)
  );

  if (error) {
    throw error;
  }

  return (data as OrderItem[] | null) || [];
}

async function fetchPurchasedTicketsByOrderItemIds(orderItemIds: number[]) {
  if (orderItemIds.length === 0) return [];

  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase
      .from('purchased_tickets')
      .select(`
        id,
        ticket_code,
        valid_date,
        time_slot,
        queue_number,
        queue_overflow,
        status,
        tickets:ticket_id (
          name,
          type
        )
      `)
      .in('order_item_id', orderItemIds)
      .abortSignal(signal)
  );

  if (error) {
    throw error;
  }

  return ((data as PurchasedTicketRow[] | null) || []).map(mapPurchasedTicket);
}

export async function fetchPurchasedTicketsForOrderNumber(orderNumber: string) {
  const order = await fetchOrderByNumber(orderNumber);
  const orderItems = await fetchOrderItems(order.id);
  return fetchPurchasedTicketsByOrderItemIds(orderItems.map((item) => item.id));
}

/**
 * Fetch booking success data using public RPC (works without auth)
 * This solves issues where customer loses auth session after DOKU redirect
 * especially on Instagram browser or incognito/private mode
 */
async function fetchBookingSuccessDataViaPublicRpc(orderNumber: string) {
  const { data, error } = await runBookingSuccessQueryWithTimeout(() =>
    supabase.rpc('get_order_and_tickets_by_order_number', {
      p_order_number: orderNumber,
    })
  );

  if (error) {
    console.warn('[BookingSuccess] Public RPC failed, will try authenticated path:', error.message);
    return null;
  }

  if (!data || data.length === 0) {
    return null;
  }

  const result = data[0] as PublicBookingSuccessResult;
  
  // Map the RPC result to our expected format
  const orderData: OrderData = {
    id: result.order_id,
    order_number: result.order_number,
    user_id: result.user_id,
    customer_name: result.customer_name,
    customer_email: result.customer_email,
    customer_phone: result.customer_phone,
    total_amount: result.total_amount,
    status: result.status,
    expires_at: result.expires_at,
    created_at: result.created_at,
    updated_at: result.updated_at,
    order_items: result.order_items.map((item) => ({
      ...item,
      order_id: result.order_id,
    })) as OrderItem[],
  };

  const tickets: PurchasedTicket[] = result.tickets.map((ticket) => ({
    id: ticket.id,
    ticket_code: ticket.ticket_code,
    valid_date: ticket.valid_date,
    time_slot: ticket.time_slot,
    queue_number: ticket.queue_number,
    queue_overflow: ticket.queue_overflow,
    status: ticket.status,
    ticket: {
      name: ticket.ticket_name || 'Ticket',
      type: ticket.ticket_type || 'entrance',
    },
  }));

  return { orderData, tickets };
}

export async function fetchBookingSuccessData(params: { orderNumber: string; ticketCode?: string }) {
  const { orderNumber, ticketCode } = params;

  if (ticketCode && !orderNumber) {
    const ticket = await fetchPurchasedTicketByCode(ticketCode);
    return {
      orderData: { status: 'paid' } as OrderState,
      tickets: [ticket],
    };
  }

  if (!orderNumber) {
    return {
      orderData: null as OrderState | null,
      tickets: [] as PurchasedTicket[],
    };
  }

  // Try public RPC first (works without auth, solves Instagram/external link issue)
  try {
    const publicResult = await fetchBookingSuccessDataViaPublicRpc(orderNumber);
    if (publicResult) {
      return publicResult;
    }
  } catch (error) {
    console.warn('[BookingSuccess] Public RPC error:', error);
    // Fall through to authenticated path
  }

  // Fallback to authenticated path (for users with valid session)
  try {
    const order = await fetchOrderByNumber(orderNumber);
    const orderItems = await fetchOrderItems(order.id);
    const orderData: OrderData = {
      ...order,
      order_items: orderItems,
    };

    if (order.status !== 'paid' || orderItems.length === 0) {
      return {
        orderData,
        tickets: [] as PurchasedTicket[],
      };
    }

    return {
      orderData,
      tickets: await fetchPurchasedTicketsByOrderItemIds(orderItems.map((item) => item.id)),
    };
  } catch (authError) {
    console.error('[BookingSuccess] Both public and authenticated paths failed:', authError);
    throw authError;
  }
}

export async function fetchBookingOrderStatusSnapshot(orderNumber: string) {
  const { data, error } = await runBookingSuccessQueryWithTimeout((signal) =>
    supabase.from('orders').select('status, expires_at').eq('order_number', orderNumber).abortSignal(signal).single()
  );

  if (error) {
    throw error;
  }

  return data as Pick<OrderRow, 'status' | 'expires_at'> | null;
}
