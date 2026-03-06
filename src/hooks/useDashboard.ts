import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, eachDayOfInterval, parseISO, endOfDay } from 'date-fns';
import { useEffect } from 'react';

export function useDashboard(dateRange: DateRange | undefined) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase.channel('dashboard_realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  const { data: metrics, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from || !dateRange?.to) return null;

      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = endOfDay(dateRange.to).toISOString();
      const startDayStr = format(startOfDay(dateRange.from), 'yyyy-MM-dd');
      const endDayStr = format(endOfDay(dateRange.to), 'yyyy-MM-dd');

      // Busca leads que foram criados OU atualizados no período
      const [ { data: leads }, { data: stages }, { data: vendas }, { data: expenses }, { data: criativos } ] = await Promise.all([
        supabase.from('leads').select('*').eq('organization_id', orgId).or(`criado_em.gte.${startDate},atualizado_em.gte.${startDate}`).or(`criado_em.lte.${endDate},atualizado_em.lte.${endDate}`),
        supabase.from('etapas').select('*').order('posicao_ordem'),
        supabase.from('vendas').select('*').eq('organization_id', orgId).gte('data_fechamento', startDayStr).lte('data_fechamento', endDayStr),
        supabase.from('marketing_expenses').select('amount').eq('organization_id', orgId).gte('expense_date', startDayStr).lte('expense_date', endDayStr),
        supabase.from('criativos').select('platform_metrics').eq('organization_id', orgId)
      ]);

      const funnelStages = (stages || []).filter(s => s.incluir_no_funil);
      const convertedStage = funnelStages[funnelStages.length - 1];
      const convertedPos = convertedStage?.posicao_ordem || 6;
      const lostPos = (stages || []).find(s => s.nome.toLowerCase() === 'perdido')?.posicao_ordem || 999;

      // Lógica de conversão baseada na data de atualização (movimentação para a etapa final)
      const isLeadConvertedInPeriod = (lead: any) => 
        lead.posicao_pipeline >= convertedPos && 
        lead.posicao_pipeline < lostPos &&
        lead.atualizado_em >= startDate && 
        lead.atualizado_em <= endDate;

      const totalFaturado = (vendas || []).reduce((sum, v) => sum + Number(v.valor_fechado), 0);
      
      // FIX: Adicionado optional chaining para evitar erro de tela branca em criativos sem métricas
      const totalInvestment = (expenses || []).reduce((a, c) => a + Number(c.amount), 0) + (criativos || []).reduce((a, c) => {
        const m = c.platform_metrics as any;
        return (m && m.included_in_dashboard) ? a + Number(m.spend || 0) : a;
      }, 0);

      const periodLeads = (leads || []).filter(l => 
        (l.criado_em >= startDate && l.criado_em <= endDate) || 
        (l.atualizado_em >= startDate && l.atualizado_em <= endDate)
      );

      return {
        totalContatos: (leads || []).filter(l => l.criado_em >= startDate && l.criado_em <= endDate).length,
        marketingLeads: (leads || []).filter(l => l.origem === 'marketing' && l.criado_em >= startDate && l.criado_em <= endDate).length,
        organicLeads: (leads || []).filter(l => l.origem === 'organico' && l.criado_em >= startDate && l.criado_em <= endDate).length,
        conversionRate: (leads || []).length > 0 ? (((leads || []).filter(isLeadConvertedInPeriod).length / (leads || []).length) * 100).toFixed(1) : "0",
        faturamentoTotal,
        cac: (vendas || []).length > 0 ? totalInvestment / (vendas || []).length : 0,
        leadsByStage: (leads || []).map(l => ({ etapa_id: l.posicao_pipeline })),
        leadsOverTime: eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(d => {
          const dayStr = format(d, 'yyyy-MM-dd');
          return {
            day: format(d, 'dd/MM'),
            captados: (leads || []).filter(l => l.criado_em.startsWith(dayStr)).length,
            convertidos: (leads || []).filter(l => 
              l.posicao_pipeline >= convertedPos && 
              l.posicao_pipeline < lostPos && 
              l.atualizado_em?.startsWith(dayStr)
            ).length
          };
        })
      };
    },
    enabled: !!orgId && !!dateRange?.from,
  });

  return { metrics, isLoading, error, refetch };
}