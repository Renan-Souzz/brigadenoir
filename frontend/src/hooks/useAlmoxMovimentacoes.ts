import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type AlmoxTipoMov = 'chegada' | 'subida_cozinha' | 'teste_quebra' | 'retorno_almox' | 'requisicao';

export interface AlmoxMovimentacao {
  id: string;
  produto_nome: string;
  categoria: string;
  lote_id: string | null;
  tipo: AlmoxTipoMov;
  peso_bruto_kg?: number;
  peso_liquido_kg?: number;
  peso_perda_kg?: number;
  num_porcoes?: number;
  peso_por_porcao?: number;
  percentual_aproveitamento?: number;
  porcoes_retornadas?: number;
  porcoes_solicitadas?: number;
  quantidade_enviada?: number;
  saldo_porcoes: number;
  validade?: string;
  data_movimentacao: string;
  observacoes?: string;
  created_by?: string;
  created_at?: string;
  ft_insumo_id?: string;
}

export interface LoteSaldo {
  lote_id: string;
  produto_nome: string;
  categoria: string;
  saldo_porcoes: number;
  ultima_movimentacao: string;
  movimentacoes: AlmoxMovimentacao[];
}

const QUERY_KEY = ['almox_movimentacoes'];

export function useAlmoxMovimentacoes() {
  const queryClient = useQueryClient();

  // ─── List all movimentacoes ───
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('almox_movimentacoes')
        .select('*')
        .order('data_movimentacao', { ascending: false });

      if (error) throw error;
      return data as AlmoxMovimentacao[];
    },
  });

  // ─── Create movimentacao ───
  const createMutation = useMutation({
    mutationFn: async (mov: Partial<AlmoxMovimentacao>) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('almox_movimentacoes')
        .insert({ ...mov, created_by: userId })
        .select()
        .single();

      if (error) throw error;
      return data as AlmoxMovimentacao;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // ─── Update movimentacao ───
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AlmoxMovimentacao> }) => {
      const { error } = await supabase
        .from('almox_movimentacoes')
        .update(data)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // ─── Delete movimentacao ───
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('almox_movimentacoes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });

  // ─── Derived data helpers ───
  const movimentacoes = query.data || [];

  /**
   * Get unique lotes with their current saldo & full history
   */
  function getLotes(): LoteSaldo[] {
    const loteMap = new Map<string, AlmoxMovimentacao[]>();

    for (const m of movimentacoes) {
      if (!m.lote_id) continue;
      if (!loteMap.has(m.lote_id)) loteMap.set(m.lote_id, []);
      loteMap.get(m.lote_id)!.push(m);
    }

    const lotes: LoteSaldo[] = [];
    for (const [lote_id, movs] of loteMap.entries()) {
      // Sort by date ascending for timeline
      const sorted = [...movs].sort(
        (a, b) => new Date(a.data_movimentacao).getTime() - new Date(b.data_movimentacao).getTime()
      );

      const chegada = sorted.find(m => m.tipo === 'chegada');

      // Calculate saldo: porções retornadas - porções solicitadas
      let saldo = 0;
      for (const m of sorted) {
        if (m.tipo === 'retorno_almox' && m.porcoes_retornadas) {
          saldo += m.porcoes_retornadas;
        }
        if (m.tipo === 'requisicao' && m.porcoes_solicitadas) {
          saldo -= m.porcoes_solicitadas;
        }
      }

      lotes.push({
        lote_id,
        produto_nome: chegada?.produto_nome || sorted[0]?.produto_nome || 'Desconhecido',
        categoria: chegada?.categoria || 'proteinas',
        saldo_porcoes: Math.max(0, saldo),
        ultima_movimentacao: sorted[sorted.length - 1]?.data_movimentacao || '',
        movimentacoes: sorted,
      });
    }

    // Sort lotes by most recent activity
    return lotes.sort(
      (a, b) => new Date(b.ultima_movimentacao).getTime() - new Date(a.ultima_movimentacao).getTime()
    );
  }

  /**
   * Get lotes that have chegada but NO subida_cozinha yet (pending processing)
   */
  function getLotesPendentes(): LoteSaldo[] {
    return getLotes().filter(l => {
      const tipos = l.movimentacoes.map(m => m.tipo);
      return tipos.includes('chegada') && !tipos.includes('subida_cozinha');
    });
  }

  /**
   * Get lotes that were sent to kitchen but have NO teste_quebra yet
   */
  function getLotesNaCozinha(): LoteSaldo[] {
    return getLotes().filter(l => {
      const tipos = l.movimentacoes.map(m => m.tipo);
      return tipos.includes('subida_cozinha') && !tipos.includes('teste_quebra');
    });
  }

  /**
   * Get lotes with porções in stock (saldo > 0)
   */
  function getLotesComEstoque(): LoteSaldo[] {
    return getLotes().filter(l => l.saldo_porcoes > 0);
  }

  /**
   * Get stats for a given date range
   */
  function getStats(startDate?: string, endDate?: string) {
    let filtered = movimentacoes;
    if (startDate) {
      filtered = filtered.filter(m => {
        const dateStr = m.data_movimentacao.split('T')[0];
        return dateStr >= startDate;
      });
    }
    if (endDate) {
      filtered = filtered.filter(m => {
        const dateStr = m.data_movimentacao.split('T')[0];
        return dateStr <= endDate;
      });
    }

    const chegadas = filtered.filter(m => m.tipo === 'chegada');
    const quebras = filtered.filter(m => m.tipo === 'teste_quebra');
    const requisicoes = filtered.filter(m => m.tipo === 'requisicao');

    const totalRecebidoKg = chegadas.reduce((acc, m) => acc + (m.peso_bruto_kg || 0), 0);
    const totalLiquidoKg = quebras.reduce((acc, m) => acc + (m.peso_liquido_kg || 0), 0);
    const totalPerdaKg = quebras.reduce((acc, m) => acc + (m.peso_perda_kg || 0), 0);
    const totalPorcoes = quebras.reduce((acc, m) => acc + (m.num_porcoes || 0), 0);
    const totalRequisitadas = requisicoes.reduce((acc, m) => acc + (m.porcoes_solicitadas || 0), 0);
    const mediaAproveitamento = quebras.length > 0
      ? quebras.reduce((acc, m) => acc + (m.percentual_aproveitamento || 0), 0) / quebras.length
      : 0;

    return {
      totalRecebidoKg,
      totalLiquidoKg,
      totalPerdaKg,
      totalPorcoes,
      totalRequisitadas,
      mediaAproveitamento,
      numChegadas: chegadas.length,
      numQuebras: quebras.length,
      numRequisicoes: requisicoes.length,
    };
  }

  return {
    ...query,
    movimentacoes,
    createMovimentacao: createMutation.mutateAsync,
    updateMovimentacao: updateMutation.mutateAsync,
    deleteMovimentacao: deleteMutation.mutateAsync,
    isUpdating: createMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
    getLotes,
    getLotesPendentes,
    getLotesNaCozinha,
    getLotesComEstoque,
    getStats,
  };
}
