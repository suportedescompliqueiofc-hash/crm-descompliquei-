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

// Lista ESTRITA de etapas padrão para o funil
const SALES_FUNNEL_STAGES = [
  { name: "Novo Lead", color: "#94a3b8", order: 1 },
  { name: "Qualificação", color: "#64748b", order: 2 },
  { name: "Coletando Informações", color: "#a8a29e", order: 3 },
  { name: "Agendamento Solicitado", color: "#C5A47E", order: 4 },
  { name: "Reunião Agendada", color: "#4ade80", order: 5 },
  { name: "Contrato Fechado", color: "#15803d", order: 6 }
];

export function useFunnelMetrics(dateRange: DateRange | undefined, origin: 'marketing' | 'organico' = 'marketing') {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['funnel-metrics', orgId, dateRange, origin], // Adicionado origin à chave para refetch automático
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from) return [];

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to 
        ? endOfDay(dateRange.to).toISOString() 
        : endOfDay(dateRange.from).toISOString();

      // 1. Buscar leads criados no período
      // FILTRO APLICADO: origem dinâmica baseada no parâmetro
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('posicao_pipeline')
        .eq('organization_id', orgId)
        .eq('origem', origin) 
        .gte('criado_em', startDate)
        .lte('criado_em', endDate);

      if (leadsError) throw leadsError;

      // 2. Buscar etapas para mapear nomes e posições reais
      const { data: allStages, error: stagesError } = await supabase
        .from('etapas')
        .select('*');

      if (stagesError) throw stagesError;

      // Identifica a posição da etapa "Perdido" para excluí-la da contagem acumulada
      const lostStage = allStages.find(s => s.nome.toLowerCase() === 'perdido');
      const lostPosition = lostStage?.posicao_ordem || 999;

      // 3. Construir o Funil com as 6 etapas fixas
      const funnelData: FunnelStep[] = SALES_FUNNEL_STAGES.map((stdStage) => {
        // Encontra a etapa correspondente no banco pelo nome
        const dbStage = allStages.find(s => s.nome.toLowerCase() === stdStage.name.toLowerCase());
        
        // Define a posição real (se existir no banco) ou usa a ordem padrão
        const position = dbStage ? dbStage.posicao_ordem : stdStage.order;
        const color = dbStage ? dbStage.cor : stdStage.color;

        // Cálculo de Volume Acumulado (considerando apenas leads da origem selecionada)
        const count = leads.filter(l => 
          l.posicao_pipeline >= position && l.posicao_pipeline < lostPosition
        ).length;

        return {
          stageId: dbStage?.id || null,
          stageName: stdStage.name,
          stageOrder: stdStage.order,
          color: color,
          count: count,
          dropoffCount: 0,
          conversionToNext: 0,
          conversionFromStart: 0
        };
      });

      // 4. Calcular Taxas de Conversão e Perda
      const totalLeads = funnelData[0]?.count || 0;

      for (let i = 0; i < funnelData.length; i++) {
        const current = funnelData[i];
        const next = funnelData[i + 1];

        // Conversão Geral (do início até esta etapa)
        current.conversionFromStart = totalLeads > 0 
          ? (current.count / totalLeads) * 100 
          : 0;

        if (next) {
          // Conversão para a próxima etapa
          current.conversionToNext = current.count > 0 
            ? (next.count / current.count) * 100 
            : 0;
          
          // Dropoff (quantos pararam nesta etapa)
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