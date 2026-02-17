import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface CadenceStep {
  id?: string;
  posicao_ordem: number;
  tempo_espera: number;
  unidade_tempo: 'minutos' | 'horas' | 'dias';
  tipo_mensagem: 'texto' | 'audio' | 'imagem' | 'video' | 'pdf';
  conteudo: string | null;
  arquivo_path: string | null;
  temp_file?: File | null; // Apenas para UI durante criação
}

export interface Cadence {
  id: string;
  nome: string;
  descricao: string | null;
  passos?: CadenceStep[];
  criado_em: string;
}

export function useCadences() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: cadences = [], isLoading } = useQuery({
    queryKey: ['cadences', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      const { data, error } = await supabase
        .from('cadencias')
        .select(`
          *,
          passos:cadencia_passos(*)
        `)
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // Ordena os passos de cada cadência
      return data.map(c => ({
        ...c,
        passos: (c.passos || []).sort((a: any, b: any) => a.posicao_ordem - b.posicao_ordem)
      })) as Cadence[];
    },
    enabled: !!user && !!orgId,
  });

  const createCadence = useMutation({
    mutationFn: async ({ nome, descricao, passos }: { nome: string; descricao: string; passos: CadenceStep[] }) => {
      if (!user || !orgId) {
        throw new Error("Sua sessão ou organização não foi identificada. Tente recarregar a página.");
      }

      // 1. Criar a cadência pai
      const { data: cadence, error: cadenceError } = await supabase
        .from('cadencias')
        .insert({ 
          nome, 
          descricao, 
          organization_id: orgId 
        })
        .select()
        .single();

      if (cadenceError) throw cadenceError;

      // 2. Processar passos e uploads
      const stepsToInsert = await Promise.all(passos.map(async (step) => {
        let arquivo_path = step.arquivo_path;

        if (step.temp_file) {
          const fileExt = step.temp_file.name.split('.').pop();
          const fileName = `${Date.now()}_${step.posicao_ordem}.${fileExt}`;
          const filePath = `${orgId}/cadences/${cadence.id}/${fileName}`;

          const { error: uploadError } = await supabase.storage
            .from('media-mensagens')
            .upload(filePath, step.temp_file);

          if (uploadError) throw uploadError;
          arquivo_path = filePath;
        }

        return {
          cadencia_id: cadence.id,
          posicao_ordem: step.posicao_ordem,
          tempo_espera: step.tempo_espera,
          unidade_tempo: step.unidade_tempo,
          tipo_mensagem: step.tipo_mensagem,
          conteudo: step.conteudo,
          arquivo_path
        };
      }));

      // 3. Inserir passos
      if (stepsToInsert.length > 0) {
        const { error: stepsError } = await supabase
          .from('cadencia_passos')
          .insert(stepsToInsert);

        if (stepsError) throw stepsError;
      }
      
      return cadence;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadences', orgId] });
      toast.success('Fluxo de cadência criado com sucesso!');
    },
    onError: (err: any) => {
      console.error("Erro na criação da cadência:", err);
      toast.error(err.message || "Erro ao salvar o fluxo no servidor.");
    },
  });

  const deleteCadence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cadencias').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadences', orgId] });
      toast.success('Cadência excluída com sucesso.');
    }
  });

  return { 
    cadences, 
    isLoading, 
    createCadence: createCadence.mutate, 
    isCreating: createCadence.isPending, 
    deleteCadence: deleteCadence.mutate 
  };
}