import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface InsumoRendimento {
  id: string;
  insumo_id: string;
  data_processamento: string;
  peso_bruto: number;
  peso_liquido: number;
  peso_perda: number;
  rendimento_porcoes: number;
  created_at?: string;
  insumo?: {
    name: string;
    unit: string;
  };
}

export function useInsumoRendimentos() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['insumo_rendimentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insumo_rendimentos')
        .select(`
          *,
          insumo:insumos(name, unit)
        `)
        .order('data_processamento', { ascending: false });
      
      if (error) throw error;
      return data as InsumoRendimento[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (rendimento: Partial<InsumoRendimento>) => {
      const { data, error } = await supabase
        .from('insumo_rendimentos')
        .upsert({ ...rendimento, created_by: (await supabase.auth.getUser()).data.user?.id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumo_rendimentos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('insumo_rendimentos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumo_rendimentos'] });
    },
  });

  return {
    ...query,
    upsertRendimento: upsertMutation.mutateAsync,
    deleteRendimento: deleteMutation.mutateAsync,
    isUpdating: upsertMutation.isPending || deleteMutation.isPending,
  };
}
