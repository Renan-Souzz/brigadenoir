import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

export interface InsumoLog {
  id: string;
  insumo_id: string;
  user_id: string;
  old_qty: number;
  new_qty: number;
  action: string;
  created_at: string;
  user?: { full_name: string };
}

export interface Insumo {
  id: string;
  name: string;
  categoria?: string;
  station: string;
  quantity: number;
  unit: string;
  status: 'stable' | 'warning' | 'critical' | 'expired';
  expiry_date?: string;
  last_prep_at: string;
  min_stock: number;
  updated_by?: string;
  ft_insumo_id?: string;
}

export interface StationStreak {
  station: string;
  current_streak: number;
  last_updated_date: string;
}

const PAGE_SIZE = 20;

export function useInsumos(station?: string) {
  const queryClient = useQueryClient();

  const SELECT_FIELDS = 'id, name, categoria, station, quantity, unit, status, expiry_date, last_prep_at, min_stock, updated_by, ft_insumo_id';

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['insumos', 'infinite', station],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      let q = supabase
        .from('insumos')
        .select(SELECT_FIELDS)
        .order('name')
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      
      if (station && station !== 'lideranca' && station !== 'todos') {
        q = q.eq('station', station);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Insumo[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });

  const allInsumos = infiniteQuery.data?.pages.flat() || [];

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity, userId }: { id: string, quantity: number, userId: string }) => {
      const item = allInsumos.find(i => i.id === id);
      if (!item) throw new Error("Item not found");

      let status: Insumo['status'] = 'stable';
      if (quantity <= 0) status = 'critical';
      else if (quantity <= item.min_stock) status = 'warning';

      const action = quantity > item.quantity ? 'entrada' : quantity < item.quantity ? 'saida' : 'ajuste';

      // Update Insumo
      const { error: updateError } = await supabase
        .from('insumos')
        .update({ quantity, status, updated_by: userId, last_prep_at: new Date().toISOString() })
        .eq('id', id);
      if (updateError) throw updateError;

      // Create Log
      await supabase.from('insumo_logs').insert([{
        insumo_id: id,
        user_id: userId,
        old_qty: item.quantity,
        new_qty: quantity,
        action: action
      }]);

      // Update Streak
      const todayStr = new Date().toISOString().split('T')[0];
      const { data: streakData } = await supabase.from('station_streaks').select('*').eq('station', item.station).single();
      
      if (streakData) {
        if (streakData.last_updated_date !== todayStr) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];

          let newStreak = 1;
          if (streakData.last_updated_date === yesterdayStr) {
            newStreak = streakData.current_streak + 1;
          }

          await supabase.from('station_streaks').update({
            current_streak: newStreak,
            last_updated_date: todayStr
          }).eq('station', item.station);
        }
      }

      if (quantity <= 0) {
        await NotificationService.notifyStation(item.station, {
          title: 'Insumo Esgotado',
          message: `Atenção: O insumo "${item.name}" atingiu quantidade ZERO na praça.`,
          type: 'error',
          station: item.station
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
      queryClient.invalidateQueries({ queryKey: ['station_streaks'] });
    },
  });

  const createInsumoMutation = useMutation({
    mutationFn: async (newInsumo: Omit<Insumo, 'id' | 'last_prep_at' | 'status' | 'updated_by'> & { userId: string }) => {
      const { userId, ...insumoData } = newInsumo;
      const { data, error } = await supabase
        .from('insumos')
        .insert([{ ...insumoData, status: 'stable', updated_by: userId }])
        .select(SELECT_FIELDS)
        .single();
      if (error) throw error;

      await supabase.from('insumo_logs').insert([{
        insumo_id: data.id,
        user_id: userId,
        old_qty: 0,
        new_qty: data.quantity,
        action: 'criacao'
      }]);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
    },
  });

  const deleteInsumoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: item } = await supabase.from('insumos').select('name').eq('id', id).single();
      const { error } = await supabase.from('insumos').delete().eq('id', id);
      if (error) throw error;

      if (item?.name) {
        await supabase.from('notifications')
          .delete()
          .ilike('title', `%${item.name}%`)
          .eq('is_read', false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
    },
  });

  return {
    ...infiniteQuery,
    insumos: allInsumos,
    updateQuantity: updateQuantityMutation.mutateAsync,
    createInsumo: createInsumoMutation.mutateAsync,
    deleteInsumo: deleteInsumoMutation.mutateAsync,
    isUpdating: updateQuantityMutation.isPending || createInsumoMutation.isPending || deleteInsumoMutation.isPending,
  };
}

export function useInsumoLogs(insumoId: string) {
  return useQuery({
    queryKey: ['insumo_logs', insumoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('insumo_logs')
        .select('*, user:profiles(full_name)')
        .eq('insumo_id', insumoId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as InsumoLog[];
    },
    enabled: !!insumoId,
  });
}

export function useStationStreaks() {
  return useQuery({
    queryKey: ['station_streaks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('station_streaks').select('*');
      if (error) throw error;
      return data as StationStreak[];
    }
  });
}
export function useInsumoHistory(station?: string) {
  return useQuery({
    queryKey: ['insumo_history', station],
    queryFn: async () => {
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      
      let q = supabase
        .from('insumo_logs')
        .select('action, old_qty, new_qty, created_at, insumo:insumos(station)')
        .gte('created_at', fifteenDaysAgo.toISOString());

      const { data, error } = await q;
      if (error) throw error;

      // Aggregation logic
      const historyMap: Record<string, { date: string, entradas: number, saidas: number, total: number }> = {};
      
      // Initialize last 15 days
      for (let i = 0; i <= 15; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const displayDate = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        historyMap[dateStr] = { date: displayDate, entradas: 0, saidas: 0, total: 0 };
      }

      data.forEach((log: any) => {
        // Filter by station if provided
        if (station && station !== 'lideranca' && station !== 'todos' && log.insumo?.station !== station) return;

        const dateStr = log.created_at.split('T')[0];
        if (!historyMap[dateStr]) return;

        if (log.action === 'entrada' || log.action === 'criacao') {
          historyMap[dateStr].entradas += (log.new_qty - log.old_qty);
        } else if (log.action === 'saida') {
          historyMap[dateStr].saidas += (log.old_qty - log.new_qty);
        }
        historyMap[dateStr].total++;
      });

      return Object.values(historyMap).reverse();
    }
  });
}
