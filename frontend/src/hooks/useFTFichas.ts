import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface FTFicha {
  id: string;
  nome: string;
  categoria: string;
  rendimento_total: number;
  modo_preparo: string;
  cmv_ideal: number;
  preco_venda: number;
  praca_id?: string;
  imagem_url?: string;
  imagem_base64?: string;
  created_at: string;
  ingredientes?: FTFichaIngrediente[];
  complementos?: FTFichaComplemento;
}

export interface FTFichaIngrediente {
  id: string;
  ficha_id: string;
  insumo_id: string;
  pb_gramas: number;
  fc: number;
  ir: number;
  ia: number;
  icd: number;
  acucares_adicionados_g: number;
  sodio_mg: number;
  gordura_saturada_g: number;
  insumo_nome?: string;
  preco_unitario_base?: number;
}

export interface FTFichaComplemento {
  ficha_id: string;
  validade_dias: number;
  conservacao: string;
  contem_gluten: boolean;
  contem_lactose: boolean;
  observacoes: string;
}

export function useFTFichas() {
  const queryClient = useQueryClient();

  // Listagem completa com ingredientes para cálculo de CMV
  const { data: fichas = [], isLoading } = useQuery({
    queryKey: ['ft_fichas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ft_fichas')
        .select(`
          *,
          ft_ficha_complementos(*),
          ft_ficha_ingredientes(
            pb_gramas,
            insumo:ft_insumos(nome, preco_unitario_base, acucares_adicionados_g, sodio_mg, gordura_saturada_g, is_liquid)
          )
        `)
        .order('nome');
      
      if (error) throw error;

      // Normalizar para facilitar o cálculo no componente
      return data.map((f: any) => ({
        ...f,
        complementos: f.ft_ficha_complementos?.[0] || null,
        ingredientes: f.ft_ficha_ingredientes?.map((i: any) => ({
          id: i.id,
          insumo_id: i.insumo_id,
          pb_gramas: i.pb_gramas,
          preco_unitario_base: i.insumo?.preco_unitario_base || 0,
          insumo_nome: i.insumo?.nome,
          acucares_adicionados_g: i.insumo?.acucares_adicionados_g || 0,
          sodio_mg: i.insumo?.sodio_mg || 0,
          gordura_saturada_g: i.insumo?.gordura_saturada_g || 0,
          is_liquid: i.insumo?.is_liquid || false
        }))
      })) as FTFicha[];
    }
  });

  // Detalhes de uma ficha específica
  const getFicha = async (id: string) => {
    const { data, error } = await supabase
      .from('ft_fichas')
      .select(`
        *,
        ft_ficha_ingredientes(
          *,
          insumo:ft_insumos(nome, preco_unitario_base, acucares_adicionados_g, sodio_mg, gordura_saturada_g, is_liquid)
        ),
        ft_ficha_complementos(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;

    // Normalizar dados para o frontend
    return {
      ...data,
      ingredientes: data.ft_ficha_ingredientes?.map((i: any) => ({
        ...i,
        insumo_nome: i.insumo.nome,
        preco_unitario_base: i.insumo.preco_unitario_base,
        acucares_adicionados_g: i.acucares_adicionados_g,
        sodio_mg: i.sodio_mg,
        gordura_saturada_g: i.gordura_saturada_g,
        is_liquid: i.insumo.is_liquid
      })),
      complementos: data.ft_ficha_complementos?.[0] || null
    } as FTFicha;
  };

  const upsertFicha = useMutation({
    mutationFn: async (payload: { ficha: Partial<FTFicha>, ingredientes: Partial<FTFichaIngrediente>[], complementos: Partial<FTFichaComplemento> }) => {
      const { ficha, ingredientes, complementos } = payload;
      
      // 1. Upsert Ficha
      const { data: fichaData, error: fichaError } = await supabase
        .from('ft_fichas')
        .upsert(ficha)
        .select()
        .single();
      
      if (fichaError) throw fichaError;

      // 2. Delete old ingredients and insert new ones (Simplest approach for sync)
      if (ficha.id) {
        await supabase.from('ft_ficha_ingredientes').delete().eq('ficha_id', fichaData.id);
      }
      
      if (ingredientes.length) {
        const ingsToInsert = ingredientes.map(i => ({ ...i, ficha_id: fichaData.id }));
        const { error: ingError } = await supabase.from('ft_ficha_ingredientes').insert(ingsToInsert);
        if (ingError) throw ingError;
      }

      // 3. Upsert Complementos
      const { error: compError } = await supabase
        .from('ft_ficha_complementos')
        .upsert({ ...complementos, ficha_id: fichaData.id });
      if (compError) throw compError;

      return fichaData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ft_fichas'] });
    }
  });

  const deleteFicha = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ft_fichas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ft_fichas'] })
  });

  return {
    fichas,
    isLoading,
    getFicha,
    upsertFicha: upsertFicha.mutateAsync,
    deleteFicha: deleteFicha.mutateAsync
  };
}
