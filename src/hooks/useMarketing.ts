import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';
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

  const { data: criativos = [], isLoading } = useQuery({
    queryKey: ['criativos', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];

      const startDate = dateRange?.from ? startOfDay(dateRange.from).toISOString() : null;
      const endDate = dateRange?.to 
        ? endOfDay(dateRange.to).toISOString() 
        : (dateRange?.from ? endOfDay(dateRange.from).toISOString() : null);

      // 1. Buscar criativos (Filtrando pela data de criação)
      let query = supabase
        .from('criativos')
        .select('*')
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (startDate && endDate) {
        // Nota: A filtragem de data aqui é sobre a criação do registro no banco.
        // Se quisermos filtrar visualização por data do CSV, faríamos no front, mas o banco traz tudo.
        query = query.gte('criado_em', startDate).lte('criado_em', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;

      // 2. Buscar estatísticas (Leads e Vendas)
      const criativosComStats = await Promise.all(data.map(async (criativo) => {
        let leadsQuery = supabase
          .from('leads')
          .select('id')
          .eq('criativo_id', criativo.id);
        
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

      return criativosComStats as Criativo[];
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
      queryClient.invalidateQueries({ queryKey: ['criativos', orgId] });
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
      queryClient.invalidateQueries({ queryKey: ['criativos', orgId] });
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
      queryClient.invalidateQueries({ queryKey: ['criativos', orgId] });
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
      queryClient.invalidateQueries({ queryKey: ['criativos', orgId] });
      toast.success('Criativo excluído com sucesso.');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  return {
    criativos,
    isLoading,
    createCriativo: createCriativo.mutateAsync, // Expondo como Async para usar await no modal
    atualizarNomeCriativo: atualizarNomeCriativo.mutate,
    atualizarMetricasCriativo: atualizarMetricasCriativo.mutate,
    deletarCriativo: deletarCriativo.mutate,
  };
}