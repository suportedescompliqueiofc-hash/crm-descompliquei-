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

// Lista estrita de etapas para análise do funil
const TARGET_STAGE_NAMES = [
  "Novo Lead",
  "Qualificação",
  "Agendamento Solicitado",
  "Coletando Informações",
  "Agendado",
  "Procedimento Fechado"
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
      const { data: allStages, error: stagesError } = await supabase
        .from('etapas')
        .select('*')
        .order('posicao_ordem', { ascending: true });

      if (stagesError) throw stagesError;

      // 2. Filtrar e Ordenar apenas as etapas alvo
      // Isso remove etapas como "Lead Desqualificado" da visualização
      const funnelStages = allStages
        .filter(stage => TARGET_STAGE_NAMES.includes(stage.nome))
        .sort((a, b) => {
          return TARGET_STAGE_NAMES.indexOf(a.nome) - TARGET_STAGE_NAMES.indexOf(b.nome);
        });

      // Cria um Set com os IDs de ordem das etapas válidas para filtragem rápida do histórico
      const validStageOrders = new Set(funnelStages.map(s => s.posicao_ordem));

      // 3. Buscar histórico de movimentação no período
      const { data: history, error: historyError } = await supabase
        .from('lead_stage_history')
        .select('lead_id, stage_position')
        .eq('organization_id', orgId)
        .gte('entered_at', startDate)
        .lte('entered_at', endDate);

      if (historyError) throw historyError;

      // 4. Processamento Lógico (Funil Acumulado)
      
      // Agrupar por Lead para descobrir a etapa MÁXIMA atingida por cada um
      // APENAS considerando as etapas do funil padrão.
      // Se um lead foi de "Novo Lead" -> "Lead Desqualificado", para o funil ele parou em "Novo Lead".
      const maxStagePerLead = new Map<string, number>();

      history?.forEach(entry => {
        // Ignora histórico de etapas que não estão no nosso funil alvo (ex: Desqualificado)
        if (validStageOrders.has(entry.stage_position)) {
          const currentMax = maxStagePerLead.get(entry.lead_id) || 0;
          // Assume-se que posicao_ordem maior = avanço no funil
          if (entry.stage_position > currentMax) {
            maxStagePerLead.set(entry.lead_id, entry.stage_position);
          }
        }
      });

      // Inicializar estrutura de dados do funil
      const funnelData: FunnelStep[] = funnelStages.map(stage => ({
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
      // Lógica: Se o lead chegou na etapa X, ele conta para todas as etapas anteriores a X.
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

        // Conversão Geral (Benchmark em relação ao topo)
        current.conversionFromStart = totalLeads > 0 
          ? (current.count / totalLeads) * 100 
          : 0;

        // Conversão de Passagem (Pass-through) para a próxima etapa
        if (next) {
          current.conversionToNext = current.count > 0 
            ? (next.count / current.count) * 100 
            : 0;
          
          // Dropoff: Quantos pararam EXATAMENTE nesta etapa do funil
          current.dropoffCount = current.count - next.count;
        } else {
          // Última etapa (Procedimento Fechado)
          current.conversionToNext = 0;
          current.dropoffCount = 0;
        }
      }

      return funnelData;
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });
}