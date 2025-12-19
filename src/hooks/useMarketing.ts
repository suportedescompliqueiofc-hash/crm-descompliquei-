import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

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
  };
}

export function useMarketing() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: criativos = [], isLoading } = useQuery({
    queryKey: ['criativos', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];

      // 1. Buscar criativos
      const { data, error } = await supabase
        .from('criativos')
        .select('*')
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      // 2. Buscar estatísticas
      const criativosComStats = await Promise.all(data.map(async (criativo) => {
        // Contar leads deste criativo
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('criativo_id', criativo.id);

        // Contar vendas (leads convertidos) deste criativo
        const { count: salesCount } = await supabase
          .from('vendas')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .in('lead_id', (
            await supabase.from('leads').select('id').eq('criativo_id', criativo.id)
          ).data?.map(l => l.id) || []);

        return {
          ...criativo,
          stats: {
            contagem_leads: leadsCount || 0,
            contagem_vendas: salesCount || 0
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