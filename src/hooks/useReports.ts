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
  idde: string;
  tagId: string;
}

export function useReports(dateRange: DateRange | undefined, filters: any = { etapa_id: "Todos", origem: "Todos", genero: "Todos", idade: "", tagId: "Todos" }) {
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
      
      const safeEnd = dateRange.to || dateRange.from;
      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: safeEnd });

      // 1. Filtros
      let leadIdsFromTagFilter: string[] | null = null;
      if (filters.tagId && filters.tagId !== "Todos") {
        const { data: lt } = await supabase.from('leads_tags').select('lead_id').eq('tag_id', filters.tagId);
        leadIdsFromTagFilter = lt?.map(i => i.lead_id) || ['00000000-0000-0000-0000-000000000000'];
      }

      const applyFilters = (query: any) => {
        if (filters.etapa_id !== "Todos") query = query.eq(`etapa_id`, parseInt(filters.etapa_id));
        if (filters.origem !== "Todos") query = query.eq(`origem`, filters.origem);
        if (filters.genero !== "Todos") query = query.eq(`genero`, filters.genero);
        return query;
      };

      // 2. Busca de Dados
      let leadsQuery = supabase.from('leads').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate);
      leadsQuery = applyFilters(leadsQuery);
      if (leadIdsFromTagFilter) leadsQuery = leadsQuery.in('id', leadIdsFromTagFilter);

      const [
        { data: leadsData },
        { data: stagesData },
        { data: vendasData },
        { data: criativosData }
      ] = await Promise.all([
        leadsQuery,
        supabase.from('etapas').select('*').order('posicao_ordem'),
        supabase.from('vendas').select('*, leads(*)').eq('organization_id', orgId).gte('data_fechamento', format(dateRange.from, 'yyyy-MM-dd')).lte('data_fechamento', format(safeEnd, 'yyyy-MM-dd')),
        supabase.from('criativos').select('*').eq('organization_id', orgId)
      ]);
      
      const leads = leadsData || [];
      const stages = stagesData || [];
      const vendas = vendasData || [];
      const criativos = criativosData || [];
      const criativosMap = new Map(criativos.map(c => [c.id, c]));

      // 3. Cálculos Gerais
      const convertedStageId = stages.find(s => s.nome.toLowerCase().includes('fechado'))?.id;
      const convertedLeads = leads.filter(l => l.etapa_id === convertedStageId);
      const totalFaturado = vendas.reduce((sum, v) => sum + Number(v.valor_fechado), 0);

      // 4. Marketing - Performance de Criativos e Origens
      const sourceRevenue: Record<string, number> = {};
      const creativeStats: Record<string, any> = {};

      leads.forEach(lead => {
        const source = lead.origem || 'Desconhecida';
        const c = lead.criativo_id ? criativosMap.get(lead.criativo_id) : null;
        const cName = c?.nome || c?.titulo || 'Sem Criativo';
        
        if (!creativeStats[cName]) {
          creativeStats[cName] = { name: cName, criativo: cName, leads: 0, conversions: 0, totalValue: 0 };
        }
        creativeStats[cName].leads++;

        const leadVendas = vendas.filter(v => v.lead_id === lead.id);
        leadVendas.forEach(v => {
          creativeStats[cName].conversions++;
          creativeStats[cName].totalValue += v.valor_fechado;
          sourceRevenue[source] = (sourceRevenue[source] || 0) + v.valor_fechado;
        });
      });

      const performanceTable = Object.values(creativeStats).map((item: any) => ({
        ...item,
        conversionRate: item.leads > 0 ? (item.conversions / item.leads) * 100 : 0,
        avgTicket: item.conversions > 0 ? item.totalValue / item.conversions : 0,
      }));

      const sourcePerformance = Object.entries(sourceRevenue)
        .map(([name, totalValue]) => ({ name, totalValue }))
        .sort((a, b) => b.totalValue - a.totalValue);

      const topCreatives = [...performanceTable].sort((a, b) => b.conversions - a.conversions);

      return {
        kpis: {
          totalLeads: leads.length,
          totalContatos: leads.length,
          totalNovosLeads: leads.length,
          conversionRate: leads.length > 0 ? ((convertedLeads.length / leads.length) * 100).toFixed(1) : "0",
          ticketMedio: vendas.length > 0 ? totalFaturado / vendas.length : 0,
          tempoMedioFunil: "0"
        },
        charts: { 
            leadsCapturedData: [], 
            sourceData: Object.entries(sourceRevenue).map(([source, val]) => ({ source, leads: val })) 
        },
        funnel: { funnelData: [] },
        financial: { totalFaturado, ticketMedio: 0, totalVendas: vendas.length, taxaEficiencia: 0, faturamentoPorDia: [], metodosPagamentoData: [] },
        conversions: { kpis: {} as any, charts: {} as any, tables: { ultimasConversoes: [] } },
        marketing: {
          kpis: { 
            totalMarketingLeads: leads.filter(l => l.criativo_id).length, 
            bestCreative: topCreatives[0] || null, 
            bestSource: sourcePerformance[0] || null 
          },
          performanceTable,
          charts: { 
            leadsVsConversionsByCreative: performanceTable.map(p => ({ name: p.criativo, Leads: p.leads, Conversões: p.conversions })),
            revenueBySourceData: sourcePerformance.map(s => ({ name: s.name, value: s.totalValue }))
          }
        }
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });

  return { reports: data, isLoading };
}