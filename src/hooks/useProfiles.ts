import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { AppRole, KitchenStation, Profile } from '../contexts/AuthContext';

export interface Invite {
  id: string;
  code: string;
  role: AppRole;
  is_used: boolean;
  created_at: string;
}

export function useProfiles() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');
      
      if (error) throw error;
      return data as Profile[];
    },
  });

  const updateProfile = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string, updates: Partial<Profile> }) => {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
    },
  });

  return { ...query, updateProfile: updateProfile.mutateAsync };
}

export function useInvites() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      const dayAgo = new Date();
      dayAgo.setDate(dayAgo.getDate() - 1);
      
      const { data, error } = await supabase
        .from('invitation_codes')
        .select('*')
        .eq('is_used', false)
        .gt('created_at', dayAgo.toISOString())
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Invite[];
    },
  });

  const generateInvite = useMutation({
    mutationFn: async ({ role, createdBy }: { role: AppRole, createdBy: string }) => {
      const code = 'BN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const { error } = await supabase
        .from('invitation_codes')
        .insert([{ code, role, created_by: createdBy }]);
      if (error) throw error;
      return code;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });

  const deleteInvite = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('invitation_codes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });

  return { 
    ...query, 
    generateInvite: generateInvite.mutateAsync, 
    deleteInvite: deleteInvite.mutateAsync 
  };
}
