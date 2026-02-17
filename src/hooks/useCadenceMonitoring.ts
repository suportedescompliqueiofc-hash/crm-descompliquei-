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
  passo_atual_ordem: number;
  status: string;
  proxima_execucao: string | null;
  ultima_execucao: string | null;
  status_ultima_execucao: 'sucesso' | 'erro' | null;
  erro_log: string | null;
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
    queryKey: ['cadence_monitoring', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      let query = supabase
        .from('lead_cadencias')
        .select(`
          *,
          leads (nome, telefone),
          cadencias (nome)
        `)
        .eq('organization_id', orgId)
        .order('ultima_execucao', { ascending: false });

      if (dateRange?.from) {
        query = query.gte('ultima_execucao', format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss'));
      }
      if (dateRange?.to) {
        query = query.lte('ultima_execucao', format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss'));
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as CadenceLog[];
    },
    enabled: !!user && !!orgId,
  });

  const stopLeadCadence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lead_cadencias')
        .update({ status: 'cancelado', proxima_execucao: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cadence_monitoring'] });
      toast.success('Fluxo interrompido para este cliente.');
    }
  });

  return {
    logs,
    isLoading,
    stopCadence: stopLeadCadence.mutate
  };
}