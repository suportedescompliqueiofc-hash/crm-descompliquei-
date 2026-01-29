import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';

export interface FunnelStep {
  stageId: number | null;
  stageName: string;
  stageOrder: number;
  color: string;
  count: number; // Volume acumulado
  dropoffCount: number; // Quantos pararam aqui
  conversionToNext: number; // % que foi para a próxima
  conversionFromStart: number; // % do total inicial
  dbOrder?: number; // Para uso interno
}

// Lista ESTRITA de etapas padrão para o funil (Ordem corrigida)
const STANDARD_STAGES = [
  { name: "Novo Lead", color: "#94a3b8", order: 1 },
  { name: "Qualificação", color: "#64748b", order: 2 },
  { name: "Coletando Informações", color: "#a8a29e", order: 3 },
  { name: "Agendamento Solicitado", color: "#C5A47E", order: 4 },
  { name: "Agendado", color: "#4ade80", order: 5 },
  { name: "Procedimento Fechado", color: "#15803d", order: 6 }
];

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

      // 1. Buscar todas as etapas disponíveis no banco
      const { data: dbStages, error: stagesError } = await supabase
        .from('etapas')
        .select('*');

      if (stagesError) throw stagesError;

      // 2. Construir o esqueleto do funil baseado na lista PADRÃO corrigida
      const funnelData: FunnelStep[] = STANDARD_STAGES.map(stdStage => {
        const matchedDbStage = dbStages.find(
          s => s.nome.trim().toLowerCase() === stdStage.name.toLowerCase()
        );

        return {
          stageId: matchedDbStage ? matchedDbStage.id : null,
          stageName: stdStage.name,
          stageOrder: stdStage.order,
          color: matchedDbStage ? matchedDbStage.cor : stdStage.color,
          count: 0,
          dropoffCount: 0,
          conversionToNext: 0,
          conversionFromStart: 0,
          dbOrder: matchedDbStage ? matchedDbStage.posicao_ordem : -1 
        };
      });

      const dbOrderToStandardOrder = new Map<number, number>();
      funnelData.forEach(f => {
        if (f.dbOrder !== -1) {
          dbOrderToStandardOrder.set(f.dbOrder!, f.stageOrder);
        }
      });

      // 3. Buscar histórico de movimentação
      const { data: history, error: historyError } = await supabase
        .from('lead_stage_history')
        .select('lead_id, stage_position')
        .eq('organization_id', orgId)
        .gte('entered_at', startDate)
        .lte('entered_at', endDate);

      if (historyError) throw historyError;

      // 4. Calcular o progresso máximo de cada lead
      const maxStagePerLead = new Map<string, number>();

      history?.forEach(entry => {
        if (dbOrderToStandardOrder.has(entry.stage_position)) {
          const standardOrder = dbOrderToStandardOrder.get(entry.stage_position)!;
          const currentMax = maxStagePerLead.get(entry.lead_id) || 0;
          if (standardOrder > currentMax) {
            maxStagePerLead.set(entry.lead_id, standardOrder);
          }
        }
      });

      // 5. Calcular volumes acumulados
      maxStagePerLead.forEach((maxStandardOrder) => {
        funnelData.forEach(step => {
          if (maxStandardOrder >= step.stageOrder) {
            step.count++;
          }
        });
      });

      // 6. Calcular taxas de conversão e perdas
      const totalLeads = funnelData[0]?.count || 0;

      for (let i = 0; i < funnelData.length; i++) {
        const current = funnelData[i];
        const next = funnelData[i + 1];

        current.conversionFromStart = totalLeads > 0 
          ? (current.count / totalLeads) * 100 
          : 0;

        if (next) {
          current.conversionToNext = current.count > 0 
            ? (next.count / current.count) * 100 
            : 0;
          current.dropoffCount = current.count - next.count;
        } else {
          current.conversionToNext = 0;
          current.dropoffCount = 0;
        }
      }

      return funnelData;
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });
}