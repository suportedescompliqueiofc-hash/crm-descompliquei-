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

      try {
        const [ leadsRes, stagesRes, vendasRes, expensesRes, criativosRes ] = await Promise.all([
          supabase
            .from('leads')
            .select('*')
            .eq('organization_id', orgId)
            .or(`and(criado_em.gte.${startDate},criado_em.lte.${endDate}),and(atualizado_em.gte.${startDate},atualizado_em.lte.${endDate})`),
          supabase.from('etapas').select('*').order('posicao_ordem'),
          supabase.from('vendas').select('*').eq('organization_id', orgId).gte('data_fechamento', startDayStr).lte('data_fechamento', endDayStr),
          supabase.from('marketing_expenses').select('amount').eq('organization_id', orgId).gte('expense_date', startDayStr).lte('expense_date', endDayStr),
          supabase.from('criativos').select('platform_metrics').eq('organization_id', orgId)
        ]);

        if (leadsRes.error?.status === 401) throw new Error("Sessão expirada. Por favor, recarregue a página.");

        const leads = leadsRes.data || [];
        const stages = stagesRes.data || [];
        const vendas = vendasRes.data || [];
        const expenses = expensesRes.data || [];
        const criativos = criativosRes.data || [];

        const funnelStages = stages.filter(s => s.incluir_no_funil);
        const convertedStage = funnelStages[funnelStages.length - 1];
        const convertedPos = convertedStage?.posicao_ordem || 6;
        const lostPos = stages.find(s => s.nome.toLowerCase() === 'perdido')?.posicao_ordem || 999;

        const isLeadConvertedInPeriod = (lead: any) => 
          lead.posicao_pipeline >= convertedPos && 
          lead.posicao_pipeline < lostPos &&
          lead.atualizado_em >= startDate && 
          lead.atualizado_em <= endDate;

        // Variável corrigida para evitar o ReferenceError
        const faturamentoTotal = vendas.reduce((sum, v) => sum + Number(v.valor_fechado || 0), 0);
        
        const totalInvestment = expenses.reduce((a, c) => a + Number(c.amount || 0), 0) + criativos.reduce((a, c) => {
          const m = c.platform_metrics as any;
          const spend = Number(m?.spend || 0);
          return (m?.included_in_dashboard) ? a + spend : a;
        }, 0);

        const conversionCount = leads.filter(isLeadConvertedInPeriod).length;

        return {
          totalContatos: leads.filter(l => l.criado_em >= startDate && l.criado_em <= endDate).length,
          marketingLeads: leads.filter(l => l.origem === 'marketing' && l.criado_em >= startDate && l.criado_em <= endDate).length,
          organicLeads: leads.filter(l => l.origem === 'organico' && l.criado_em >= startDate && l.criado_em <= endDate).length,
          conversionRate: leads.length > 0 ? ((conversionCount / leads.length) * 100).toFixed(1) : "0",
          faturamentoTotal, // Propriedade agora corretamente definida
          cac: vendas.length > 0 ? totalInvestment / vendas.length : 0,
          leadsByStage: leads.map(l => ({ etapa_id: l.posicao_pipeline })),
          leadsOverTime: eachDayOfInterval({ start: dateRange.from, end: dateRange.to }).map(d => {
            const dayStr = format(d, 'yyyy-MM-dd');
            return {
              day: format(d, 'dd/MM'),
              captados: leads.filter(l => l.criado_em.startsWith(dayStr)).length,
              convertidos: leads.filter(l => 
                l.posicao_pipeline >= convertedPos && 
                l.posicao_pipeline < lostPos && 
                l.atualizado_em?.startsWith(dayStr)
              ).length
            };
          })
        };
      } catch (err: any) {
        console.error("Erro crítico no processamento do painel:", err);
        throw err;
      }
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
    staleTime: 1000 * 30,
    retry: 1,
  });

  return { metrics, isLoading, error, refetch };
}