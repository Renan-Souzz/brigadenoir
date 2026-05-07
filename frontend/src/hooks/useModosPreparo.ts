import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface ModoPreparo {
  id: string;
  nome: string;
  categoria: string;
  passos: string[];
  pracas: string[];
  tempo_preparo?: number;
  rendimento?: number;
  ticket_avg?: string;
  status?: string;
  image_url?: string;
  image_base64?: string;
  created_at?: string;
}

export function useModosPreparo() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['modos_preparo'],
    queryFn: async () => {
      // 1. Fetch all recipes
      const { data: recipes, error: recipesError } = await supabase
        .from('modos_preparo')
        .select('*')
        .order('nome');
      
      if (recipesError) throw recipesError;

      // 2. Fetch all station mappings
      const { data: mappings, error: mappingsError } = await supabase
        .from('modo_preparo_stations')
        .select('modo_id, station');
      
      if (mappingsError) throw mappingsError;

      // 3. Combine data
      return recipes.map(recipe => ({
        ...recipe,
        pracas: mappings
          .filter(m => m.modo_id === recipe.id)
          .map(m => m.station)
      })) as ModoPreparo[];
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (modo: Partial<ModoPreparo> & { nome: string; categoria: string; passos: string[]; pracas: string[] }) => {
      const { pracas, ...recipeData } = modo;
      
      // 1. Upsert recipe
      const { data: savedRecipe, error: recipeError } = await supabase
        .from('modos_preparo')
        .upsert(recipeData)
        .select()
        .single();
      
      if (recipeError) throw recipeError;

      // 2. Update stations mapping
      // First, delete current mappings
      await supabase
        .from('modo_preparo_stations')
        .delete()
        .eq('modo_id', savedRecipe.id);
      
      // Then, insert new mappings if any
      if (pracas && pracas.length > 0) {
        const stationMappings = pracas.map(station => ({
          modo_id: savedRecipe.id,
          station
        }));
        
        const { error: mappingError } = await supabase
          .from('modo_preparo_stations')
          .insert(stationMappings);
        
        if (mappingError) throw mappingError;
      }

      return savedRecipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modos_preparo'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('modos_preparo')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modos_preparo'] });
    },
  });

  return {
    ...query,
    upsertModoPreparo: upsertMutation.mutateAsync,
    deleteModoPreparo: deleteMutation.mutateAsync,
    isUpdating: upsertMutation.isPending || deleteMutation.isPending,
  };
}
