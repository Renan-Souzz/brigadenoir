import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Task } from './useTasks';
import { Insumo } from './useInsumos';

export type ReportPeriod = '7d' | '15d' | '30d' | 'this_month';

export function useReportData(period: ReportPeriod) {
  return useQuery({
    queryKey: ['report_data', period],
    queryFn: async () => {
      let startDate = new Date();
      if (period === '7d') startDate.setDate(startDate.getDate() - 7);
      else if (period === '15d') startDate.setDate(startDate.getDate() - 15);
      else if (period === '30d') startDate.setDate(startDate.getDate() - 30);
      else if (period === 'this_month') startDate = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      
      const startDateStr = startDate.toISOString();
      const startDateLocalStr = startDate.toISOString().split('T')[0];

      // 1. Fetch Tasks
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .gte('created_at', startDateStr);
      if (tasksError) throw tasksError;

      // 2. Fetch Insumos (Need all for current stock status)
      const { data: insumos, error: insumosError } = await supabase
        .from('insumos')
        .select('*');
      if (insumosError) throw insumosError;

      // 3. Fetch PAX
      const { data: pax, error: paxError } = await supabase
        .from('daily_pax')
        .select('*')
        .gte('date', startDateLocalStr);
      if (paxError) throw paxError;

      // 4. Fetch Almoxarifado Movimentacoes (subida_cozinha, requisicao)
      const { data: movements, error: movError } = await supabase
        .from('almox_movimentacoes')
        .select('*')
        .in('tipo', ['subida_cozinha', 'requisicao'])
        .order('data_movimentacao', { ascending: false })
        .limit(20);
      if (movError) throw movError;

      return {
        tasks: tasks as Task[],
        insumos: insumos as Insumo[],
        pax: pax as any[],
        movements: movements as any[]
      };
    }
  });
}
