import { useInfiniteQuery, useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface Insumo {
  id: string;
  name: string;
  station: string;
  quantity: number;
  unit: string;
  status: 'stable' | 'warning' | 'critical' | 'expired';
  expiry_date?: string;
  last_prep_at: string;
}

const PAGE_SIZE = 20;

export function useInsumos(station?: string) {
  const queryClient = useQueryClient();

  // Selective fields to reduce payload
  const SELECT_FIELDS = 'id, name, station, quantity, unit, status, expiry_date, last_prep_at';

  // For the standard list with "Load More"
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

  // Keep a standard non-paginated query for parts of the UI that still need simple access (like the Dashboard)
  // or just use query.data?.pages.flat() in components.
  // Actually, to avoid breaking everything at once, I'll provide a flattened helper.
  const allInsumos = infiniteQuery.data?.pages.flat() || [];

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ id, quantity }: { id: string, quantity: number }) => {
      let status: Insumo['status'] = 'stable';
      if (quantity <= 0) status = 'critical';
      else if (quantity <= 2) status = 'warning';

      const { error } = await supabase
        .from('insumos')
        .update({ quantity, status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
    },
  });

  const createInsumoMutation = useMutation({
    mutationFn: async (newInsumo: Omit<Insumo, 'id' | 'last_prep_at' | 'status'>) => {
      const { data, error } = await supabase
        .from('insumos')
        .insert([{ ...newInsumo, status: 'stable' }])
        .select(SELECT_FIELDS)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['insumos'] });
    },
  });

  const deleteInsumoMutation = useMutation({
    mutationFn: async (id: string) => {
      // Fetch item name first to clean up notifications
      const { data: item } = await supabase.from('insumos').select('name').eq('id', id).single();

      const { error } = await supabase.from('insumos').delete().eq('id', id);
      if (error) throw error;

      // Clean up unread notifications for this item
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
    insumos: allInsumos, // Flattened and ready to use
    updateQuantity: updateQuantityMutation.mutateAsync,
    createInsumo: createInsumoMutation.mutateAsync,
    deleteInsumo: deleteInsumoMutation.mutateAsync,
    isUpdating: updateQuantityMutation.isPending || createInsumoMutation.isPending || deleteInsumoMutation.isPending,
  };
}
