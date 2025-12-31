import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { differenceInDays, eachDayOfInterval, startOfDay, endOfDay, format, parseISO, isSameDay } from 'date-fns';
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
      
      const safeEnd = dateRange.to || dateRange.from;
      const daysInInterval = eachDayOfInterval({ start: dateRange.from, end: safeEnd });

      // 1. Filtro de Etiqueta (Manual para evitar joins complexos no Supabase)
      let leadIdsFromTagFilter: string[] | null = null;
      if (filters.tagId && filters.tagId !== "Todos") {
        const { data: leadsTagsData } = await supabase
          .from('leads_tags')
          .select('lead_id')
          .eq('tag_id', filters.tagId);
        leadIdsFromTagFilter = leadsTagsData?.map(lt => lt.lead_id) || ['00000000-0000-0000-0000-000000000000'];
      }

      // 2. Busca de Dados Base
      const applyFilters = (query: any) => {
        if (filters.etapa_id !== "Todos") query = query.eq(`etapa_id`, parseInt(filters.etapa_id));
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
      const stages = stagesData || [];
      const vendas = vendasData || [];
      const criativos = criativosData || [];
      const criativosMap = new Map(criativos.map(c => [c.id, c]));

      // 3. Cálculos de KPIs Gerais
      const convertedStageId = stages.find(s => s.nome.toLowerCase().includes('fechado'))?.id;
      const convertedLeads = leads.filter(l => l.etapa_id === convertedStageId);
      const conversionRate = leads.length > 0 ? (convertedLeads.length / leads.length) * 100 : 0;
      
      const totalFaturado = vendas.reduce((sum, v) => sum + Number(v.valor_fechado), 0);
      const totalOrcado = vendas.reduce((sum, v) => sum + Number(v.valor_orcado || v.valor_fechado), 0);
      const taxaEficiencia = totalOrcado > 0 ? (totalFaturado / totalOrcado) * 100 : 0;
      const ticketMedio = vendas.length > 0 ? totalFaturado / vendas.length : 0;

      const tempoMedioFunil = convertedLeads.length > 0
        ? convertedLeads.reduce((sum, lead) => differenceInDays(new Date(lead.atualizado_em), new Date(lead.criado_em)), 0) / convertedLeads.length
        : 0;

      // 4. Gráficos - Evolução Diária
      const leadsCapturedData = daysInInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return {
          day: format(day, 'dd/MM'),
          captados: leads.filter(l => l.criado_em.startsWith(dayStr)).length,
          convertidos: leads.filter(l => l.etapa_id === convertedStageId && l.atualizado_em?.startsWith(dayStr)).length
        };
      });

      const faturamentoPorDia = daysInInterval.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        return {
          day: format(day, 'dd/MM'),
          valor: vendas.filter(v => v.data_fechamento === dayStr).reduce((sum, v) => sum + Number(v.valor_fechado), 0)
        };
      });

      // 5. Gráficos - Distribuição
      const sourceCount = leads.reduce((acc, l) => {
        const key = l.origem || 'Desconhecida';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const sourceData = Object.entries(sourceCount).map(([source, count]) => ({ source, leads: count }));

      const metodosCount = vendas.reduce((acc, v) => {
        const key = v.forma_pagamento || 'Outros';
        acc[key] = (acc[key] || 0) + Number(v.valor_fechado);
        return acc;
      }, {} as Record<string, number>);

      const metodosPagamentoData = Object.entries(metodosCount).map(([name, value]) => ({ name, value }));

      const funnelData = stages.map(s => ({
        etapa: s.nome,
        quantidade: leads.filter(l => l.etapa_id === s.id).length
      }));

      // 6. Marketing e Performance de Criativos
      const creativeStats = leads.reduce((acc, lead) => {
        if (!lead.criativo_id) return acc;
        const c = criativosMap.get(lead.criativo_id);
        const name = c?.nome || c?.titulo || 'Criativo sem nome';
        if (!acc[name]) acc[name] = { name, origin: lead.origem || 'N/A', leads: 0, converted: 0, value: 0 };
        acc[name].leads++;
        const venda = vendas.find(v => v.lead_id === lead.id);
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
          totalContatos: leads.length,
          totalNovosLeads: leads.length, // Simplificado
          totalConversoes: convertedLeads.length,
          totalLeads: leads.length,
          conversionRate: conversionRate.toFixed(1),
          ticketMedio,
          tempoMedioFunil: tempoMedioFunil.toFixed(1)
        },
        charts: { leadsCapturedData, sourceData, topCreativesData },
        funnel: { funnelData },
        financial: { 
          totalFaturado, 
          ticketMedio, 
          totalVendas: vendas.length, 
          taxaEficiencia,
          faturamentoPorDia, 
          metodosPagamentoData 
        },
        conversions: {
          kpis: { totalConvertido: totalFaturado, leadsConvertidos: convertedLeads.length, conversionRate: conversionRate.toFixed(1), ticketMedio },
          charts: { 
            conversoesPorOrigemData: Object.entries(leads.filter(l => l.etapa_id === convertedStageId).reduce((acc, l) => {
              const key = l.origem || 'Desconhecida';
              acc[key] = (acc[key] || 0) + 1;
              return acc;
            }, {} as Record<string, number>)).map(([name, value]) => ({ name, value })),
            valorConvertidoPorDia: faturamentoPorDia 
          },
          tables: { 
            ultimasConversoes: leads
              .filter(l => l.etapa_id === convertedStageId)
              .sort((a, b) => new Date(b.atualizado_em).getTime() - new Date(a.atualizado_em).getTime())
              .slice(0, 5)
              .map(l => ({
                id: l.id,
                nome: l.nome || l.telefone,
                atendente: 'Sistema',
                valor: vendas.find(v => v.lead_id === l.id)?.valor_fechado || 0,
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
            revenueBySourceData: sourceData.map(s => ({ name: s.source, value: s.leads })) // Simplificado
          }
        }
      };
    },
    enabled: !!user && !!orgId && !!dateRange?.from,
  });

  return { reports: data, isLoading };
}