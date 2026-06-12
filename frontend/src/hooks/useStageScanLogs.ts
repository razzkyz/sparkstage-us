import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export type StageScanLog = {
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

type Options = {
  enabled?: boolean;
  refetchInterval?: number;
  limit?: number;
};

export function useStageScanLogs(options: Options = {}) {
  const { enabled = true, refetchInterval = 10_000, limit = 50 } = options;

  return useQuery<StageScanLog[]>({
    queryKey: [...queryKeys.stages(), 'scan-logs', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_stage_scan_logs', {
        limit_count: limit,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as StageScanLog[];
    },
    enabled,
    refetchInterval,
    staleTime: 5_000,
  });
}
