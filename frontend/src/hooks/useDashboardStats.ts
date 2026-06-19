import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

export type DashboardStats = {
  totalOrders: number;
  pendingOrders: number;
  paidOrders: number;
  completedOrders: number;
  totalRevenue: number;
};

export function useDashboardStats() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.dashboardStats(),
    queryFn: async ({ signal }) => {
      const [
        totalOrders,
        pendingOrders,
        paidOrders,
        completedOrders,
      ] = await Promise.all([
        supabase.from('order_products').select('*', { count: 'exact', head: true }).abortSignal(signal),
        supabase.from('order_products').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('payment_status', 'pending'),
        supabase.from('order_products').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('payment_status', 'paid'),
        supabase.from('order_products').select('*', { count: 'exact', head: true }).abortSignal(signal).eq('pickup_status', 'completed'),
      ]);

      if (
        totalOrders.error ||
        pendingOrders.error ||
        paidOrders.error ||
        completedOrders.error
      ) {
        const err = new Error('Failed to load dashboard stats') as APIError;
        err.status = 500;
        err.info = {
          totalOrders: totalOrders.error,
          pendingOrders: pendingOrders.error,
          paidOrders: paidOrders.error,
          completedOrders: completedOrders.error,
        };
        throw err;
      }

      // Calculate total revenue from paid orders
      const { data: revenueData } = await supabase
        .from('order_products')
        .select('total_amount')
        .abortSignal(signal)
        .eq('payment_status', 'paid');

      const totalRevenue = (revenueData || []).reduce((sum, order) => sum + (order.total_amount || 0), 0);

      return {
        totalOrders: totalOrders.count || 0,
        pendingOrders: pendingOrders.count || 0,
        paidOrders: paidOrders.count || 0,
        completedOrders: completedOrders.count || 0,
        totalRevenue,
      };
    },
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 0,
  });

  useEffect(() => {
    let invalidateTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const scheduleInvalidate = () => {
      if (invalidateTimeoutId) return;
      invalidateTimeoutId = setTimeout(() => {
        invalidateTimeoutId = null;
        void queryClient.invalidateQueries({ queryKey: queryKeys.dashboardStats() });
      }, 700);
    };

    const channel = supabase
      .channel('dashboard_stats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_products' }, scheduleInvalidate)
      .subscribe();

    return () => {
      if (invalidateTimeoutId) {
        clearTimeout(invalidateTimeoutId);
      }
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
