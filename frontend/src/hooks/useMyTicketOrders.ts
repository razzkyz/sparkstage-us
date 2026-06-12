import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type TicketOrderItem = {
  id: number;
  ticket_id: number;
  ticket_name: string;
  selected_date: string;
  selected_time_slots: any;
  quantity: number;
  unit_price: number;
  subtotal: number;
  purchased_tickets: Array<{
    id: number;
    ticket_code: string;
    status: string;
    queue_number: number | null;
    queue_overflow: boolean | null;
  }>;
};

export type TicketOrderListItem = {
  id: number;
  order_number: string;
  status: string;
  total: number;
  created_at: string;
  expires_at: string | null;
  order_items: TicketOrderItem[];
  itemCount: number;
};

export function useMyTicketOrders(userId: string | null | undefined) {
  const enabled = typeof userId === 'string' && userId.length > 0;
  const queryClient = useQueryClient();
  const queryKey = enabled ? ['myTicketOrders', userId] : ['myTicketOrders', 'invalid'];

  // Real-time subscription to orders table
  useEffect(() => {
    if (!enabled) return;

    // Subscribe to changes on orders table
    const subscription = supabase
      .channel(`orders:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Immediately refetch when order changes detected
          console.log('[useMyTicketOrders] Order change detected, refetching...');
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [enabled, userId, queryKey, queryClient]);

  const query = useQuery({
    queryKey,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(
          `
          id,
          order_number,
          status,
          total_amount,
          created_at,
          expires_at,
          order_items (
            id,
            ticket_id,
            selected_date,
            selected_time_slots,
            quantity,
            unit_price,
            subtotal,
            tickets (
              name
            ),
            purchased_tickets (
              id,
              ticket_code,
              status,
              queue_number,
              queue_overflow
            )
          )
        `
        )
        .eq('user_id', userId)
        .eq('is_hidden_by_user', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useMyTicketOrders] Error fetching orders:', error);
        throw error;
      }
      
      const orders = (data || []).map((order: any) => {
        const itemCount = (order.order_items || []).reduce((acc: number, item: any) => acc + (item.quantity || 0), 0);
        
        // Map tickets.name back to ticket_name for compatibility
        const order_items = (order.order_items || []).map((item: any) => ({
          ...item,
          ticket_name: item.tickets?.name || 'Unknown Ticket',
        }));

        return {
          ...order,
          total: order.total_amount,
          order_items,
          itemCount,
        };
      });

      return orders as TicketOrderListItem[];
    },
    // Fallback polling as safety net (every 30 seconds)
    refetchInterval: 30000,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 5000,
  });

  return query;
}
