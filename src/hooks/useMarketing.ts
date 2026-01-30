import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay, format } from 'date-fns';
import { useEffect } from 'react';

export interface MetaMetrics {
  spend: number;          // Valor usado (BRL)
  impressions: number;    // Impressões
  clicks: number;         // Cliques no link
  ctr: number;            // CTR (taxa de cliques no link)
  cpc: number;            // CPC (custo por clique no link)
  reach: number;          // Alcance
  results: number;        // Resultados
  cost_per_result: number;// Custo por resultados
  reporting_start?: string | null; // Data de início do relatório
  reporting_end?: string | null;   // Data de término do relatório
  updated_at?: string;
  included_in_dashboard?: boolean; // Novo campo para controle
}

export interface Criativo {
  id: string;
  organization_id: string;
  nome: string | null;
  titulo: string | null;
  conteudo: string | null;
  url_midia: string | null;
  url_thumbnail: string | null;
  plataforma: string | null;
  aplicativo: string | null;
  criado_em: string;
  platform_metrics?: MetaMetrics; // Nova coluna JSONB
  stats?: {
    contagem_leads: number;
    contagem_vendas: number;
    faturamento: number;
  };
}

export function useMarketing(dateRange?: DateRange) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  // Realtime Subscription
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('marketing_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'criativos' }, () => {
        queryClient.invalidateQueries({ queryKey: ['criativos'] });
        queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'marketing_expenses' }, () => {
        queryClient.invalidateQueries({ queryKey: ['marketing_expenses'] });
        queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => {
        queryClient.invalidateQueries({ queryKey: ['criativos'] });
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'vendas' }, () => {
        queryClient.invalidateQueries({ queryKey: ['criativos'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const { data: metricsData, isLoading } = useQuery({
    queryKey: ['marketing_metrics', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return { criativos: [], manualSpend: 0, totalSales: 0 };

      const startDate = dateRange?.from ? startOfDay(dateRange.from).toISOString() : null;
      const endDate = dateRange?.to 
        ? endOfDay(dateRange.to).toISOString() 
        : (dateRange?.from ? endOfDay(dateRange.from).toISOString() : null);

      const formattedStartDate = dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : null;
      const formattedEndDate = dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : formattedStartDate;

      // 1. Buscar Gastos Manuais
      let expenseQuery = supabase
        .from('marketing_expenses')
        .select('amount')
        .eq('organization_id', orgId);

      if (formattedStartDate && formattedEndDate) {
        expenseQuery = expenseQuery.gte('expense_date', formattedStartDate).lte('expense_date', formattedEndDate);
      }
      
      const { data: expensesData } = await expenseQuery;
      const manualSpend = expensesData?.reduce((acc, curr) => acc + Number(curr.amount), 0) || 0;

      // 2. Buscar Total de Vendas no Período (para CAC Global)
      let globalSalesQuery = supabase
        .from('vendas')
        .select('id', { count: 'exact' })
        .eq('organization_id', orgId);

      if (formattedStartDate && formattedEndDate) {
        globalSalesQuery = globalSalesQuery.gte('data_fechamento', formattedStartDate).lte('data_fechamento', formattedEndDate);
      }
      
      const { count: totalSalesCount } = await globalSalesQuery;

      // 3. Buscar criativos (Alterado: Busca TODOS para garantir que assets apareçam, filtramos campanhas em memória)
      const query = supabase
        .from('criativos')
        .select('*')
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Filtragem em memória:
      // - Campanhas (com metrics > 0): Respeitam o filtro de data (criado_em)
      // - Assets (sem metrics): São mostrados SEMPRE (biblioteca)
      const filteredData = data.filter(item => {
        const metrics = item.platform_metrics as any;
        const hasSpend = metrics && metrics.spend > 0;

        if (hasSpend) {
          // É uma campanha importada com gastos -> Respeita o filtro de data para não poluir métricas do período
          if (startDate && endDate) {
            return item.criado_em >= startDate && item.criado_em <= endDate;
          }
          return true;
        }
        
        // É um ativo (imagem/video do n8n ou manual) -> Mostra sempre
        return true;
      });

      // 4. Buscar estatísticas (Leads e Vendas) por criativo
      const criativosComStats = await Promise.all(filteredData.map(async (criativo) => {
        let leadsQuery = supabase
          .from('leads')
          .select('id')
          .eq('criativo_id', criativo.id);
        
        // Estatísticas continuam respeitando o filtro de data selecionado
        if (startDate && endDate) {
          leadsQuery = leadsQuery.gte('criado_em', startDate).lte('criado_em', endDate);
        }

        const { data: leadsData } = await leadsQuery;
        
        const leadIds = leadsData?.map(l => l.id) || [];
        const leadsCount = leadIds.length;

        let salesCount = 0;
        let revenue = 0;

        if (leadIds.length > 0) {
            let salesQuery = supabase
              .from('vendas')
              .select('valor_fechado')
              .eq('organization_id', orgId)
              .in('lead_id', leadIds);
            
            const { data: salesData } = await salesQuery;
            
            if (salesData) {
                salesCount = salesData.length;
                revenue = salesData.reduce((sum, sale) => sum + Number(sale.valor_fechado || 0), 0);
            }
        }

        return {
          ...criativo,
          stats: {
            contagem_leads: leadsCount,
            contagem_vendas: salesCount,
            faturamento: revenue
          }
        };
      }));

      return {
        criativos: criativosComStats as Criativo[],
        manualSpend,
        totalSales: totalSalesCount || 0
      };
    },
    enabled: !!user && !!orgId,
  });

  const createCriativo = useMutation({
    mutationFn: async (newCriativo: { nome: string; titulo?: string; plataforma?: string }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from('criativos')
        .insert([{ 
          ...newCriativo, 
          organization_id: orgId,
          plataforma: 'Meta Ads',
          aplicativo: 'Instagram/Facebook'
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      toast.success('Criativo criado com sucesso!');
    },
    onError: (err: any) => toast.error(`Erro ao criar criativo: ${err.message}`),
  });

  const atualizarNomeCriativo = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from('criativos')
        .update({ nome })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      toast.success('Nome do criativo atualizado!');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const atualizarMetricasCriativo = useMutation({
    mutationFn: async ({ id, metrics }: { id: string; metrics: MetaMetrics }) => {
      const { error } = await supabase
        .from('criativos')
        .update({ platform_metrics: metrics as any })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
    },
    onError: (err: any) => toast.error(`Erro ao salvar métricas: ${err.message}`),
  });

  const deletarCriativo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('criativos')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      toast.success('Criativo excluído com sucesso.');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const associarCriativo = useMutation({
    mutationFn: async ({ campaignId, creativeId }: { campaignId: string; creativeId: string }) => {
      // campaignId: ID da linha da campanha importada (Meta)
      // creativeId: ID do criativo do CRM que contém a mídia/texto

      if (!user || !orgId) throw new Error("Usuário não autenticado");

      // 1. Buscar dados visuais do criativo selecionado (CRM)
      const { data: creativeData, error: creativeError } = await supabase
        .from('criativos')
        .select('url_midia, url_thumbnail, conteudo')
        .eq('id', creativeId)
        .single();

      if (creativeError || !creativeData) throw new Error("Erro ao buscar dados do criativo selecionado.");

      // 2. Atualizar a campanha importada com esses dados visuais
      const { error: updateError } = await supabase
        .from('criativos')
        .update({
          url_midia: creativeData.url_midia,
          url_thumbnail: creativeData.url_thumbnail,
          conteudo: creativeData.conteudo
        })
        .eq('id', campaignId);

      if (updateError) throw new Error("Erro ao associar criativo à campanha.");

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      toast.success('Identidade visual associada à campanha!');
    },
    onError: (err: any) => toast.error(`Erro na associação: ${err.message}`),
  });

  const adicionarInvestimentoManual = useMutation({
    mutationFn: async ({ amount, date, description }: { amount: number; date: Date; description?: string }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('marketing_expenses')
        .insert({
          organization_id: orgId,
          amount,
          expense_date: format(date, 'yyyy-MM-dd'),
          description
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      toast.success('Investimento registrado com sucesso!');
    },
    onError: (err: any) => toast.error(`Erro ao registrar investimento: ${err.message}`),
  });

  const toggleAdSpendInclusion = useMutation({
    mutationFn: async ({ id, included }: { id: string; included: boolean }) => {
      const { data: currentData, error: fetchError } = await supabase
        .from('criativos')
        .select('platform_metrics')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      const updatedMetrics = {
        ...currentData.platform_metrics,
        included_in_dashboard: included
      };

      const { error } = await supabase
        .from('criativos')
        .update({ platform_metrics: updatedMetrics })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_metrics'] });
      toast.success('Cálculo de investimento atualizado.');
    },
    onError: (err: any) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  return {
    criativos: metricsData?.criativos || [],
    manualSpend: metricsData?.manualSpend || 0,
    totalSales: metricsData?.totalSales || 0,
    isLoading,
    createCriativo: createCriativo.mutateAsync,
    atualizarNomeCriativo: atualizarNomeCriativo.mutate,
    atualizarMetricasCriativo: atualizarMetricasCriativo.mutate,
    deletarCriativo: deletarCriativo.mutate,
    associarCriativo: associarCriativo.mutate, 
    adicionarInvestimentoManual: adicionarInvestimentoManual.mutate,
    toggleAdSpendInclusion: toggleAdSpendInclusion.mutate,
  };
}