import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface InactivityRule {
  id: string;
  name: string;
  minutes: number;
  is_active: boolean;
}

export function useInactivityAlerts() {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: rules = [], isLoading } = useQuery({
    queryKey: ['inactivity_rules', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('inactivity_alerts_config')
        .select('*')
        .order('minutes', { ascending: true });
      if (error) throw error;
      return data as InactivityRule[];
    },
    enabled: !!orgId,
  });

  const createRule = useMutation({
    mutationFn: async (newRule: { name: string; minutes: number }) => {
      if (!orgId) throw new Error("Organização não encontrada");
      const { data, error } = await supabase
        .from('inactivity_alerts_config')
        .insert([{ ...newRule, organization_id: orgId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inactivity_rules', orgId] });
      toast.success('Regra de alerta criada!');
    },
    onError: (err: any) => toast.error('Erro ao criar regra: ' + err.message),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inactivity_alerts_config')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inactivity_rules', orgId] });
      toast.success('Regra removida.');
    },
  });

  const toggleRule = useMutation({
    mutationFn: async ({ id, is_active }: { id: string, is_active: boolean }) => {
      const { error } = await supabase
        .from('inactivity_alerts_config')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inactivity_rules', orgId] });
    },
  });

  return { rules, isLoading, createRule, deleteRule, toggleRule };
}