import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Station {
  id: string;
  display_name: string;
  description?: string;
  is_active: boolean;
}

export function useStations() {
  const queryClient = useQueryClient();

  const { data: stations = [], isLoading } = useQuery({
    queryKey: ['stations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stations')
        .select('*')
        .neq('id', 'lideranca')
        .order('id');
      
      if (error) throw error;
      return data as Station[];
    }
  });

  const updateStation = useMutation({
    mutationFn: async ({ id, display_name }: { id: string, display_name: string }) => {
      const { error } = await supabase
        .from('stations')
        .update({ display_name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    }
  });

  const toggleStation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('stations')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stations'] });
    }
  });

  return {
    stations,
    activeStations: stations.filter(s => s.is_active),
    isLoading,
    updateStation: updateStation.mutateAsync,
    toggleStation: toggleStation.mutateAsync,
    formatStationName: (id: string) => {
      if (id === 'todos') return 'TODAS AS PRAÇAS';
      const s = stations.find(st => st.id === id);
      return s?.display_name || id.toUpperCase().replace('_', ' ');
    }
  };
}
