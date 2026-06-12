import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export function useCmsSingletonSettings<T extends { id: string }>(params: {
  table: string;
  defaultId: string;
  normalize: (data: Record<string, unknown>) => T;
  errorLabel: string;
  staleTimeMs?: number;
}) {
  const { table, defaultId, normalize, errorLabel, staleTimeMs = 30 * 60 * 1000 } = params;
  const queryClient = useQueryClient();
  const queryKey = ['cms-singleton-settings', table] as const;

  const settingsQuery = useQuery<T | null, Error>({
    queryKey,
    queryFn: async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from(table as never)
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (fetchError) {
          if (fetchError.code === 'PGRST116') {
            return null;
          }
          throw fetchError;
        }

        return normalize(data as Record<string, unknown>);
      } catch (err: unknown) {
        console.error(`Error fetching ${errorLabel}:`, err);
        throw err instanceof Error ? err : new Error(`Failed to fetch ${errorLabel}`);
      }
    },
    staleTime: staleTimeMs,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
  });

  const updateMutation = useMutation<T, Error, Partial<T>>({
    mutationFn: async (updates) => {
      try {
        const currentSettings = queryClient.getQueryData<T | null>(queryKey);

        if (!currentSettings?.id || currentSettings.id === defaultId) {
          const { data, error: insertError } = await supabase
            .from(table as never)
            .insert([updates])
            .select()
            .single();

          if (insertError) throw insertError;

          return normalize(data as Record<string, unknown>);
        }

        const { data, error: updateError } = await supabase
          .from(table as never)
          .update(updates)
          .eq('id', currentSettings.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return normalize(data as Record<string, unknown>);
      } catch (err: unknown) {
        console.error(`Error updating ${errorLabel}:`, err);
        throw err instanceof Error ? err : new Error(`Failed to update ${errorLabel}`);
      }
    },
    onSuccess: (nextSettings) => {
      queryClient.setQueryData(queryKey, nextSettings);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    settings: settingsQuery.data ?? null,
    isLoading: settingsQuery.isLoading || updateMutation.isPending,
    error: settingsQuery.error ?? updateMutation.error ?? null,
    updateSettings: async (updates: Partial<T>) => {
      const nextSettings = await updateMutation.mutateAsync(updates);
      return nextSettings;
    },
    refetch: async () => {
      const result = await settingsQuery.refetch();
      if (result.error) {
        throw result.error;
      }
      return result.data ?? null;
    }
  };
}
