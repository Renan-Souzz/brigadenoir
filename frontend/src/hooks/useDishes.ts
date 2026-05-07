import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

export interface Dish {
  id: string;
  title: string;
  description: string;
  category: string;
  praca_responsavel: string;
  porcoes: number;
  image_url: string;
  image_base64?: string;
  created_at?: string;
}

export function useDishes() {
  const queryClient = useQueryClient();

  // Optimized query: Fetches only metadata to keep the list lightweight
  const query = useQuery({
    queryKey: ['dishes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dishes')
        .select('id, title, description, category, praca_responsavel, porcoes, image_url, created_at')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Dish[];
    },
  });

  // Helper to fetch full dish data including the heavy Base64 image
  const getDishDetail = async (id: string) => {
    const { data, error } = await supabase
      .from('dishes')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data as Dish;
  };

  const upsertDish = useMutation({
    mutationFn: async (dish: Partial<Dish>) => {
      const { id, ...payload } = dish;
      if (id) {
        const { error } = await supabase.from('dishes').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('dishes').insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
  });

  const deleteDish = useMutation({
    mutationFn: async (id: string) => {
      // Clean up notifications for this dish before deleting it
      await supabase.from('notifications').delete().eq('dish_id', id);
      
      const { error } = await supabase.from('dishes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
  });

  const updatePorcao = useMutation({
    mutationFn: async ({ dishId, porcoes }: { dishId: string, porcoes: number }) => {
      if (porcoes < 1) {
        const { data: dish } = await supabase.from('dishes').select('*').eq('id', dishId).single();
        if (dish) {
            await NotificationService.notifyLeadership({
                title: `86 - Prato Esgotado: ${dish.title}`,
                message: `A praça ${dish.praca_responsavel} registrou 0 porções de ${dish.title}. Bloqueie as vendas imediatamente!`,
                type: 'error',
                station: dish.praca_responsavel,
                dish_id: dishId
            });
        }
      }

      const { error } = await supabase.from('dishes').update({ porcoes }).eq('id', dishId);
      if (error) throw error;

      // Faxina Automática: Se repôs, remove o alerta de 86 deste prato
      if (porcoes > 0) {
        await supabase.from('notifications')
          .update({ is_read: true })
          .eq('dish_id', dishId)
          .eq('type', 'error');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dishes'] });
    },
  });

  return {
    ...query,
    upsertDish: upsertDish.mutateAsync,
    deleteDish: deleteDish.mutateAsync,
    updatePorcao: updatePorcao.mutateAsync,
    getDishDetail
  };
}
