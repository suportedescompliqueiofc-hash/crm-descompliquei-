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

// Lista ESTRITA de etapas padrão para o funil
const STANDARD_STAGES = [
  { name: "Novo Lead", color: "#94a3b8", order: 1 },
  { name: "Qualificação", color: "#64748b", order: 2 },
  { name: "Agendamento Solicitado", color: "#C5A47E", order: 3 }, // Gold Brand
  { name: "Coletando Informações", color: "#a8a29e", order: 4 },
  { name: "Agendado", color: "#4ade80", order: 5 }, // Green
  { name: "Procedimento Fechado", color: "#15803d", order: 6 } // Dark Green
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

      // 2. Construir o esqueleto do funil baseado na lista PADRÃO
      // Isso garante que as 6 etapas sempre apareçam, mesmo que não existam no banco
      const funnelData: FunnelStep[] = STANDARD_STAGES.map(stdStage => {
        // Tenta encontrar a etapa correspondente no banco (comparação flexível)
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
          // Armazena a ordem real no banco para filtrar o histórico
          dbOrder: matchedDbStage ? matchedDbStage.posicao_ordem : -1 
        };
      });

      // Cria um mapa para saber quais ordens do banco correspondem a qual ordem do funil padrão
      // Ex: No banco "Novo Lead" pode ser ordem 10, mas aqui mapeamos para ordem 1
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

      // 4. Calcular o progresso máximo de cada lead no Funil Padrão
      const maxStagePerLead = new Map<string, number>();

      history?.forEach(entry => {
        // Verifica se a etapa do histórico faz parte do nosso funil padrão
        if (dbOrderToStandardOrder.has(entry.stage_position)) {
          const standardOrder = dbOrderToStandardOrder.get(entry.stage_position)!;
          
          const currentMax = maxStagePerLead.get(entry.lead_id) || 0;
          // Se o lead avançou mais no funil padrão, atualizamos
          if (standardOrder > currentMax) {
            maxStagePerLead.set(entry.lead_id, standardOrder);
          }
        }
      });

      // 5. Calcular volumes acumulados (Lógica de Funil)
      // Se um lead chegou na etapa 5, ele conta para 1, 2, 3, 4 e 5.
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

        // Conversão em relação ao topo
        current.conversionFromStart = totalLeads > 0 
          ? (current.count / totalLeads) * 100 
          : 0;

        // Conversão para a próxima etapa (Pass-through)
        if (next) {
          current.conversionToNext = current.count > 0 
            ? (next.count / current.count) * 100 
            : 0;
          
          // Dropoff: Quem estava aqui mas não foi para a próxima
          current.dropoffCount = current.count - next.count;
        } else {
          // Última etapa
          current.conversionToNext = 0;
          current.dropoffCount = 0;
        }
      }

      return funnelData;
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });
}