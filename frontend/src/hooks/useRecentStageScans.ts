import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export type RecentStageScan = {
  scan_id: string;
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

export function useRecentStageScans(options: Options = {}) {
  const { enabled = true, refetchInterval = 10_000, limit = 50 } = options;

  return useQuery<RecentStageScan[]>({
    queryKey: [...queryKeys.stages(), 'recent-scans', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_recent_stage_scans', {
        limit_count: limit,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as RecentStageScan[];
    },
    enabled,
    refetchInterval,
    staleTime: 5_000,
  });
}
