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

  const savePrompt = useMutation({
    mutationFn: async (newPrompt: string) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");
      
      const timestamp = new Date().toISOString();

      if (!promptData) {
        // Create if not exists
        const { data, error } = await supabase
          .from('organization_ai_prompts')
          .insert([{ 
            prompt: newPrompt, 
            organization_id: orgId,
            updated_at: timestamp
          }])
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        // Update existing
        const { data, error } = await supabase
          .from('organization_ai_prompts')
          .update({ 
            prompt: newPrompt,
            updated_at: timestamp
          })
          .eq('id', promptData.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai_prompt', orgId] });
      toast.success('Prompt da IA salvo com sucesso!', { closeButton: true });
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao salvar prompt', { closeButton: true });
    },
  });

  return { 
    prompt: promptData?.prompt || '', 
    lastUpdated: promptData?.updated_at,
    isLoading, 
    savePrompt: savePrompt.mutate,
    isSaving: savePrompt.isPending
  };
}