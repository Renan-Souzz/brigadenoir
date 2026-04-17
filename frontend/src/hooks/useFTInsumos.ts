import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface FTInsumo {
  id: string;
  nome: string;
  unidade_base: 'g' | 'ml' | 'un';
  preco_compra: number;
  quantidade_compra: number;
  unidade_compra: string;
  preco_unitario_base: number;
  acucares_adicionados_g: number;
  sodio_mg: number;
  gordura_saturada_g: number;
  is_liquid: boolean;
  data_atualizacao: string;
  alergenicos?: string[];
}

export function useFTInsumos() {
  const queryClient = useQueryClient();

  const { data: insumos = [], isLoading, refetch } = useQuery({
    queryKey: ['ft_insumos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ft_insumos')
        .select(`
          *,
          ft_insumo_alergenicos(
            ft_alergenicos(nome)
          )
        `)
        .order('nome');
      
      if (error) throw error;
      
      return data.map((i: any) => ({
        ...i,
        alergenicos: i.ft_insumo_alergenicos?.map((a: any) => a.ft_alergenicos.nome) || []
      })) as FTInsumo[];
    }
  });

  const createInsumo = useMutation({
    mutationFn: async (newInsumo: Partial<FTInsumo> & { alergenicos?: string[] }) => {
      const { alergenicos, ...rest } = newInsumo;
      const { data, error } = await supabase
        .from('ft_insumos')
        .insert([rest])
        .select()
        .single();
      
      if (error) throw error;

      if (alergenicos?.length) {
        // Obter IDs dos alérgenos
        const { data: algData } = await supabase
          .from('ft_alergenicos')
          .select('id, nome')
          .in('nome', alergenicos);
        
        if (algData) {
          const links = algData.map(a => ({ insumo_id: data.id, alergenico_id: a.id }));
          await supabase.from('ft_insumo_alergenicos').insert(links);
        }
      }

      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ft_insumos'] })
  });

  const deleteInsumo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ft_insumos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ft_insumos'] })
  });

  return {
    insumos,
    isLoading,
    refetch,
    createInsumo: createInsumo.mutateAsync,
    deleteInsumo: deleteInsumo.mutateAsync
  };
}
