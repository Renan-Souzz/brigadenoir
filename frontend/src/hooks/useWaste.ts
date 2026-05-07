import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface WasteLog {
  id: string;
  created_at: string;
  user_id: string;
  station: string;
  product_name: string;
  quantity: number;
  unit: string;
  reason?: string;
  cost_impact: number;
  ft_insumo_id?: string;
}

export function useWaste(periodInDays?: number) {
  const queryClient = useQueryClient();

  const { data: wasteLogs = [], isLoading } = useQuery({
    queryKey: ['waste_logs', periodInDays],
    queryFn: async () => {
      let q = supabase
        .from('waste_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (periodInDays) {
        const date = new Date();
        date.setDate(date.getDate() - periodInDays);
        q = q.gte('created_at', date.toISOString());
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as WasteLog[];
    }
  });

  const createWasteLog = useMutation({
    mutationFn: async (newLog: Omit<WasteLog, 'id' | 'created_at' | 'cost_impact'> & { ft_insumo_id?: string }) => {
      let costImpact = 0;
      
      if (newLog.ft_insumo_id) {
        const { data: insumoData } = await supabase
          .from('ft_insumos')
          .select('preco_unitario_base')
          .eq('id', newLog.ft_insumo_id)
          .single();
        
        if (insumoData) {
          costImpact = insumoData.preco_unitario_base * newLog.quantity;
        }
      } else {
        // Fallback search by name if no ID provided
        const { data: insumoData } = await supabase
          .from('ft_insumos')
          .select('preco_unitario_base')
          .ilike('nome', `%${newLog.product_name}%`)
          .limit(1)
          .single();
        
        if (insumoData) {
          costImpact = insumoData.preco_unitario_base * newLog.quantity;
        }
      }

      const { data, error } = await supabase
        .from('waste_logs')
        .insert([{ ...newLog, cost_impact: costImpact }])
        .select()
        .single();

      if (error) throw error;
      return data as WasteLog;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['waste_logs'] });
    }
  });

  return {
    wasteLogs,
    isLoading,
    createWasteLog: createWasteLog.mutateAsync,
    isCreating: createWasteLog.isPending
  };
}
