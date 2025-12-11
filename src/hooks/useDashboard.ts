import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile'; // Importar perfil
import { DateRange } from 'react-day-picker';
import { format, startOfDay, eachDayOfInterval, parseISO, endOfDay } from 'date-fns';

export function useDashboard(dateRange: DateRange | undefined) {
  const { user } = useAuth();
  const { profile } = useProfile(); // Obter orgId
  const orgId = profile?.organization_id;

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboard-metrics', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from || !dateRange?.to) return null;

      const startDate = format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss');

      // Busca os IDs das tags padrão
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, name')
        .in('name', ['LEAD', 'PACIENTE'])
        .eq('organization_id', orgId);

      if (tagsError) throw tagsError;

      const leadTagId = tagsData.find(t => t.name === 'LEAD')?.id;
      const pacienteTagId = tagsData.find(t => t.name === 'PACIENTE')?.id;

      const [
        { data: leadsData, error: leadsError },
        { data: stagesData, error: stagesError },
        { data: activitiesData, error: activitiesError },
        { count: novosLeadsCount, error: novosLeadsError },
        { count: pacientesCount, error: pacientesError },
        { data: vendasData, error: vendasError }
      ] = await Promise.all([
        supabase
          .from('leads')
          .select('*')
          .eq('organization_id', orgId)
          .gte('criado_em', startDate)
          .lte('criado_em', endDate),
        supabase.from('etapas').select('id, nome'),
        supabase
          .from('atividades')
          .select('*')
          .eq('organization_id', orgId)
          .gte('criado_em', startDate)
          .lte('criado_em', endDate)
          .order('criado_em', { ascending: false }),
        leadTagId ? supabase
          .from('leads_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', leadTagId)
          .gte('assigned_at', startDate)
          .lte('assigned_at', endDate) : Promise.resolve({ count: 0, error: null }),
        pacienteTagId ? supabase
          .from('leads_tags')
          .select('*', { count: 'exact', head: true })
          .eq('tag_id', pacienteTagId)
          .gte('assigned_at', startDate)
          .lte('assigned_at', endDate) : Promise.resolve({ count: 0, error: null }),
        supabase
          .from('vendas')
          .select('valor_fechado')
          .eq('organization_id', orgId)
          .gte('data_fechamento', format(startOfDay(dateRange.from), 'yyyy-MM-dd'))
          .lte('data_fechamento', format(endOfDay(dateRange.to), 'yyyy-MM-dd'))
      ]);

      if (leadsError) throw leadsError;
      if (stagesError) throw stagesError;
      if (activitiesError) throw activitiesError;
      if (novosLeadsError) throw novosLeadsError;
      if (pacientesError) throw pacientesError;
      if (vendasError) throw vendasError;

      const leads = leadsData || [];
      const stages = stagesData || [];
      const activities = activitiesData || [];
      const vendas = vendasData || [];
      
      const convertedStageId = stages.find(s => s.nome.toLowerCase() === 'contrato fechado')?.id;
      const negotiationStageId = stages.find(s => s.nome.toLowerCase().includes('negociação'))?.id;

      // KPIs
      const totalContatos = leads.length;
      const convertedLeads = leads.filter(l => l.etapa_id === convertedStageId);
      const conversionRate = totalContatos > 0 ? (convertedLeads.length / totalContatos) * 100 : 0;
      const valorEmNegociacao = leads
        .filter(l => l.etapa_id === negotiationStageId)
        .reduce((sum, l) => sum + (l.valor || 0), 0);
      const faturamentoTotal = vendas.reduce((sum, venda) => sum + venda.valor_fechado, 0);

      // Charts Data
      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const leadsOverTime = daysInInterval.map(day => {
        const dayString = format(day, 'yyyy-MM-dd');
        const captados = leads.filter(l => format(parseISO(l.criado_em), 'yyyy-MM-dd') === dayString).length;
        const convertidos = leads.filter(l => 
          l.etapa_id === convertedStageId && 
          l.atualizado_em && 
          format(parseISO(l.atualizado_em), 'yyyy-MM-dd') === dayString
        ).length;
        
        return {
          day: format(day, 'dd/MM'),
          captados,
          convertidos
        };
      });

      const leadsPorOrigem = leads.reduce((acc, lead) => {
        let origem = lead.origem || 'Desconhecida';
        if (origem.toLowerCase() === 'facebook ads') {
          origem = 'Facebook ADS';
        }
        acc[origem] = (acc[origem] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const sourceChartData = Object.entries(leadsPorOrigem)
        .map(([name, value]) => ({ name, leads: value }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 5);

      const leadsByStage = leads.map(l => ({ etapa_id: l.etapa_id }));

      return {
        totalContatos: totalContatos || 0,
        totalNovosLeads: novosLeadsCount || 0,
        totalPacientes: pacientesCount || 0,
        conversionRate: conversionRate.toFixed(1),
        valorEmNegociacao: valorEmNegociacao || 0,
        faturamentoTotal: faturamentoTotal || 0,
        activities: activities,
        leadsByStage: leadsByStage || [],
        leadsOverTime,
        sourceChartData,
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from && !!dateRange?.to,
  });

  return {
    metrics,
    isLoading,
  };
}