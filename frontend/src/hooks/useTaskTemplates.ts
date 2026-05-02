import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface TaskTemplate {
  id: string;
  title: string;
  subtitle?: string;
  station: string;
  priority: string;
  shift: string;
  category: string;
  due_time?: string;
  recurrence: 'daily' | 'weekdays' | 'weekly';
  is_active: boolean;
  created_by?: string;
  created_at: string;
}

export function useTaskTemplates() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task_templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_templates')
        .select('*')
        .order('station')
        .order('shift')
        .order('title');

      if (error) throw error;
      return data as TaskTemplate[];
    },
  });

  const addTemplate = useMutation({
    mutationFn: async (template: Partial<TaskTemplate>) => {
      const { error } = await supabase
        .from('task_templates')
        .insert([template]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_templates'] });
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TaskTemplate> }) => {
      const { error } = await supabase
        .from('task_templates')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_templates'] });
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('task_templates')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_templates'] });
    },
  });

  const toggleTemplate = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('task_templates')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task_templates'] });
    },
  });

  // Generate tasks from active templates
  const generateFromTemplates = useMutation({
    mutationFn: async (userId: string) => {
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0=Sun, 6=Sat
      const todayStr = today.toISOString().split('T')[0];

      // Check if tasks were already generated today
      const { data: existingTasks } = await supabase
        .from('tasks')
        .select('template_id')
        .not('template_id', 'is', null)
        .gte('created_at', todayStr + 'T00:00:00')
        .lte('created_at', todayStr + 'T23:59:59');

      const generatedTemplateIds = new Set((existingTasks || []).map(t => t.template_id));

      // Get active templates
      const { data: templates, error } = await supabase
        .from('task_templates')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;

      const tasksToCreate: any[] = [];

      for (const tpl of (templates || [])) {
        // Skip if already generated
        if (generatedTemplateIds.has(tpl.id)) continue;

        // Check recurrence
        if (tpl.recurrence === 'weekdays' && (dayOfWeek === 0 || dayOfWeek === 6)) continue;
        if (tpl.recurrence === 'weekly' && dayOfWeek !== 1) continue; // Monday only

        tasksToCreate.push({
          title: tpl.title,
          subtitle: tpl.subtitle,
          station: tpl.station,
          priority: tpl.priority,
          shift: tpl.shift,
          category: tpl.category,
          due_time: tpl.due_time,
          status: 'pending',
          is_completed: false,
          is_archived: false,
          assigned_to: userId,
          template_id: tpl.id,
        });
      }

      if (tasksToCreate.length > 0) {
        const { error: insertError } = await supabase
          .from('tasks')
          .insert(tasksToCreate);
        if (insertError) throw insertError;
      }

      return tasksToCreate.length;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task_templates'] });
    },
  });

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    addTemplate: addTemplate.mutateAsync,
    updateTemplate: updateTemplate.mutateAsync,
    deleteTemplate: deleteTemplate.mutateAsync,
    toggleTemplate: toggleTemplate.mutateAsync,
    generateFromTemplates: generateFromTemplates.mutateAsync,
    isGenerating: generateFromTemplates.isPending,
  };
}
