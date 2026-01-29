import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { differenceInDays, eachDayOfInterval, startOfDay, endOfDay, format } from 'date-fns';
import { DateRange } from 'react-day-picker';

interface ReportFilters {
  posicao_pipeline: string;
  origem: string;
  genero: string;
  idade: string;
  tagId: string;
}

const defaultReportData = {
  kpis: {
    totalLeads: 0,
    totalContatos: 0,
    totalNovosLeads: 0,
    conversionRate: "0",
    ticketMedio: 0,
    tempoMedioFunil: "0"
  },
  charts: { 
    leadsCapturedData: [], 
    sourceData: [], 
    topCreativesData: [] 
  },
  funnel: { 
    funnelData: [],
    overallConversion: "0",
    detailedSteps: []
  },
  financial: { 
    totalFaturado: 0, 
    ticketMedio: 0, 
    totalVendas: 0, 
    taxaEficiencia: 0, 
    faturamentoPorDia: [], 
    metodosPagamentoData: [] 
  },
  conversions: { 
    kpis: { totalConvertido: 0, leadsConvertidos: 0, conversionRate: "0", ticketMedio: 0 }, 
    charts: { conversoesPorOrigemData: [], valorConvertidoPorDia: [] }, 
    tables: { ultimasConversoes: [] } 
  },
  marketing: {
    kpis: { totalMarketingLeads: 0, bestCreative: null, bestSource: null },
    performanceTable: [],
    charts: { leadsVsConversionsByCreative: [], revenueBySourceData: [] }
  }
};

// Lista ESTRITA de etapas padrão para o funil (Sincronizada com o Pipeline)
const SALES_FUNNEL_STAGES = [
  { name: "Novo Lead", color: "#94a3b8", order: 1 },
  { name: "Qualificação", color: "#64748b", order: 2 },
  { name: "Coletando Informações", color: "#a8a29e", order: 3 },
  { name: "Agendamento Solicitado", color: "#C5A47E", order: 4 },
  { name: "Agendado", color: "#4ade80", order: 5 },
  { name: "Procedimento Fechado", color: "#15803d", order: 6 }
];

