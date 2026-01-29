import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface FunnelStep {
  stageId: number;
  stageName: string;
  stageOrder: number;
  color: string;
  count: number; // Volume acumulado
  dropoffCount: number; // Quantos pararam aqui
  conversionToNext: number; // % que foi para a próxima
  conversionFromStart: number; // % do total inicial
}

export function useFunnelMetrics(dateRange: DateRange | undefined) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['funnel-metrics', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from) return [];

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to 
        ? endOfDay(dateRange.to).toISOString() 
        : endOfDay(dateRange.from).toISOString();

      // 1. Buscar todas as etapas ordenadas
      const { data: stages, error: stagesError } = await supabase
        .from('etapas')
        .select('*')
        .order('posicao_ordem', { ascending: true });

      if (stagesError) throw stagesError;

      // 2. Buscar histórico de movimentação no período
      // Precisamos saber até onde cada lead chegou
      const { data: history, error: historyError } = await supabase
        .from('lead_stage_history')
        .select('lead_id, stage_position')
        .eq('organization_id', orgId)
        .gte('entered_at', startDate)
        .lte('entered_at', endDate);

      if (historyError) throw historyError;

      // 3. Processamento Lógico (Funil Acumulado)
      
      // Agrupar por Lead para descobrir a etapa MÁXIMA atingida por cada um
      const maxStagePerLead = new Map<string, number>();

      history?.forEach(entry => {
        const currentMax = maxStagePerLead.get(entry.lead_id) || 0;
        if (entry.stage_position > currentMax) {
          maxStagePerLead.set(entry.lead_id, entry.stage_position);
        }
      });

      // Inicializar contadores do funil
      const funnelData: FunnelStep[] = stages.map(stage => ({
        stageId: stage.id,
        stageName: stage.nome,
        stageOrder: stage.posicao_ordem,
        color: stage.cor,
        count: 0,
        dropoffCount: 0,
        conversionToNext: 0,
        conversionFromStart: 0
      }));

      // Calcular volumes acumulados
      // Se o lead chegou na etapa 4, ele conta para 1, 2, 3 e 4.
      maxStagePerLead.forEach((maxStageOrder) => {
        funnelData.forEach(step => {
          if (maxStageOrder >= step.stageOrder) {
            step.count++;
          }
        });
      });

      // Calcular taxas de conversão
      const totalLeads = funnelData[0]?.count || 0;

      for (let i = 0; i < funnelData.length; i++) {
        const current = funnelData[i];
        const next = funnelData[i + 1];

        // Conversão Geral (Benchmark)
        current.conversionFromStart = totalLeads > 0 
          ? (current.count / totalLeads) * 100 
          : 0;

        // Conversão de Passagem (Pass-through) & Dropoff
        if (next) {
          current.conversionToNext = current.count > 0 
            ? (next.count / current.count) * 100 
            : 0;
          
          // Dropoff: Quem chegou aqui mas não foi para a próxima
          // Nota: Isso é uma simplificação, pois dropoff real depende se o lead está "parado" ou "perdido"
          // Mas num funil de fluxo, consideramos dropoff quem não avançou
          current.dropoffCount = current.count - next.count;
        } else {
          // Última etapa (geralmente fechamento)
          current.conversionToNext = 0; // Não tem próxima
          current.dropoffCount = 0;
        }
      }

      return funnelData;
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });
}