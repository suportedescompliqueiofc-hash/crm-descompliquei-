import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { startOfDay, endOfDay } from 'date-fns';

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

  const { data: criativos = [], isLoading } = useQuery({
    queryKey: ['criativos', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];

      // Ajuste: Converte o início e fim do dia local para ISO UTC exato
      // Isso evita que registros feitos na "madrugada" local caiam no dia anterior em UTC
      const startDate = dateRange?.from ? startOfDay(dateRange.from).toISOString() : null;
      const endDate = dateRange?.to ? endOfDay(dateRange.to).toISOString() : null;

      // 1. Buscar criativos
      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // 2. Buscar estatísticas detalhadas filtradas por data
      const criativosComStats = await Promise.all(data.map(async (criativo) => {
        // Buscar IDs dos leads originados por este criativo NO PERÍODO SELECIONADO
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
            // Buscar vendas associadas a esses leads
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
    atualizarNomeCriativo: atualizarNomeCriativo.mutate,
    deletarCriativo: deletarCriativo.mutate,
  };
}