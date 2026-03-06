import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { eachDayOfInterval, startOfDay, endOfDay, format } from 'date-fns';
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

      const [ { data: allStagesRes }, { data: leadsData }, { data: vendasData } ] = await Promise.all([
        supabase.from('etapas').select('*').order('posicao_ordem'),
        supabase
          .from('leads')
          .select('*')
          .eq('organization_id', orgId)
          .or(`and(criado_em.gte.${startDate},criado_em.lte.${endDate}),and(atualizado_em.gte.${startDate},atualizado_em.lte.${endDate})`),
        supabase.from('vendas').select('*, leads(*)').eq('organization_id', orgId).gte('data_fechamento', format(dateRange.from, 'yyyy-MM-dd')).lte('data_fechamento', format(dateRange.to || dateRange.from, 'yyyy-MM-dd'))
      ]);

      const allStages = allStagesRes || [];
      const leads = leadsData || [];
      const funnelStages = allStages.filter(s => s.incluir_no_funil);
      const lostStage = allStages.find(s => s.nome.toLowerCase() === 'perdido');
      const lostPosition = lostStage?.posicao_ordem || 999;

      const convertedStage = funnelStages[funnelStages.length - 1];
      const convertedPos = convertedStage?.posicao_ordem || 6;

      const isLeadInFunnel = (lead: any) => {
        const leadStage = allStages.find(s => s.posicao_ordem === lead.posicao_pipeline);
        return !!leadStage?.incluir_no_funil;
      };

      const isLeadConvertedInPeriod = (lead: any) => 
        lead.posicao_pipeline >= convertedPos && 
        lead.posicao_pipeline < lostPosition &&
        lead.atualizado_em >= startDate && 
        lead.atualizado_em <= endDate;

      // Funil Dinâmico: Somente etapas padrão
      const funnelData = funnelStages.map((stage, index) => {
        const volume = leads.filter(l => 
          isLeadInFunnel(l) && // Validação de etapa padrão
          l.posicao_pipeline >= stage.posicao_ordem && 
          l.posicao_pipeline < lostPosition
        ).length;
        
        let prevVolume = index > 0 ? leads.filter(l => isLeadInFunnel(l) && l.posicao_pipeline >= funnelStages[index-1].posicao_ordem && l.posicao_pipeline < lostPosition).length : volume;
        const convRate = prevVolume > 0 ? (volume / prevVolume) * 100 : 0;

        return {
          etapa: stage.nome,
          quantidade: volume,
          conversionRate: convRate.toFixed(1),
          dropOffRate: (100 - convRate).toFixed(1),
          fill: stage.cor,
        };
      });

      const totalFaturado = (vendasData || []).reduce((sum, v) => sum + Number(v.valor_fechado), 0);

      return {
        kpis: {
          totalLeads: leads.filter(l => l.criado_em >= startDate && l.criado_em <= endDate).length,
          totalContatos: leads.length,
          conversionRate: leads.length > 0 ? ((leads.filter(isLeadConvertedInPeriod).length / (leads.length || 1)) * 100).toFixed(1) : "0",
          ticketMedio: vendasData && vendasData.length > 0 ? totalFaturado / vendasData.length : 0,
        },
        charts: { 
          leadsCapturedData: daysInInterval.map(d => {
            const dayStr = format(d, 'yyyy-MM-dd');
            return { 
              day: format(d, 'dd/MM'), 
              captados: leads.filter(l => l.criado_em.startsWith(dayStr)).length,
              convertidos: leads.filter(l => 
                isLeadInFunnel(l) &&
                l.posicao_pipeline >= convertedPos && 
                l.posicao_pipeline < lostPosition && 
                l.atualizado_em?.startsWith(dayStr)
              ).length
            };
          }),
          sourceData: Object.entries(leads.reduce((a, l) => { const k = l.fonte || l.origem || 'Outros'; a[k] = (a[k] || 0) + 1; return a; }, {} as any)).map(([source, leads]) => ({ source, leads }))
        },
        funnel: { funnelData, overallConversion: funnelData.length > 0 ? ((funnelData[funnelData.length-1].quantidade / (funnelData[0].quantidade || 1)) * 100).toFixed(1) : "0", detailedSteps: funnelData },
        financial: { totalFaturado, ticketMedio: (vendasData?.length || 0) > 0 ? totalFaturado / (vendasData?.length || 1) : 0, totalVendas: vendasData?.length || 0, faturamentoPorDia: daysInInterval.map(d => ({ day: format(d, 'dd/MM'), valor: (vendasData || []).filter(v => v.data_fechamento === format(d, 'yyyy-MM-dd')).reduce((s, v) => s + Number(v.valor_fechado), 0) })) }
      };
    },
    enabled: !!orgId && !!dateRange?.from,
  });
}