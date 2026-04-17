import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface DailyPax {
  id: string;
  date: string;
  lunch_pax: number;
  dinner_pax: number;
}

export function usePax(startDate?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['pax', startDate],
    queryFn: async () => {
      let q = supabase
        .from('daily_pax')
        .select('*')
        .order('date', { ascending: true });
      
      if (startDate) {
        q = q.gte('date', startDate);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as DailyPax[];
    },
  });

  const upsertPaxMutation = useMutation({
    mutationFn: async (payload: Omit<DailyPax, 'id'>) => {
      const { error } = await supabase
        .from('daily_pax')
        .upsert(payload, { onConflict: 'date' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pax'] });
    },
  });

  return {
    ...query,
    upsertPax: upsertPaxMutation.mutateAsync,
    isSaving: upsertPaxMutation.isPending,
  };
}
