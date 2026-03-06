import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { differenceInDays, eachDayOfInterval, startOfDay, endOfDay, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

export function useReports(dateRange: DateRange | undefined, filters: any) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useQuery({
    queryKey: ['reports', orgId, dateRange, filters],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from) return null;
      
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to ? endOfDay(dateRange.to).toISOString() : endOfDay(dateRange.from).toISOString();
      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to || dateRange.from });

      // 1. Buscar Etapas e Leads
      const [ { data: allStages }, { data: leadsData }, { data: vendasData } ] = await Promise.all([
        supabase.from('etapas').select('*').order('posicao_ordem'),
        supabase.from('leads').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate),
        supabase.from('vendas').select('*, leads(*)').eq('organization_id', orgId).gte('data_fechamento', format(dateRange.from, 'yyyy-MM-dd')).lte('data_fechamento', format(dateRange.to || dateRange.from, 'yyyy-MM-dd'))
      ]);

      const stages = allStages || [];
      const leads = leadsData || [];
      const funnelStages = stages.filter(s => s.incluir_no_funil);
      const lostStage = stages.find(s => s.nome.toLowerCase() === 'perdido');
      const lostPosition = lostStage?.posicao_ordem || 999;

      // Referência de Conversão: Última etapa marcada como funil
      const convertedStage = funnelStages[funnelStages.length - 1];
      const convertedPos = convertedStage?.posicao_ordem || 6;

      const isLeadConverted = (lead: any) => lead.posicao_pipeline >= convertedPos && lead.posicao_pipeline < lostPosition;

      // 2. Funil Dinâmico
      const funnelData = funnelStages.map((stage, index) => {
        const volume = leads.filter(l => l.posicao_pipeline >= stage.posicao_ordem && l.posicao_pipeline < lostPosition).length;
        let prevVolume = index > 0 ? leads.filter(l => l.posicao_pipeline >= funnelStages[index-1].posicao_ordem && l.posicao_pipeline < lostPosition).length : volume;
        const convRate = prevVolume > 0 ? (volume / prevVolume) * 100 : 0;

        return {
          etapa: stage.nome,
          quantidade: volume,
          conversionRate: convRate.toFixed(1),
          dropOffRate: (100 - convRate).toFixed(1),
          fill: stage.cor,
        };
      });

      // 3. KPIs
      const convertedLeads = leads.filter(isLeadConverted);
      const totalFaturado = (vendasData || []).reduce((sum, v) => sum + Number(v.valor_fechado), 0);

      return {
        kpis: {
          totalLeads: leads.length,
          totalContatos: leads.length,
          conversionRate: leads.length > 0 ? ((convertedLeads.length / leads.length) * 100).toFixed(1) : "0",
          ticketMedio: vendasData && vendasData.length > 0 ? totalFaturado / vendasData.length : 0,
        },
        charts: { 
          leadsCapturedData: daysInInterval.map(d => ({ 
            day: format(d, 'dd/MM'), 
            captados: leads.filter(l => l.criado_em.startsWith(format(d, 'yyyy-MM-dd'))).length,
            convertidos: leads.filter(l => isLeadConverted(l) && l.atualizado_em?.startsWith(format(d, 'yyyy-MM-dd'))).length
          })),
          sourceData: Object.entries(leads.reduce((a, l) => { const k = l.fonte || l.origem || 'Outros'; a[k] = (a[k] || 0) + 1; return a; }, {} as any)).map(([source, leads]) => ({ source, leads }))
        },
        funnel: { funnelData, overallConversion: funnelData.length > 0 ? ((funnelData[funnelData.length-1].quantidade / (funnelData[0].quantidade || 1)) * 100).toFixed(1) : "0", detailedSteps: funnelData },
        financial: { totalFaturado, ticketMedio: (vendasData?.length || 0) > 0 ? totalFaturado / (vendasData?.length || 1) : 0, totalVendas: vendasData?.length || 0, faturamentoPorDia: daysInInterval.map(d => ({ day: format(d, 'dd/MM'), valor: (vendasData || []).filter(v => v.data_fechamento === format(d, 'yyyy-MM-dd')).reduce((s, v) => s + Number(v.valor_fechado), 0) })) }
      };
    },
    enabled: !!orgId && !!dateRange?.from,
  });
}