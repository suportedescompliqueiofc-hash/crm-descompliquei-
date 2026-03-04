import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, eachDayOfInterval, parseISO, endOfDay, isAfter, isBefore } from 'date-fns';
import { useEffect } from 'react';

// Constantes de conversão para manter paridade com useReports e useFunnelMetrics
const CONVERTED_STAGE_NAME = "Contrato Fechado";
const ALTERNATIVE_CONVERTED_STAGE_NAME = "Procedimento Fechado";
const LOST_STAGE_NAME = "Perdido";

export function useDashboard(dateRange: DateRange | undefined) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_expenses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criativos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from || !dateRange?.to) return null;

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();
      const startDayStr = format(startOfDay(dateRange.from), 'yyyy-MM-dd');
      const endDayStr = format(endOfDay(dateRange.to), 'yyyy-MM-dd');

      const [
        { data: leadsData },
        { data: stagesData },
        { data: activitiesData },
        { data: vendasData },
        { data: expensesData },
        { data: criativosData }
      ] = await Promise.all([
        supabase.from('leads').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate),
        supabase.from('etapas').select('id, nome, posicao_ordem'),
        supabase.from('atividades').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate).limit(10),
        supabase.from('vendas').select('valor_fechado, data_fechamento').eq('organization_id', orgId).gte('data_fechamento', startDayStr).lte('data_fechamento', endDayStr),
        supabase.from('marketing_expenses').select('amount').eq('organization_id', orgId).gte('expense_date', startDayStr).lte('expense_date', endDayStr),
        supabase.from('criativos').select('platform_metrics').eq('organization_id', orgId)
      ]);

      const leads = leadsData || [];
      const stages = stagesData || [];
      
      // Localiza as posições de referência
      const convertedStage = stages.find(s => 
        s.nome.toLowerCase() === CONVERTED_STAGE_NAME.toLowerCase() || 
        s.nome.toLowerCase() === ALTERNATIVE_CONVERTED_STAGE_NAME.toLowerCase()
      );
      const convertedPos = convertedStage?.posicao_ordem || 6;

      const lostStage = stages.find(s => s.nome.toLowerCase() === LOST_STAGE_NAME.toLowerCase());
      const lostPos = lostStage?.posicao_ordem || 999;

      // Função de validação de conversão idêntica ao useReports
      const isLeadConverted = (lead: any) => {
        return lead.posicao_pipeline >= convertedPos && lead.posicao_pipeline < lostPos;
      };

      const totalContatos = leads.length;
      const marketingLeads = leads.filter(l => l.origem === 'marketing').length;
      const organicLeads = leads.filter(l => l.origem === 'organico').length;

      const convertedLeads = leads.filter(isLeadConverted);
      const conversionRate = totalContatos > 0 ? (convertedLeads.length / totalContatos) * 100 : 0;
      
      // Financeiro e CAC
      const faturamentoTotal = (vendasData || []).reduce((sum, v) => sum + Number(v.valor_fechado), 0);
      const totalVendasCount = vendasData?.length || 0;

      const manualSpend = expensesData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;
      const metaSpend = criativosData?.reduce((acc, curr) => {
        const metrics = curr.platform_metrics as any;
        if (metrics && metrics.included_in_dashboard && metrics.spend) {
          return acc + Number(metrics.spend);
        }
        return acc;
      }, 0) || 0;

      const totalInvestment = manualSpend + metaSpend;
      const cac = totalVendasCount > 0 ? totalInvestment / totalVendasCount : 0;

      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const leadsOverTime = daysInInterval.map(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        return {
          day: format(day, 'dd/MM'),
          captados: leads.filter(l => format(parseISO(l.criado_em), 'yyyy-MM-dd') === dayString).length,
          // Conta convertidos pela data de atualização na etapa de sucesso
          convertidos: leads.filter(l => isLeadConverted(l) && l.atualizado_em && format(parseISO(l.atualizado_em), 'yyyy-MM-dd') === dayString).length
        };
      });

      return {
        totalContatos,
        marketingLeads,
        organicLeads,
        conversionRate: conversionRate.toFixed(1),
        faturamentoTotal,
        cac,
        activities: activitiesData || [],
        leadsByStage: leads.map(l => ({ etapa_id: l.posicao_pipeline })),
        leadsOverTime,
        sourceChartData: [],
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from && !!dateRange?.to,
  });

  return { metrics, isLoading, error, refetch };
}