import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { Stage } from './useStages';
import { useEffect } from 'react';

export function useStagesManager() {
  useProfile();
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('etapas_manager_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'etapas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['stages'] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: stages = [], isLoading } = useQuery<Stage[]>({
    queryKey: ['stages'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('etapas')
        .select('*')
        .order('posicao_ordem', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const createStage = useMutation({
    mutationFn: async (newStage: Omit<Stage, 'id' | 'criado_em'>) => {
      const { data: profile } = await supabase.from('perfis').select('organization_id').single();
      const { data, error } = await supabase.from('etapas').insert({ ...newStage, organization_id: profile?.organization_id } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa criada com sucesso!");
    }
  });

  const updateStage = useMutation({
    mutationFn: async (updatedStage: Partial<Stage> & { id: number }) => {
      const { data, error } = await supabase
        .from('etapas')
        .update(updatedStage as any)
        .eq('id', updatedStage.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa atualizada!");
    }
  });

  const toggleFunnelStage = useMutation({
    mutationFn: async ({ id, incluir }: { id: number, incluir: boolean }) => {
      const { error } = await supabase.from('etapas').update({ em_funil: incluir } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Definição de funil atualizada.");
    }
  });

  const deleteStage = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('etapas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa excluída.");
    }
  });

  const updateStagesOrder = useMutation({
    mutationFn: async (orderedStages: { id: number; posicao_ordem: number }[]) => {
      const { error } = await supabase.rpc('update_stages_order', { stages_data: orderedStages as any });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages'] })
  });

  return { stages, isLoading, createStage, updateStage, deleteStage, updateStagesOrder, toggleFunnelStage: toggleFunnelStage.mutate };
}