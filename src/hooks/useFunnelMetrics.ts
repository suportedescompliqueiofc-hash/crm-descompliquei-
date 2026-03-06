import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';

export interface FunnelStep {
  stageId: number | null;
  stageName: string;
  stageOrder: number;
  color: string;
  count: number;
  dropoffCount: number;
  conversionToNext: number;
  conversionFromStart: number;
}

export function useFunnelMetrics(dateRange: DateRange | undefined, origin: 'marketing' | 'organico' = 'marketing') {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['funnel-metrics', orgId, dateRange, origin],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from) return [];

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(dateRange.from).toISOString();

      // 1. Buscar etapas marcadas para o Funil
      const { data: allStages, error: stagesError } = await supabase
        .from('etapas')
        .select('*')
        .order('posicao_ordem', { ascending: true });

      if (stagesError) throw stagesError;

      const funnelStages = allStages.filter(s => s.incluir_no_funil === true);
      const lostStage = allStages.find(s => s.nome.toLowerCase() === 'perdido');
      const lostPosition = lostStage?.posicao_ordem || 999;

      // 2. Buscar leads ativos no período (criados ou atualizados)
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('posicao_pipeline, atualizado_em, criado_em')
        .eq('organization_id', orgId)
        .eq('origem', origin) 
        .or(`and(criado_em.gte.${startDate},criado_em.lte.${endDate}),and(atualizado_em.gte.${startDate},atualizado_em.lte.${endDate})`);

      if (leadsError) throw leadsError;

      // 3. Construir o Funil
      const funnelData: FunnelStep[] = funnelStages.map((stage) => {
        const count = (leads || []).filter(l => 
          l.posicao_pipeline >= stage.posicao_ordem && 
          l.posicao_pipeline < lostPosition
        ).length;

        return {
          stageId: stage.id,
          stageName: stage.nome,
          stageOrder: stage.posicao_ordem,
          color: stage.cor,
          count: count,
          dropoffCount: 0,
          conversionToNext: 0,
          conversionFromStart: 0
        };
      });

      // 4. Calcular Taxas
      const totalLeads = funnelData[0]?.count || 0;

      for (let i = 0; i < funnelData.length; i++) {
        const current = funnelData[i];
        const next = funnelData[i + 1];

        current.conversionFromStart = totalLeads > 0 ? (current.count / totalLeads) * 100 : 0;

        if (next) {
          current.conversionToNext = current.count > 0 ? (next.count / current.count) * 100 : 0;
          current.dropoffCount = current.count - next.count;
        }
      }

      return funnelData;
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });
}