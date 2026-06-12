import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export type PrintOrderRow = {
  id: string;
  doku_order_id: string | null;
  amount: number | null;
  status: string | null;
  paid_at: string | null;
  created_at: string | null;
  customer_name: string | null;
  customer_email: string | null;
  queue_number: string | null;
};

export function usePrintOrders(enabled: boolean, statusFilter: string | string[] | null = 'paid') {
  return useQuery({
    queryKey: queryKeys.printOrders(statusFilter),
    enabled,
    queryFn: async () => {
      console.log('[usePrintOrders] Starting query with statusFilter:', statusFilter);
      
      let allData: PrintOrderRow[] = [];
      let page = 0;
      const pageSize = 1000;

      // DEBUG: Check current user role
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('[usePrintOrders] Current user:', { uid: user?.id, email: user?.email, userError });

      if (user) {
        const { data: roleData, error: roleError } = await supabase
          .from('user_role_assignments')
          .select('*')
          .eq('user_id', user.id);
        console.log('[usePrintOrders] User roles:', { roles: roleData, roleError });
      }

      while (true) {
        let query = supabase
          .from('print_orders')
          .select('id, doku_order_id, amount, status, paid_at, created_at, customer_name, customer_email, queue_number')
          .order('paid_at', { ascending: false, nullsFirst: false })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (Array.isArray(statusFilter) && statusFilter.length > 0) {
          query = query.in('status', statusFilter);
        } else if (typeof statusFilter === 'string' && statusFilter.length > 0) {
          query = query.eq('status', statusFilter);
        }

        const { data, error, status } = await query;

        console.log(`[usePrintOrders] Page ${page}:`, { 
          dataCount: data?.length ?? 0, 
          hasError: !!error,
          errorMessage: error?.message,
          errorCode: error?.code,
          httpStatus: status,
          error: error ? JSON.stringify(error) : 'none'
        });
        
        if (data && data.length > 0) {
          console.log('[usePrintOrders] Sample row:', JSON.stringify(data[0]));
        }

        if (error) {
          console.error('[usePrintOrders] Query error:', error);
          throw error;
        }
        if (!data || data.length === 0) break;

        allData = [...allData, ...data];
        if (data.length < pageSize) break;
        page += 1;
      }

      console.log('[usePrintOrders] Total rows fetched:', allData.length);
      return allData;
    },
  });
}
