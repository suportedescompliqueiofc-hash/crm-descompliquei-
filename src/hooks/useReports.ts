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
      if (!user || !orgId || !dateRange?.from) return null;
      
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to 
        ? endOfDay(dateRange.to).toISOString() 
        : endOfDay(dateRange.from).toISOString();
      
      let leadIdsFromTagFilter: string[] | null = null;

      if (filters.tagId && filters.tagId !== "Todos") {
        const { data: leadsTagsData, error: leadsTagsError } = await supabase
          .from('leads_tags')
          .select('lead_id')
          .eq('tag_id', filters.tagId);

        if (leadsTagsError) throw leadsTagsError;
        leadIdsFromTagFilter = leadsTagsData.map(lt => lt.lead_id);

        if (leadIdsFromTagFilter.length === 0) {
          leadIdsFromTagFilter = ['00000000-0000-0000-0000-000000000000'];
        }
      }

      const { data: tagsData, error: tagsError } = await supabase
        .from('tags')
        .select('id, name')
        .in('name', ['LEAD', 'PACIENTE', 'CLIENTE'])
        .eq('organization_id', orgId);

      if (tagsError) throw tagsError;

      const leadTagId = tagsData.find(t => t.name === 'LEAD')?.id;
      const convertedTagId = tagsData.find(t => t.name === 'PACIENTE' || t.name === 'CLIENTE')?.id;

      const applyFilters = (query: any, tablePrefix: string = '') => {
        const prefix = tablePrefix ? `${tablePrefix}.` : '';
        if (filters.etapa_id !== "Todos") query = query.eq(`${prefix}etapa_id`, parseInt(filters.etapa_id));
        if (filters.origem !== "Todos") query = query.eq(`${prefix}origem`, filters.origem);
        if (filters.genero !== "Todos") query = query.eq(`${prefix}genero`, filters.genero);
        if (filters.idade) {
          const age = parseInt(filters.idade);
          if (!isNaN(age)) query = query.eq(`${prefix}idade`, age);
        }
        return query;
      };

      let qNovosContatos = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', orgId)
        .gte('criado_em', startDate)
        .lte('criado_em', endDate);
      
      qNovosContatos = applyFilters(qNovosContatos);
      if (leadIdsFromTagFilter) qNovosContatos = qNovosContatos.in('id', leadIdsFromTagFilter);

      let qNovosLeadsQualificados = leadTagId ? supabase
        .from('leads_tags')
        .select('*, leads!inner(*)', { count: 'exact', head: true })
        .eq('tag_id', leadTagId)
        .gte('assigned_at', startDate)
        .lte('assigned_at', endDate)
        .eq('leads.organization_id', orgId) 
        : Promise.resolve({ count: 0, error: null });

      let qNovasConversoes = convertedTagId ? supabase
        .from('leads_tags')
        .select('*, leads!inner(*)', { count: 'exact', head: true })
        .eq('tag_id', convertedTagId)
        .gte('assigned_at', startDate)
        .lte('assigned_at', endDate)
        .eq('leads.organization_id', orgId)
        : Promise.resolve({ count: 0, error: null });

      const [
        { count: novosContatosCount },
        { count: novosLeadsQualificadosCount },
        { count: novasConversoesCount }
      ] = await Promise.all([
        qNovosContatos,
        qNovosLeadsQualificados as any,
        qNovasConversoes as any
      ]);

      let leadsQuery = supabase
        .from('leads')
        .select('*')
        .eq('organization_id', orgId)
        .gte('criado_em', startDate)
        .lte('criado_em', endDate);

      if (leadIdsFromTagFilter) leadsQuery = leadsQuery.in('id', leadIdsFromTagFilter);
      leadsQuery = applyFilters(leadsQuery);

      let vendasQuery = supabase
        .from('vendas')
        .select('*, leads(nome, telefone)')
        .eq('organization_id', orgId)
        .gte('data_fechamento', format(dateRange.from, 'yyyy-MM-dd'))
        .lte('data_fechamento', format(dateRange.to || dateRange.from, 'yyyy-MM-dd'));

      const [
        { data: leadsData },
        { data: stagesData },
        { data: profilesData },
        { data: vendasData },
        { data: criativosData } 
      ] = await Promise.all([
        leadsQuery,
        supabase.from('etapas').select('*'),
        supabase.from('perfis').select('id, nome_completo'),
        vendasQuery,
        supabase.from('criativos').select('id, nome, titulo, plataforma').eq('organization_id', orgId)
      ]);
      
      const leads = leadsData || [];
      const stages = stagesData || [];
      const profiles = profilesData || [];
      const vendas = vendasData || [];
      const criativos = criativosData || [];
      
      const criativosMap = new Map(criativos.map(c => [c.id, c]));
      const userMap = new Map(profiles.map(p => [p.id, p.nome_completo || 'Desconhecido']));
      const convertedStageId = stages.find(s => s.nome.toLowerCase().includes('fechado'))?.id;
      
      const convertedLeads = leads.filter(l => l.etapa_id === convertedStageId);
      const totalLeads = leads.length;
      const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;
      const totalFaturadoVendas = vendas.reduce((sum, venda) => sum + venda.valor_fechado, 0);
      const ticketMedio = vendas.length > 0 ? totalFaturadoVendas / vendas.length : 0;
      const tempoMedioFunil = convertedLeads.length > 0
        ? convertedLeads.reduce((sum, lead) => differenceInDays(new Date(lead.atualizado_em), new Date(lead.criado_em)), 0) / convertedLeads.length
        : 0;

      const safeEnd = dateRange.to || dateRange.from;
      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: safeEnd });
      
      const leadsCapturedData = daysInInterval.map((day) => {
        const dayString = format(day, 'yyyy-MM-dd');
        const captados = leads.filter(l => format(parseISO(l.criado_em), 'yyyy-MM-dd') === dayString).length;
        const convertidos = convertedLeads.filter(l => l.atualizado_em && format(parseISO(l.atualizado_em), 'yyyy-MM-dd') === dayString).length;
        return { day: format(day, 'dd/MM', { locale: ptBR }), captados, convertidos };
      });

      const sourceData = leads.reduce((acc, lead) => {
        let source = lead.origem || 'Desconhecida';
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const sourceChartData = Object.entries(sourceData).map(([source, leads]) => ({ source, leads }));
      
      const topCreatives = leads.reduce((acc, lead) => {
        if (!lead.criativo_id || !criativosMap.has(lead.criativo_id)) return acc;
        const c = criativosMap.get(lead.criativo_id);
        const creativeName = c.nome || c.titulo || 'Criativo sem nome';
        if (!acc[creativeName]) acc[creativeName] = { name: creativeName, origin: lead.origem, leads: 0, converted: 0, value: 0 };
        acc[creativeName].leads++;
        if (lead.etapa_id === convertedStageId) acc[creativeName].converted++;
        return acc;
      }, {} as Record<string, any>);

      const topCreativesData = Object.values(topCreatives).map(c => ({
        ...c,
        conversion: c.leads > 0 ? `${((c.converted / c.leads) * 100).toFixed(0)}%` : '0%',
      })).sort((a, b) => b.leads - a.leads).slice(0, 10);

      const funnelData = stages.sort((a, b) => a.posicao_ordem - b.posicao_ordem).map(stage => ({
        etapa: stage.nome,
        quantidade: leads.filter(l => l.etapa_id === stage.id).length,
      }));

      const marketingPerformance = leads.reduce((acc, lead) => {
        if (!lead.criativo_id || !criativosMap.has(lead.criativo_id)) return acc;
        const c = criativosMap.get(lead.criativo_id);
        const creativeName = c.nome || c.titulo || 'Criativo sem nome';
        const origem = lead.origem || 'N/A';
        const key = `${origem}::${creativeName}`;
        if (!acc[key]) acc[key] = { origem: origem, criativo: creativeName, leads: 0, conversions: 0, totalValue: 0 };
        acc[key].leads++;
        const sale = vendas.find(v => v.lead_id === lead.id);
        if (sale) {
          acc[key].conversions++;
          acc[key].totalValue += sale.valor_fechado;
        }
        return acc;
      }, {} as Record<string, any>);

      const marketingPerformanceData = Object.values(marketingPerformance).map((item: any) => ({
        ...item,
        conversionRate: item.leads > 0 ? (item.conversions / item.leads) * 100 : 0,
        avgTicket: item.conversions > 0 ? item.totalValue / item.conversions : 0,
      })).sort((a, b) => b.leads - a.leads);

      return {
        kpis: {
          totalContatos: novosContatosCount || 0,
          totalNovosLeads: novosLeadsQualificadosCount || 0,
          totalConversoes: novasConversoesCount || 0,
          totalLeads,
          conversionRate: conversionRate.toFixed(1),
          ticketMedio,
          tempoMedioFunil: tempoMedioFunil.toFixed(1)
        },
        charts: { leadsCapturedData, sourceData: sourceChartData, topCreativesData },
        funnel: { funnelData },
        financial: { totalFaturado: totalFaturadoVendas, ticketMedio, totalVendas: vendas.length, faturamentoPorDia: [], metodosPagamentoData: [] },
        conversions: {
          kpis: { totalConvertido: totalFaturadoVendas, leadsConvertidos: convertedLeads.length, conversionRate: conversionRate.toFixed(1), ticketMedio },
          charts: { conversoesPorOrigemData: [], valorConvertidoPorDia: [] },
          tables: { ultimasConversoes: [] }
        },
        marketing: {
          kpis: { totalMarketingLeads: 0, bestCreative: null, bestSource: null },
          performanceTable: marketingPerformanceData,
          charts: { leadsVsConversionsByCreative: [], revenueBySourceData: [] }
        }
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });

  return { reports: data, isLoading };
}