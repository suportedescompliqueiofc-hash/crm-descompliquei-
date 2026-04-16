import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { Stage, STAGES_QUERY_KEY } from './useStages';
import { useEffect } from 'react';

export function useStagesManager() {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('etapas_manager_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'etapas' }, () => {
        queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const { data: stages = [], isLoading } = useQuery<Stage[]>({
    queryKey: STAGES_QUERY_KEY,
    queryFn: async () => {
      let query = supabase
        .from('etapas')
        .select('*');

      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query.order('posicao_ordem', { ascending: true });
      if (error) throw error;
      return data;
    },
    staleTime: 0, // Sempre busca dados frescos
  });

  const createStage = useMutation({
    mutationFn: async (newStage: Omit<Stage, 'id' | 'criado_em'>) => {
      const { data, error } = await supabase.from('etapas').insert({ ...newStage, organization_id: orgId } as any).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });
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
      queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });
      toast.success("Etapa atualizada!");
    }
  });

  const toggleFunnelStage = useMutation({
    mutationFn: async ({ id, incluir }: { id: number, incluir: boolean }) => {
      const { error } = await supabase.from('etapas').update({ em_funil: incluir } as any).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });
      toast.success("Definição de funil atualizada.");
    }
  });

  const deleteStage = useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('etapas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY });
      toast.success("Etapa excluída.");
    }
  });

  const updateStagesOrder = useMutation({
    mutationFn: async (orderedStages: { id: number; posicao_ordem: number }[]) => {
      const { error } = await supabase.rpc('update_stages_order', { stages_data: orderedStages as any });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: STAGES_QUERY_KEY })
  });

  return { stages, isLoading, createStage, updateStage, deleteStage, updateStagesOrder, toggleFunnelStage: toggleFunnelStage.mutate };
}