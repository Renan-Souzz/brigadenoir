import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

export type DutyStatus = 'trabalho' | 'folga' | 'compensa';

export interface DutyRecord {
  id: string;
  user_id: string;
  date: string;
  status: DutyStatus;
  month_key: string;
}

export function useSchedule(monthKey?: string) {
  const queryClient = useQueryClient();

  const { data: schedule = [], isLoading } = useQuery({
    queryKey: ['schedule', monthKey],
    queryFn: async () => {
      let query = supabase.from('duty_roster').select('*');
      if (monthKey) {
        query = query.eq('month_key', monthKey);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data as DutyRecord[];
    },
    enabled: true
  });

  const upsertDuty = useMutation({
    mutationFn: async (record: Omit<DutyRecord, 'id'>) => {
      const { data, error } = await supabase
        .from('duty_roster')
        .upsert([record], { onConflict: 'user_id,date' })
        .select();
      if (error) throw error;
      
      const statusLabel = record.status === 'folga' ? 'Folga' : record.status === 'compensa' ? 'Compensação' : 'Trabalho';
      const type = record.status === 'trabalho' ? 'warning' : 'success';
      const [year, month, day] = record.date.split('-');
      
      await NotificationService.notifyUser(record.user_id, {
        title: 'Escala Alterada',
        message: `Sua escala para o dia ${day}/${month}/${year} foi definida como ${statusLabel}.`,
        type
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    }
  });

  const deleteDuty = useMutation({
    mutationFn: async ({ user_id, date }: { user_id: string; date: string }) => {
      const { error } = await supabase
        .from('duty_roster')
        .delete()
        .eq('user_id', user_id)
        .eq('date', date);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule'] });
    }
  });

  return {
    schedule,
    isLoading,
    upsertDuty: upsertDuty.mutateAsync,
    deleteDuty: deleteDuty.mutateAsync,
    isApplying: upsertDuty.isPending || deleteDuty.isPending
  };
}
