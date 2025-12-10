import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { differenceInDays, eachDayOfInterval, startOfDay, endOfDay, format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';

interface ReportFilters {
  etapa_id: string;
  origem: string;
  genero: string;
  idade: string;
  tagId: string;
}

export function useReports(dateRange: DateRange | undefined, filters: ReportFilters = { etapa_id: "Todos", origem: "Todos", genero: "Todos", idade: "", tagId: "Todos" }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['reports', orgId, dateRange, filters],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from || !dateRange?.to) return null;
      
      const startDate = format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss');
      const endDate = format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss');
      
      // --- START: KPI Calculations (unfiltered by advanced filters) ---
      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, name')
        .in('name', ['LEAD', 'PACIENTE'])
        .eq('organization_id', orgId);

      if (tagsError) throw tagsError;

      const leadTagId = tagsData.find(t => t.name === 'LEAD')?.id;
      const pacienteTagId = tagsData.find(t => t.name === 'PACIENTE')?.id;

      const [
        { count: novosContatosCount, error: novosContatosError },
        { count: novosLeadsCount, error: novosLeadsError },
        { count: novosPacientesCount, error: novosPacientesError }
      ] = await Promise.all([
        supabase
          .from('leads')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .gte('criado_em', startDate)
          .lte('criado_em', endDate),
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
      ]);

      if (novosContatosError) throw novosContatosError;
      if (novosLeadsError) throw novosLeadsError;
      if (novosPacientesError) throw novosPacientesError;
      // --- END: KPI Calculations ---

      let leadIdsFromTagFilter: string[] | null = null;

      if (filters.tagId && filters.tagId !== "Todos") {
        const { data: leadsTagsData, error: leadsTagsError } = await supabase
          .from('leads_tags')
          .select('lead_id')
          .eq('tag_id', filters.tagId)
          .gte('assigned_at', startDate)
          .lte('assigned_at', endDate);

        if (leadsTagsError) throw leadsTagsError;
        leadIdsFromTagFilter = leadsTagsData.map(lt => lt.lead_id);

        if (leadIdsFromTagFilter.length === 0) {
          leadIdsFromTagFilter = [''];
        }
      }

      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .eq('organization_id', orgId);

      if (leadIdsFromTagFilter) {
        leadsQuery = leadsQuery.in('id', leadIdsFromTagFilter);
      } else {
        leadsQuery = leadsQuery
          .gte('criado_em', startDate)
          .lte('criado_em', endDate);
      }

      if (filters.etapa_id !== "Todos") leadsQuery = leadsQuery.eq('etapa_id', parseInt(filters.etapa_id));
      if (filters.origem !== "Todos") leadsQuery = leadsQuery.eq('origem', filters.origem);
      if (filters.genero !== "Todos") leadsQuery = leadsQuery.eq('genero', filters.genero);
      if (filters.idade) {
        const age = parseInt(filters.idade);
        if (!isNaN(age)) leadsQuery = leadsQuery.eq('idade', age);
      }

      const [
        { data: leadsData, error: leadsError },
        { data: stagesData, error: stagesError },
        { data: profilesData, error: profilesError },
        { data: vendasData, error: vendasError }
      ] = await Promise.all([
        leadsQuery,
        supabase.from('etapas').select('*'),
        supabase.from('perfis').select('id, nome_completo'),
        supabase
          .from('vendas')
          .select('*, leads(nome, telefone)')
          .eq('organization_id', orgId)
          .gte('data_fechamento', format(startOfDay(dateRange.from), 'yyyy-MM-dd'))
          .lte('data_fechamento', format(endOfDay(dateRange.to), 'yyyy-MM-dd'))
      ]);
      
      if (leadsError) throw leadsError;
      if (stagesError) throw stagesError;
      if (profilesError) throw profilesError;
      if (vendasError) throw vendasError;

      const leads = leadsData || [];
      const stages = stagesData || [];
      const profiles = profilesData || [];
      const vendas = vendasData || [];
      const userMap = new Map(profiles.map(p => [p.id, p.nome_completo || 'Desconhecido']));
      const convertedStageId = stages.find(s => s.nome.toLowerCase() === 'contrato fechado')?.id;
      
      const convertedLeads = leads.filter(l => l.etapa_id === convertedStageId);
      const totalLeads = leads.length;
      const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;
      const totalFaturadoVendas = vendas.reduce((sum, venda) => sum + venda.valor_fechado, 0);
      const ticketMedio = vendas.length > 0 ? totalFaturadoVendas / vendas.length : 0;
      const tempoMedioFunil = convertedLeads.length > 0
        ? convertedLeads.reduce((sum, lead) => differenceInDays(new Date(lead.atualizado_em), new Date(lead.criado_em)), 0) / convertedLeads.length
        : 0;

      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
      const leadsCapturedData = daysInInterval.map((day) => {
        const dayString = format(day, 'yyyy-MM-dd');
        const captados = leads.filter(l => format(parseISO(l.criado_em), 'yyyy-MM-dd') === dayString).length;
        const convertidos = convertedLeads.filter(l => l.atualizado_em && format(parseISO(l.atualizado_em), 'yyyy-MM-dd') === dayString).length;
        return { day: format(day, 'dd/MM', { locale: ptBR }), captados, convertidos };
      });
      const sourceData = leads.reduce((acc, lead) => {
        let source = lead.origem || 'Desconhecida';
        if (source.toLowerCase() === 'facebook ads') source = 'Facebook ADS';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const sourceChartData = Object.entries(sourceData).map(([source, leads]) => ({ source, leads }));
      const topCreatives = leads.reduce((acc, lead) => {
        if (!lead.criativo) return acc;
        if (!acc[lead.criativo]) acc[lead.criativo] = { name: lead.criativo, origin: lead.origem, leads: 0, converted: 0, value: 0 };
        acc[lead.criativo].leads++;
        if (lead.etapa_id === convertedStageId) {
          acc[lead.criativo].converted++;
          acc[lead.criativo].value += lead.valor || 0;
        }
        return acc;
      }, {} as Record<string, any>);
      const topCreativesData = Object.values(topCreatives).map(c => ({
        ...c,
        conversion: c.leads > 0 ? `${((c.converted / c.leads) * 100).toFixed(0)}%` : '0%',
        ticket: c.converted > 0 ? `R$ ${(c.value / c.converted).toFixed(2)}` : 'R$ 0.00',
      })).sort((a, b) => b.leads - a.leads).slice(0, 10);

      const funnelData = stages.sort((a, b) => a.posicao_ordem - b.posicao_ordem).map(stage => ({
        etapa: stage.nome,
        quantidade: leads.filter(l => l.etapa_id === stage.id).length,
      }));

      const totalVendasPeriodo = vendas.length;
      const totalOrcadoFechado = vendas.reduce((sum, v) => sum + (v.valor_orcado || v.valor_fechado), 0);
      const taxaEficienciaNegociacao = totalOrcadoFechado > 0 ? (totalFaturadoVendas / totalOrcadoFechado) * 100 : 0;
      const faturamentoPorDia = daysInInterval.map((day) => {
        const dayString = format(day, 'yyyy-MM-dd');
        const valor = vendas.filter(v => v.data_fechamento === dayString).reduce((sum, v) => sum + v.valor_fechado, 0);
        return { day: format(day, 'dd/MM'), valor };
      });
      const metodosPagamento = vendas.reduce((acc, venda) => {
        const metodo = venda.forma_pagamento || 'Não informado';
        acc[metodo] = (acc[metodo] || 0) + venda.valor_fechado;
        return acc;
      }, {} as Record<string, number>);
      const metodosPagamentoData = Object.entries(metodosPagamento).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

      const conversoesPorOrigem = convertedLeads.reduce((acc, lead) => {
        let origem = lead.origem || 'Desconhecida';
        if (origem.toLowerCase() === 'facebook ads') origem = 'Facebook ADS';
        acc[origem] = (acc[origem] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const conversoesPorOrigemData = Object.entries(conversoesPorOrigem).map(([name, value]) => ({ name, value }));
      const ultimasConversoes = vendas.sort((a, b) => new Date(b.data_fechamento).getTime() - new Date(a.data_fechamento).getTime()).slice(0, 5).map(venda => ({
        id: venda.id, nome: venda.leads?.nome || 'Cliente não encontrado', atendente: userMap.get(venda.usuario_id) || 'Desconhecido',
        valor: venda.valor_fechado, atualizado_em: venda.data_fechamento,
      }));

      const marketingPerformance = leads.reduce((acc, lead) => {
        const key = `${lead.origem || 'N/A'}::${lead.criativo || 'N/A'}`;
        if (!acc[key]) acc[key] = { origem: lead.origem || 'N/A', criativo: lead.criativo || 'N/A', leads: 0, conversions: 0, totalValue: 0 };
        acc[key].leads++;
        const sale = vendas.find(v => v.lead_id === lead.id);
        if (sale) {
          acc[key].conversions++;
          acc[key].totalValue += sale.valor_fechado;
        }
        return acc;
      }, {} as Record<string, { origem: string; criativo: string; leads: number; conversions: number; totalValue: number; }>);
      const marketingPerformanceData = Object.values(marketingPerformance).map(item => ({
        ...item,
        conversionRate: item.leads > 0 ? (item.conversions / item.leads) * 100 : 0,
        avgTicket: item.conversions > 0 ? item.totalValue / item.conversions : 0,
      })).sort((a, b) => b.leads - a.leads);
      const bestCreativeByConversions = [...marketingPerformanceData].filter(c => c.criativo !== 'N/A').sort((a, b) => b.conversions - a.conversions)[0] || null;
      const sourcePerformance = marketingPerformanceData.reduce((acc, item) => {
        const source = item.origem;
        if (!acc[source]) acc[source] = { name: source, leads: 0, conversions: 0, totalValue: 0 };
        acc[source].leads += item.leads;
        acc[source].conversions += item.conversions;
        acc[source].totalValue += item.totalValue;
        return acc;
      }, {} as Record<string, { name: string; leads: number; conversions: number; totalValue: number; }>);
      const bestSourceByRevenue = Object.values(sourcePerformance).filter(s => s.name !== 'N/A').sort((a, b) => b.totalValue - a.totalValue)[0] || null;
      const totalMarketingLeads = Object.values(sourcePerformance).filter(s => s.name !== 'N/A' && s.name !== 'Desconhecida').reduce((sum, s) => sum + s.leads, 0);
      const leadsVsConversionsByCreative = marketingPerformanceData.filter(item => item.criativo !== 'N/A').slice(0, 10).map(item => ({ name: item.criativo, Leads: item.leads, Conversões: item.conversions }));
      const revenueBySourceData = Object.values(sourcePerformance).filter(item => item.totalValue > 0).map(item => ({ name: item.name, value: item.totalValue }));

      return {
        kpis: {
          totalContatos: novosContatosCount || 0,
          totalNovosLeads: novosLeadsCount || 0,
          totalPacientes: novosPacientesCount || 0,
          totalLeads,
          conversionRate: conversionRate.toFixed(1),
          ticketMedio,
          tempoMedioFunil: tempoMedioFunil.toFixed(1)
        },
        charts: { leadsCapturedData, sourceData: sourceChartData, topCreativesData },
        funnel: { funnelData },
        financial: { totalFaturado: totalFaturadoVendas, ticketMedio, totalVendas: totalVendasPeriodo, taxaEficiencia: taxaEficienciaNegociacao, faturamentoPorDia, metodosPagamentoData },
        conversions: {
          kpis: { totalConvertido: totalFaturadoVendas, leadsConvertidos: convertedLeads.length, conversionRate: conversionRate.toFixed(1), ticketMedio },
          charts: { conversoesPorOrigemData, valorConvertidoPorDia: faturamentoPorDia },
          tables: { ultimasConversoes }
        },
        marketing: {
          kpis: { totalMarketingLeads, bestCreative: bestCreativeByConversions, bestSource: bestSourceByRevenue },
          performanceTable: marketingPerformanceData,
          charts: { leadsVsConversionsByCreative, revenueBySourceData }
        }
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from && !!dateRange?.to,
  });

  return { reports: data, isLoading };
}