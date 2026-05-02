import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { NotificationService } from '../services/NotificationService';

export type TaskCategory = 'mise_en_place' | 'higiene' | 'estoque' | 'urgente' | 'administrativo' | 'geral';

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
  category: TaskCategory;
  due_time?: string;
  completed_by?: string;
  completed_at?: string;
  notes?: string;
  template_id?: string;
}

export const TASK_CATEGORIES: Record<TaskCategory, { label: string; icon: string; color: string }> = {
  mise_en_place: { label: 'Mise en Place', icon: 'Utensils', color: 'orange' },
  higiene:       { label: 'Higiene',       icon: 'Sparkles', color: 'blue' },
  estoque:       { label: 'Estoque',       icon: 'Package',  color: 'green' },
  urgente:       { label: 'Urgente',       icon: 'Zap',      color: 'red' },
  administrativo:{ label: 'Administrativo',icon: 'FileText', color: 'gray' },
  geral:         { label: 'Geral',         icon: 'CheckSquare', color: 'primary' },
};

const PAGE_SIZE = 20;

const SELECT_FIELDS = 'id, title, subtitle, station, priority, status, shift, is_completed, assigned_to, created_at, is_archived, category, due_time, completed_by, completed_at, notes, template_id';

export function useTasks(station?: string, dayFilter: 'hoje' | 'ontem' = 'hoje') {
  const queryClient = useQueryClient();

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
    mutationFn: async ({ id, is_completed, userId }: { id: string, is_completed: boolean, userId?: string }) => {
      const updateData: any = { 
        is_completed, 
        status: is_completed ? 'completed' : 'pending',
        completed_by: is_completed ? userId || null : null,
        completed_at: is_completed ? new Date().toISOString() : null,
      };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
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

  const updateTaskNotes = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ notes })
        .eq('id', id);
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

  const archiveCompletedTasks = useMutation({
    mutationFn: async (stationToArchive: string) => {
      const { error } = await supabase
        .from('tasks')
        .update({ is_archived: true, status: 'archived' })
        .eq('station', stationToArchive)
        .eq('is_completed', true)
        .not('is_archived', 'eq', true);
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
    updateTaskNotes: updateTaskNotes.mutateAsync,
    deleteTask: deleteTask.mutateAsync,
    archiveTask: archiveTask.mutateAsync,
    archiveCompletedTasks: archiveCompletedTasks.mutateAsync,
    isToggling: toggleTask.isPending,
  };
}

// ─── Weekly Stats Hook (for leadership dashboard) ─────────────────────────────

export interface DailyStationStats {
  date: string;
  station: string;
  total: number;
  completed: number;
  efficiency: number;
}

export function useWeeklyStats(shiftFilter: 'manha' | 'tarde' | 'todos' = 'todos') {
  return useQuery({
    queryKey: ['tasks', 'weekly_stats', shiftFilter],
    queryFn: async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);

      const { data, error } = await supabase
        .from('tasks')
        .select('station, is_completed, created_at, shift')
        .gte('created_at', sevenDaysAgo.toISOString())
        .not('is_archived', 'eq', true);

      if (error) throw error;

      const filteredData = shiftFilter === 'todos' 
        ? data 
        : data?.filter(t => t.shift === shiftFilter || t.shift === 'todos');

      // Group by date and station
      const grouped: Record<string, Record<string, { total: number; completed: number }>> = {};
      const stations = new Set<string>();

      for (const task of (filteredData || [])) {
        const dateStr = task.created_at.split('T')[0];
        stations.add(task.station);

        if (!grouped[dateStr]) grouped[dateStr] = {};
        if (!grouped[dateStr][task.station]) grouped[dateStr][task.station] = { total: 0, completed: 0 };

        grouped[dateStr][task.station].total++;
        if (task.is_completed) grouped[dateStr][task.station].completed++;
      }

      // Build daily stats
      const dailyStats: DailyStationStats[] = [];
      for (const [date, stationData] of Object.entries(grouped)) {
        for (const [station, stats] of Object.entries(stationData)) {
          dailyStats.push({
            date,
            station,
            total: stats.total,
            completed: stats.completed,
            efficiency: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
          });
        }
      }

      // Station rankings (aggregate)
      const stationRanking: Record<string, { total: number; completed: number; efficiency: number }> = {};
      for (const stat of dailyStats) {
        if (!stationRanking[stat.station]) stationRanking[stat.station] = { total: 0, completed: 0, efficiency: 0 };
        stationRanking[stat.station].total += stat.total;
        stationRanking[stat.station].completed += stat.completed;
      }
      for (const station of Object.keys(stationRanking)) {
        const s = stationRanking[station];
        s.efficiency = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
      }

      // Daily global efficiency
      const dailyGlobal: { date: string; efficiency: number; total: number; completed: number }[] = [];
      for (const [date, stationData] of Object.entries(grouped)) {
        let total = 0, completed = 0;
        for (const stats of Object.values(stationData)) {
          total += stats.total;
          completed += stats.completed;
        }
        dailyGlobal.push({
          date,
          efficiency: total > 0 ? Math.round((completed / total) * 100) : 0,
          total,
          completed,
        });
      }
      dailyGlobal.sort((a, b) => a.date.localeCompare(b.date));

      return {
        dailyStats,
        stationRanking: Object.entries(stationRanking)
          .map(([station, stats]) => ({ station, ...stats }))
          .sort((a, b) => b.efficiency - a.efficiency),
        dailyGlobal,
        stations: Array.from(stations),
      };
    },
    staleTime: 60_000, // 1 min
  });
}
