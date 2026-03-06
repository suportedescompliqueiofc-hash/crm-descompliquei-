import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { Stage } from './useStages';
import { useEffect } from 'react';

export function useStagesManager() {
  const { role } = useProfile();
  const queryClient = useQueryClient();
  const isAdmin = role === 'admin';

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
      if (!isAdmin) throw new Error("Apenas administradores podem criar etapas.");
      const { data, error } = await supabase.from('etapas').insert(newStage).select().single();
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
      if (!isAdmin) throw new Error("Apenas administradores podem editar etapas.");
      const { data, error } = await supabase
        .from('etapas')
        .update(updatedStage)
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
      if (!isAdmin) throw new Error("Ação não permitida.");
      const { error } = await supabase.from('etapas').update({ incluir_no_funil: incluir }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Definição de funil atualizada.");
    }
  });

  const deleteStage = useMutation({
    mutationFn: async (id: number) => {
      if (!isAdmin) throw new Error("Não autorizado.");
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
      const { error } = await supabase.rpc('update_stages_order', { stages_data: orderedStages });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stages'] })
  });

  return { stages, isLoading, createStage, updateStage, deleteStage, updateStagesOrder, toggleFunnelStage: toggleFunnelStage.mutate };
}