export function useReports(dateRange: DateRange | undefined, filters: ReportFilters = { posicao_pipeline: "Todos", origem: "Todos", genero: "Todos", idade: "", tagId: "Todos" }) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data, isLoading } = useQuery({
    queryKey: ['reports', orgId, dateRange, filters],
    queryFn: async () => {
      if (!user || !orgId || !dateRange?.from) return defaultReportData;
      
      const startDate = startOfDay(dateRange.from).toISOString();
      const endDate = dateRange.to 
        ? endOfDay(dateRange.to).toISOString() 
        : endOfDay(dateRange.from).toISOString();
      
      const safeEnd = dateRange.to || dateRange.from;
      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: safeEnd });

      // 1. Filtro de Etiqueta
      let leadIdsFromTagFilter: string[] | null = null;
      if (filters.tagId && filters.tagId !== "Todos") {
        const { data: leadsTagsData } = await supabase
          .from('leads_tags')
          .select('lead_id')
          .eq('tag_id', filters.tagId);
        leadIdsFromTagFilter = leadsTagsData?.map(lt => lt.lead_id) || ['00000000-0000-0000-0000-000000000000'];
      }

      // 2. Construção das Queries
      const applyFilters = (query: any) => {
        if (filters.origem !== "Todos") query = query.eq(`origem`, filters.origem);
        if (filters.genero !== "Todos") query = query.eq(`genero`, filters.genero);
        if (filters.idade) {
          const age = parseInt(filters.idade);
          if (!isNaN(age)) query = query.eq(`idade`, age);
        }
        if (leadIdsFromTagFilter) query = query.in('id', leadIdsFromTagFilter);
        return query;
      };

      let leadsQuery = supabase.from('leads').select('*').eq('organization_id', orgId).gte('criado_em', startDate).lte('criado_em', endDate);
      leadsQuery = applyFilters(leadsQuery);

      let vendasQuery = supabase.from('vendas').select('*, leads(id, nome, telefone, origem, criativo_id)').eq('organization_id', orgId).gte('data_fechamento', format(dateRange.from, 'yyyy-MM-dd')).lte('data_fechamento', format(safeEnd, 'yyyy-MM-dd'));

      const [
        { data: leadsData },
        { data: stagesData },
        { data: vendasData },
        { data: criativosData }
      ] = await Promise.all([
        leadsQuery,
        supabase.from('etapas').select('*').order('posicao_ordem'),
        vendasQuery,
        supabase.from('criativos').select('id, nome, titulo').eq('organization_id', orgId)
      ]);
      
      const leads = leadsData || [];
      const allStages = stagesData || [];
      const vendas = vendasData || [];
      const criativos = criativosData || [];
      const criativosMap = new Map(criativos.map(c => [c.id, c]));

      // Identifica a posição da etapa "Perdido" para excluí-la da contagem acumulada
      const lostStage = allStages.find(s => s.nome.toLowerCase() === 'perdido');
      const lostPosition = lostStage?.posicao_ordem || 999;

      // 3. Funil de Vendas Real (Padronizado com o Pipeline)
      const funnelData = SALES_FUNNEL_STAGES.map((stdStage, index) => {
        // Tenta encontrar a etapa no banco para pegar a cor e posição real
        const dbStage = allStages.find(s => s.nome.toLowerCase() === stdStage.name.toLowerCase());
        
        // Se não encontrar no banco, assume a posição baseada no padrão
        const position = dbStage ? dbStage.posicao_ordem : stdStage.order;
        const color = dbStage ? dbStage.cor : stdStage.color;

        // Cálculo de Volume Acumulado
        // Conta leads que estão nesta etapa OU em etapas posteriores (funil acumulado)
        // EXCLUI leads que estão na etapa "Perdido" ou superior (fora do funil de sucesso)
        const volume = leads.filter(l => 
          l.posicao_pipeline >= position && l.posicao_pipeline < lostPosition
        ).length;

        let conversionRate = 100;
        let dropOffRate = 0;
        let previousVolume = 0;

        // Se não é a primeira etapa, calcula conversão baseada na anterior
        if (index > 0) {
          // Recalculamos o volume da etapa anterior para garantir consistência
          const prevStageName = SALES_FUNNEL_STAGES[index - 1];
          const prevDbStage = allStages.find(s => s.nome.toLowerCase() === prevStageName.name.toLowerCase());
          const prevPosition = prevDbStage ? prevDbStage.posicao_ordem : (index);
          
          previousVolume = leads.filter(l => 
            l.posicao_pipeline >= prevPosition && l.posicao_pipeline < lostPosition
          ).length;

          conversionRate = previousVolume > 0 ? (volume / previousVolume) * 100 : 0;
          dropOffRate = 100 - conversionRate;
        }

        return {
          etapa: stdStage.name,
          quantidade: volume,
          conversionRate: conversionRate.toFixed(1),
          dropOffRate: dropOffRate.toFixed(1),
          fill: color,
          previousVolume
        };
      });

      // Conversão Geral (Topo -> Fundo)
      const topOfFunnel = funnelData[0]?.quantidade || 0;
      const bottomOfFunnel = funnelData[funnelData.length - 1]?.quantidade || 0;
      const overallConversion = topOfFunnel > 0 ? ((bottomOfFunnel / topOfFunnel) * 100).toFixed(1) : "0";

      // 4. KPIs Gerais (Filtrados automaticamente pela query de leads)
      const convertedStagePosition = allStages.find(s => s.nome.toLowerCase().includes('fechado') || s.nome.toLowerCase().includes('contrato'))?.posicao_ordem || 6;
      const convertedLeads = leads.filter(l => l.posicao_pipeline === convertedStagePosition);
      const kpiConversionRate = leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0;
      
      // Filtrar vendas para bater com o filtro de origem (caso vendas não tenha origem explícita, usamos o join com leads)
      const filteredVendas = vendas.filter(v => {
        if (filters.origem === 'Todos') return true;
        // Verifica se o lead da venda tem a origem correta
        return v.leads && v.leads.origem === filters.origem;
      });

      const totalFaturado = filteredVendas.reduce((sum, v) => sum + Number(v.valor_fechado), 0);
      const totalOrcado = filteredVendas.reduce((sum, v) => sum + Number(v.valor_orcado || v.valor_fechado), 0);
      const taxaEficiencia = totalOrcado > 0 ? (totalFaturado / totalOrcado) * 100 : 0;
      const ticketMedio = filteredVendas.length > 0 ? totalFaturado / filteredVendas.length : 0;

      const tempoMedioFunil = convertedLeads.length > 0
        ? convertedLeads.reduce((sum, lead) => differenceInDays(new Date(lead.atualizado_em), new Date(lead.criado_em)), 0) / convertedLeads.length
        : 0;

      // 5. Gráficos Diários
      const leadsCapturedData = daysInInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return {
          day: format(day, 'dd/MM'),
          captados: leads.filter(l => l.criado_em.startsWith(dayStr)).length,
          convertidos: leads.filter(l => l.posicao_pipeline === convertedStagePosition && l.atualizado_em?.startsWith(dayStr)).length
        };
      });

      const faturamentoPorDia = daysInInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return {
          day: format(day, 'dd/MM'),
          valor: filteredVendas.filter(v => v.data_fechamento === dayStr).reduce((sum, v) => sum + Number(v.valor_fechado), 0)
        };
      });

      // 6. Distribuição (Apenas se o filtro for 'Todos', senão mostra 100% da origem selecionada)
      const sourceCount = leads.reduce((acc, l) => {
        const key = l.fonte || l.origem || 'Desconhecida';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sourceData = Object.entries(sourceCount).map(([source, count]) => ({ source, leads: count }));

      const metodosCount = filteredVendas.reduce((acc, v) => {
        const key = v.forma_pagamento || 'Outros';
        acc[key] = (acc[key] || 0) + Number(v.valor_fechado);
        return acc;
      }, {} as Record<string, number>);

      const metodosPagamentoData = Object.entries(metodosCount).map(([name, value]) => ({ name, value }));

      // 7. Marketing
      const creativeStats = leads.reduce((acc, lead) => {
        if (!lead.criativo_id) return acc;
        const c = criativosMap.get(lead.criativo_id);
        const name = c?.nome || c?.titulo || 'Criativo sem nome';
        if (!acc[name]) acc[name] = { name, origin: lead.origem || 'N/A', leads: 0, converted: 0, value: 0 };
        acc[name].leads++;
        const venda = filteredVendas.find(v => v.lead_id === lead.id);
        if (venda) {
          acc[name].converted++;
          acc[name].value += Number(venda.valor_fechado);
        }
        return acc;
      }, {} as Record<string, any>);

      const topCreativesData = Object.values(creativeStats)
        .map((c: any) => ({
          ...c,
          conversion: c.leads > 0 ? `${((c.converted / c.leads) * 100).toFixed(0)}%` : '0%'
        }))
        .sort((a, b) => b.leads - a.leads)
        .slice(0, 10);

      const performanceTable = Object.values(creativeStats).map((item: any) => ({
        origem: item.origin,
        criativo: item.name,
        leads: item.leads,
        conversions: item.converted,
        totalValue: item.value,
        conversionRate: item.leads > 0 ? (item.converted / item.leads) * 100 : 0,
        avgTicket: item.converted > 0 ? item.value / item.converted : 0,
      }));

      return {
        kpis: {
          totalLeads: leads.length,
          totalContatos: leads.length,
          totalNovosLeads: leads.length,
          conversionRate: kpiConversionRate.toFixed(1),
          ticketMedio,
          tempoMedioFunil: tempoMedioFunil.toFixed(1)
        },
        charts: { 
          leadsCapturedData, 
          sourceData, 
          topCreativesData 
        },
        funnel: { 
          funnelData,
          overallConversion,
          detailedSteps: funnelData
        },
        financial: { 
          totalFaturado, 
          ticketMedio, 
          totalVendas: filteredVendas.length, 
          taxaEficiencia,
          faturamentoPorDia, 
          metodosPagamentoData 
        },
        conversions: {
          kpis: { totalConvertido: totalFaturado, leadsConvertidos: convertedLeads.length, conversionRate: kpiConversionRate.toFixed(1), ticketMedio },
          charts: { 
            conversoesPorOrigemData: Object.entries(leads.filter(l => l.posicao_pipeline === convertedStagePosition).reduce((acc, l) => {
              const key = l.origem || 'Desconhecida';
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })),
            valorConvertidoPorDia: faturamentoPorDia 
          },
          tables: { 
            ultimasConversoes: leads
              .filter(l => l.posicao_pipeline === convertedStagePosition)
              .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())
              .slice(0, 5)
              .map(l => ({
                id: l.id,
                nome: l.nome || l.telefone,
                atendente: 'Sistema',
                valor: filteredVendas.find(v => v.lead_id === l.id)?.valor_fechado || 0,
                atualizado_em: l.atualizado_em
              }))
          }
        },
        marketing: {
          kpis: { 
            totalMarketingLeads: leads.filter(l => l.criativo_id).length, 
            bestCreative: topCreativesData[0] || null, 
            bestSource: sourceData.sort((a, b) => b.leads - a.leads)[0] || null 
          },
          performanceTable,
          charts: { 
            leadsVsConversionsByCreative: performanceTable.map(p => ({ name: p.criativo, Leads: p.leads, Conversões: p.conversions })),
            revenueBySourceData: sourceData.map(s => ({ name: s.source, value: s.leads }))
          }
        }
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });

  return { reports: data || defaultReportData, isLoading };
}