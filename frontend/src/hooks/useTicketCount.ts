import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { createQuerySignal } from '../lib/fetchers';
import { useAuth } from '../contexts/AuthContext';

export const useTicketCount = () => {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user, initialized } = useAuth();

  useEffect(() => {
    // Wait for auth to be initialized
    if (!initialized) {
      return;
    }

    const userId = user?.id ?? null;

    const fetchTicketCount = async () => {
      if (!userId) {
        setCount(0);
        setLoading(false);
        return;
      }

      const { signal: timeoutSignal, cleanup } = createQuerySignal(undefined, 10000);
      try {
        // Count purchased tickets with status 'active' and valid_date >= today
        const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD in local time

        const { data: activeTickets, error: ticketError } = await supabase
          .from('purchased_tickets')
          .select(`
            id,
            order_items!inner(
              orders!inner(
                is_hidden_by_user
              )
            )
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .gte('valid_date', todayStr)
          .eq('order_items.orders.is_hidden_by_user', false)
          .abortSignal(timeoutSignal);
        
        const activeTicketCount = activeTickets?.length || 0;

        // Count pending orders for tickets
        const { count: pendingOrderCount, error: orderError } = await supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('status', 'pending')
          .eq('is_hidden_by_user', false)
          .abortSignal(timeoutSignal);

        if (ticketError && orderError) {
          setCount(0);
        } else {
          setCount((activeTicketCount || 0) + (pendingOrderCount || 0));
        }
      } catch {
        setCount(0);
      } finally {
        cleanup();
        setLoading(false);
      }
    };

    fetchTicketCount();

    // Subscribe to changes in purchased_tickets
    if (!userId) return;

    const subscription = supabase
      .channel('purchased_tickets_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'purchased_tickets', filter: `user_id=eq.${userId}` }, () => {
        fetchTicketCount();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, () => {
        fetchTicketCount();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user?.id, initialized]);

  return { count, loading };
};
