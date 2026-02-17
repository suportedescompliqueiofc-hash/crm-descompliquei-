import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';

export interface CadenceLog {
  id: string;
  lead_id: string;
  cadencia_id: string;
  passo_ordem: number;
  status: 'sucesso' | 'erro';
  mensagem_erro: string | null;
  enviado_em: string;
  // Dados do Join
  leads: {
    nome: string | null;
    telefone: string;
  } | null;
  cadencias: {
    nome: string;
  } | null;
}

export function useCadenceMonitoring(dateRange?: DateRange) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['cadence_monitoring_history', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      // Consultando a tabela de LOGS HISTÓRICOS
      // Usamos a sintaxe !nome_da_tabela para garantir que o Supabase encontre a FK correta
      let query = supabase
        .from('cadencia_logs')
        .select(`
          id,
          lead_id,
          cadencia_id,
          passo_ordem,
          status,
          mensagem_erro,
          enviado_em,
          leads (nome, telefone),
          cadencias (nome)
        `)
        .eq('organization_id', orgId)
        .order('enviado_em', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('enviado_em', startOfDay(dateRange.from).toISOString());
      }
      if (dateRange?.to) {
        query = query.lte('enviado_em', endOfDay(dateRange.to).toISOString());
      }

      const { data, error } = await query;
      
      if (error) {
        console.error("[useCadenceMonitoring] Erro na busca:", error);
        throw error;
      }
      
      return data as unknown as CadenceLog[];
    },
    enabled: !!user && !!orgId,
    staleTime: 1000 * 30,
  });

  // Função para parar uma cadência ativa (continua operando na tabela principal)
  const stopLeadCadence = useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('lead_cadencias')
        .update({ status: 'cancelado', proxima_execucao: null })
        .eq('lead_id', leadId)
        .eq('status', 'ativo');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadence_monitoring_history'] });
      toast.success('Fluxo interrompido para este cliente.');
    }
  });

  return {
    logs,
    isLoading,
    stopCadence: stopLeadCadence.mutate
  };
}