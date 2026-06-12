import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { APIError, createQuerySignal } from '../lib/fetchers';
import { queryKeys } from '../lib/queryKeys';

const ADMIN_TICKETS_STALE_TIME_MS = 30 * 1000;

export type PurchasedTicket = {
  id: string;
  ticket_id: string;
  user_id: string;
  purchase_date: string;
  entry_status: 'entered' | 'not_yet' | 'invalid';
  qr_code: string;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  valid_date: string;
  used_at?: string | null;
  users: {
    name: string;
    email: string;
  };
  tickets: {
    name: string;
  };
};

type PurchasedTicketRow = {
  id: string | number;
  ticket_id: string | number;
  user_id: string;
  created_at: string | null;
  status: 'active' | 'used' | 'cancelled' | 'expired';
  used_at: string | null;
  ticket_code: string;
  valid_date: string;
  tickets: { name: string };
};

export function useTicketsManagement() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.ticketsManagement(),
    queryFn: async ({ signal }) => {
      const { signal: timeoutSignal, cleanup, didTimeout } = createQuerySignal(signal);
      try {
        let allTicketsData: any[] = [];
        let page = 0;
        const pageSize = 1000;
        while (true) {
          const { data, error } = await supabase
            .from('purchased_tickets')
            .select(`
              id,
              ticket_id,
              user_id,
              created_at,
              status,
              used_at,
              ticket_code,
              valid_date,
              tickets!inner(name)
            `)
            .abortSignal(timeoutSignal)
            .order('created_at', { ascending: false })
            .range(page * pageSize, (page + 1) * pageSize - 1);

          if (error) {
            const err = new Error(error.message) as APIError;
            err.status = 500;
            err.info = error;
            throw err;
          }
          
          allTicketsData = [...allTicketsData, ...(data || [])];
          if (!data || data.length < pageSize) break;
          page++;
        }

        const rows = allTicketsData as unknown as PurchasedTicketRow[];
        const userIds = Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean)));
        
        // Batch fetch profiles in chunks to avoid URL length limits (400 Bad Request)
        // Supabase REST API has URL length limits, so split into batches of 100 UUIDs max
        const BATCH_SIZE = 100;
        let profilesData: any[] = [];
        
        if (userIds.length > 0) {
          for (let i = 0; i < userIds.length; i += BATCH_SIZE) {
            const batch = userIds.slice(i, i + BATCH_SIZE);
            const { data, error: profilesError } =
              await supabase.from('profiles').select('id, name, email').abortSignal(timeoutSignal).in('id', batch);

            if (profilesError) {
              const err = new Error(profilesError.message) as APIError;
              err.status = 500;
              err.info = profilesError;
              throw err;
            }
            
            if (data) {
              profilesData = [...profilesData, ...data];
            }
          }
        }

        const profilesMap = new Map(
          (profilesData || []).map((profile) => {
            let displayName = String(profile.name || '').trim()
            // Fallback to email prefix if name is missing
            if (!displayName && profile.email) {
              displayName = String(profile.email).split('@')[0]
            }
            return [
              String(profile.id),
              { name: displayName || '-', email: String(profile.email || '-') },
            ]
          })
        );

        const mapped: PurchasedTicket[] = rows.map((row) => {
          const entry_status: PurchasedTicket['entry_status'] =
            row.status === 'used' ? 'entered' : row.status === 'active' ? 'not_yet' : 'invalid';

          return {
            id: String(row.id),
            ticket_id: String(row.ticket_id),
            user_id: String(row.user_id),
            purchase_date: row.created_at || new Date().toISOString(),
            entry_status,
            qr_code: row.ticket_code,
            status: row.status,
            valid_date: row.valid_date,
            used_at: row.used_at,
            users: profilesMap.get(String(row.user_id)) || { name: '-', email: '-' },
            tickets: row.tickets,
          };
        });

        const totalValid = mapped.length;
        const entered = mapped.filter((t) => t.status === 'used').length;

        return { tickets: mapped, stats: { totalValid, entered } };
      } catch (error) {
        if (didTimeout()) {
          throw new Error('Request timeout');
        }
        throw error;
      } finally {
        cleanup();
      }
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    staleTime: ADMIN_TICKETS_STALE_TIME_MS,
  });

  useEffect(() => {
    const channel = supabase
      .channel('purchased_tickets_admin_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchased_tickets',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.ticketsManagement() });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
