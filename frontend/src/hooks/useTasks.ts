import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

export interface Task {
  id: string;
  title: string;
  subtitle?: string;
  station: string;
  priority: 'low' | 'normal' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'archived' | 'expired';
  shift: 'manha' | 'tarde' | 'todos';
  is_completed: boolean;
  assigned_to?: string;
  created_at: string;
  is_archived: boolean;
}

const PAGE_SIZE = 20;

export function useTasks(station?: string, dayFilter: 'hoje' | 'ontem' = 'hoje') {
  const queryClient = useQueryClient();

  const SELECT_FIELDS = 'id, title, subtitle, station, priority, status, shift, is_completed, assigned_to, created_at, is_archived';

  const infiniteQuery = useInfiniteQuery({
    queryKey: ['tasks', 'infinite', station, dayFilter],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const now = new Date();
      // Correct local day start
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      
      const todayStart = today.toISOString();
      const yesterdayStart = yesterday.toISOString();

      let q = supabase
        .from('tasks')
        .select(SELECT_FIELDS)
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);
      
      if (station && station !== 'lideranca' && station !== 'todos') {
        q = q.eq('station', station);
      }

      if (dayFilter === 'hoje') {
        // Today's tasks + uncompleted tasks from any time (Late)
        q = q.or(`created_at.gte.${todayStart},is_completed.eq.false`);
      } else {
        // Yesterday's tasks + uncompleted tasks (Late)
        // Including uncompleted from before today ensures "deixadas de outros dias" appear here too
        q = q.or(`and(created_at.gte.${yesterdayStart},created_at.lt.${todayStart}),is_completed.eq.false`);
      }

      const { data, error } = await q;
      if (error) throw error;
      return data as Task[];
    },
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.length < PAGE_SIZE) return undefined;
      return allPages.length * PAGE_SIZE;
    },
  });

  const allTasks = infiniteQuery.data?.pages.flat() || [];

  const toggleTask = useMutation({
    mutationFn: async ({ id, is_completed }: { id: string, is_completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          is_completed, 
          status: is_completed ? 'completed' : 'pending' 
        })
        .eq('id', id);
      if (error) throw error;

      // Check if 100% completion for the station
      if (is_completed) {
        const currentTask = allTasks.find(t => t.id === id);
        if (currentTask) {
          const stationTasks = allTasks.filter(t => t.station === currentTask.station);
          const otherTasksIncomplete = stationTasks.filter(t => t.id !== id && !t.is_completed).length;
          if (otherTasksIncomplete === 0 && stationTasks.length > 0) {
            await NotificationService.notifyLeadership({
              title: 'Checklist Concluído',
              message: `A praça ${currentTask.station} finalizou todas as suas tarefas pendentes.`,
              type: 'success',
              station: currentTask.station
            });
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const addTask = useMutation({
    mutationFn: async (task: Partial<Task>) => {
      const { error } = await supabase
        .from('tasks')
        .insert([task]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  const archiveTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_archived: true, status: 'archived' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  return {
    ...infiniteQuery,
    tasks: allTasks,
    toggleTask: toggleTask.mutateAsync,
    addTask: addTask.mutateAsync,
    deleteTask: deleteTask.mutateAsync,
    archiveTask: archiveTask.mutateAsync,
    isToggling: toggleTask.isPending,
  };
}
