import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type ScanTrackerEntry = {
  id: string;
  user_id: string;
  display_name: string;
  email: string;
  stage_id: number;
  stage_name: string;
  stage_code: string;
  stage_zone: string | null;
  scanned_at: string;
};

type UseScanTrackerOptions = {
  enabled?: boolean;
  refetchInterval?: number;
  limit?: number;
  stageId?: number | null;
  search?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
};

export function useScanTracker(options: UseScanTrackerOptions = {}) {
  const {
    enabled = true,
    refetchInterval = 15_000,
    limit = 200,
    stageId = null,
    search = '',
    dateFrom = null,
    dateTo = null,
  } = options;

  return useQuery<ScanTrackerEntry[]>({
    queryKey: ['scan-tracker', limit, stageId, search, dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stage_scan_logs', {
        limit_count: limit,
      });
      if (error) throw new Error(error.message);
      let rows = (data ?? []) as ScanTrackerEntry[];

      // Client-side filtering (data is already sorted by scanned_at desc from RPC)
      if (stageId !== null) {
        rows = rows.filter((r) => r.stage_id === stageId);
      }
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        rows = rows.filter(
          (r) =>
            r.display_name.toLowerCase().includes(q) ||
            r.email.toLowerCase().includes(q)
        );
      }
      if (dateFrom) {
        const from = new Date(dateFrom).getTime();
        rows = rows.filter((r) => new Date(r.scanned_at).getTime() >= from);
      }
      if (dateTo) {
        const to = new Date(dateTo).getTime() + 86_400_000; // inclusive end-of-day
        rows = rows.filter((r) => new Date(r.scanned_at).getTime() <= to);
      }
      return rows;
    },
    enabled,
    refetchInterval,
    staleTime: 8_000,
  });
}
