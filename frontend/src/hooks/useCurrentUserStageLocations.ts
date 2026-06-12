import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { queryKeys } from '../lib/queryKeys';

export type UserStageLocation = {
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
};

export function useCurrentUserStageLocations(options: Options = {}) {
  const { enabled = true, refetchInterval = 30_000 } = options;

  return useQuery<UserStageLocation[]>({
    queryKey: [...queryKeys.stages(), 'live-visitors'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_user_stage_locations');
      if (error) throw new Error(error.message);
      return (data ?? []) as UserStageLocation[];
    },
    enabled,
    refetchInterval,
    staleTime: 15_000,
  });
}
