import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';
import { useAuth } from '@/contexts/AuthContext';

export interface DispatchReport {
  id: string;
  cadencia_id: string;
  cadencia_nome: string;
  total_leads: number;
  criado_em: string;
  leads_ativos: number;
  leads_concluidos: number;
  leads_pausados: number;
  leads_cancelados: number;
  taxa_resposta: number;
  taxa_conclusao: number;
  taxa_andamento: number;
}

export function useCadenceDispatches() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery<DispatchReport[]>({
    queryKey: ['cadence_dispatches', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];

      const { data, error } = await supabase
        .from('cadence_dispatches' as any)
        .select(`
          id, cadencia_id, total_leads, criado_em,
          cadencias(nome),
          lead_cadencias(status)
        `)
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      return ((data as any[]) || []).map((d: any) => {
        const leads: { status: string }[] = d.lead_cadencias || [];
        const ativos    = leads.filter(l => l.status === 'ativo').length;
        const concluidos = leads.filter(l => l.status === 'concluido').length;
        const pausados   = leads.filter(l => l.status === 'pausado').length;
        const cancelados = leads.filter(l => l.status === 'cancelado').length;
        const total = d.total_leads || leads.length || 1;

        return {
          id: d.id,
          cadencia_id: d.cadencia_id,
          cadencia_nome: d.cadencias?.nome || 'Cadência',
          total_leads: d.total_leads || leads.length,
          criado_em: d.criado_em,
          leads_ativos: ativos,
          leads_concluidos: concluidos,
          leads_pausados: pausados,
          leads_cancelados: cancelados,
          taxa_resposta:   Math.round((pausados   / total) * 100),
          taxa_conclusao:  Math.round((concluidos / total) * 100),
          taxa_andamento:  Math.round((ativos     / total) * 100),
        } as DispatchReport;
      });
    },
    enabled: !!user && !!orgId,
    staleTime: 60_000,
  });
}
