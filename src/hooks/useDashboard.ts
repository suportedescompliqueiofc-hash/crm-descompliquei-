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
    const channel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
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

      const startDate = format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss');

      const { data: tagsData } = await supabase
        .from('tags')
        .select('id, name')
        .in('name', ['LEAD', 'CLIENTE'])
        .eq('organization_id', orgId);

      const leadTagId = tagsData?.find(t => t.name === 'LEAD')?.id;

      const [
        { data: leadsData },
        { data: stagesData },
        { data: activitiesData },
        { count: novosLeadsCount },
        { data: vendasData }
      ] = await Promise.all([
        supabase.from('leads').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate),
        supabase.from('etapas').select('id, nome, posicao_ordem'),
        supabase.from('atividades').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate).limit(10),
        leadTagId ? supabase.from('leads_tags').select('*', { count: 'exact', head: true }).eq('tag_id', leadTagId).gte('assigned_at', startDate).lte('assigned_at', endDate) : Promise.resolve({ count: 0 }),
        supabase.from('vendas').select('valor_fechado').eq('organization_id', orgId).gte('data_fechamento', format(startOfDay(dateRange.from), 'yyyy-MM-dd')).lte('data_fechamento', format(endOfDay(dateRange.to), 'yyyy-MM-dd'))
      ]);

      const leads = leadsData || [];
      const stages = stagesData || [];
      const convertedStagePosition = stages.find(s => s.nome.toLowerCase().includes('fechado'))?.posicao_ordem;

      const totalContatos = leads.length;
      const convertedLeads = leads.filter(l => l.posicao_pipeline === convertedStagePosition);
      const conversionRate = totalContatos > 0 ? (convertedLeads.length / totalContatos) * 100 : 0;
      const faturamentoTotal = (vendasData || []).reduce((sum, v) => sum + v.valor_fechado, 0);

      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const leadsOverTime = daysInInterval.map(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        return {
          day: format(day, 'dd/MM'),
          captados: leads.filter(l => format(parseISO(l.criado_em), 'yyyy-MM-dd') === dayString).length,
          convertidos: leads.filter(l => l.posicao_pipeline === convertedStagePosition && l.atualizado_em && format(parseISO(l.atualizado_em), 'yyyy-MM-dd') === dayString).length
        };
      });

      return {
        totalContatos,
        totalNovosLeads: novosLeadsCount || 0,
        conversionRate: conversionRate.toFixed(1),
        faturamentoTotal,
        activities: activitiesData || [],
        leadsByStage: leads.map(l => ({ etapa_id: l.posicao_pipeline })), // Mapeia posicao para gráfico
        leadsOverTime,
        sourceChartData: [],
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from && !!dateRange?.to,
  });

  return { metrics, isLoading, error, refetch };
}