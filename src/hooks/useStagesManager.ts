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

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('etapas_manager_realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'etapas' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['stages'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      // O ID é gerado automaticamente pelo banco de dados (SERIAL)
      const { data, error } = await supabase
        .from('etapas')
        .insert(newStage)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa criada com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao criar etapa: ${err.message}`),
  });

  const updateStage = useMutation({
    mutationFn: async (updatedStage: Pick<Stage, 'id' | 'nome' | 'cor'>) => {
      if (!isAdmin) throw new Error("Apenas administradores podem editar etapas.");
      const { data, error } = await supabase
        .from('etapas')
        .update({ nome: updatedStage.nome, cor: updatedStage.cor })
        .eq('id', updatedStage.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa atualizada com sucesso!");
    },
    onError: (err: any) => toast.error(`Erro ao atualizar etapa: ${err.message}`),
  });

  const deleteStage = useMutation({
    mutationFn: async (id: number) => {
      if (!isAdmin) throw new Error("Apenas administradores podem excluir etapas.");
      const { error } = await supabase.from('etapas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Etapa excluída com sucesso!");
    },
    onError: (err: any) => {
        if (err.code === '23503') { // Foreign key violation
            toast.error("Erro ao excluir: Esta etapa está sendo usada por um ou mais leads. Reatribua os leads antes de excluir.");
        } else {
            toast.error(`Erro ao excluir etapa: ${err.message}`);
        }
    },
  });

  const updateStagesOrder = useMutation({
    mutationFn: async (orderedStages: { id: number; posicao_ordem: number }[]) => {
      if (!isAdmin) throw new Error("Apenas administradores podem reordenar etapas.");
      
      const { error } = await supabase.rpc('update_stages_order', { stages_data: orderedStages });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stages'] });
      toast.success("Ordem das etapas atualizada com sucesso!");
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['stages'] }); // Reverte para o estado do servidor em caso de erro
      toast.error(`Erro ao reordenar etapas: ${err.message}`);
    },
  });

  return {
    stages,
    isLoading,
    createStage,
    updateStage,
    deleteStage,
    updateStagesOrder,
  };
}