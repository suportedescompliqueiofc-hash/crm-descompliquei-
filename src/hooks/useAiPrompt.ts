import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export function useAiPrompt() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: promptData, isLoading } = useQuery({
    queryKey: ['ai_prompt', orgId],
    queryFn: async () => {
      if (!user || !orgId) return null;
      const { data, error } = await supabase
        .from('organization_ai_prompts')
        .select('*')
        .eq('organization_id', orgId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!orgId,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ prompt: newPrompt, promptCrm, iaAtiva, acumulo_mensagens }: { prompt: string; promptCrm?: string; iaAtiva?: boolean; acumulo_mensagens?: number }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");
      const timestamp = new Date().toISOString();
      const payload: Record<string, unknown> = {
        prompt: newPrompt,
        updated_at: timestamp,
        ia_ativa: iaAtiva ?? true,
      };

      if (promptCrm !== undefined) {
        payload.prompt_crm = promptCrm;
      }
      if (acumulo_mensagens !== undefined) {
        payload.acumulo_mensagens = acumulo_mensagens;
      }
      
      let resultData;
      if (!promptData) {
        // Defaults fallbacks if new
        payload.modelo_ia = 'grok-3-fast';
        payload.delay_entre_mensagens = 2000;
        if (payload.acumulo_mensagens === undefined) payload.acumulo_mensagens = 45;

        const { data, error } = await supabase
          .from('organization_ai_prompts')
          .insert([{ ...payload, organization_id: orgId }])
          .select()
          .single();
        if (error) throw error;
        resultData = data;
      } else {
        const { data, error } = await supabase
          .from('organization_ai_prompts')
          .update(payload)
          .eq('id', promptData.id)
          .select()
          .single();
        if (error) throw error;
        resultData = data;
      }
      return resultData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_prompt', orgId] });
      toast.success('Configurações de IA salvas com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar configurações', { closeButton: true });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async (ativa: boolean) => {
      if (!orgId) throw new Error("Organização não encontrada");
      if (!promptData) throw new Error("Configure e salve o prompt antes de ativar a IA");
      const { error } = await supabase
        .from('organization_ai_prompts')
        .update({ ia_ativa: ativa, updated_at: new Date().toISOString() })
        .eq('id', promptData.id);
      if (error) throw error;
    },
    onSuccess: (_, ativa) => {
      queryClient.invalidateQueries({ queryKey: ['ai_prompt', orgId] });
      toast.success(ativa ? '🤖 IA ativada com sucesso!' : '⏸️ IA pausada.', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao alterar status da IA', { closeButton: true });
    },
  });

  return {
    prompt: promptData?.prompt || '',
    promptCrm: promptData?.prompt_crm || '',
    iaAtiva: promptData?.ia_ativa ?? false,
    acumuloMensagens: promptData?.acumulo_mensagens ?? 45,
    lastUpdated: promptData?.updated_at,
    isLoading,
    savePrompt: (prompt: string, promptCrm?: string, acumulo_mensagens?: number, callbacks?: { onSuccess?: () => void }) => {
      saveMutation.mutate({ prompt, promptCrm, iaAtiva: true, acumulo_mensagens }, { onSuccess: callbacks?.onSuccess });
    },
    toggleIa: toggleMutation.mutate,
    isTogglingIa: toggleMutation.isPending,
    isSaving: saveMutation.isPending,
  };
}