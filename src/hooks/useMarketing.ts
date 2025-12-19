import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface Creative {
  id: string;
  organization_id: string;
  custom_name: string | null;
  title: string | null;
  body: string | null;
  source_url: string | null;
  thumbnail_url: string | null;
  source_platform: string | null;
  source_app: string | null;
  created_at: string;
  stats?: {
    leads_count: number;
    sales_count: number;
    investment?: number; // Futuro: valor investido
  };
}

export function useMarketing() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: creatives = [], isLoading } = useQuery({
    queryKey: ['marketing_creatives', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];

      // 1. Buscar criativos
      const { data, error } = await supabase
        .from('marketing_creatives')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Buscar estatísticas para cada criativo (Leads vinculados e Vendas)
      // Para performance, em produção faríamos via RPC ou View, mas aqui faremos no cliente por enquanto
      const creativesWithStats = await Promise.all(data.map(async (creative) => {
        // Contar leads deste criativo
        const { count: leadsCount } = await supabase
          .from('leads')
          .select('id', { count: 'exact', head: true })
          .eq('creative_id', creative.id);

        // Contar vendas (leads convertidos) deste criativo
        // Assumindo que temos uma etapa de "Contrato Fechado" ou tabela de vendas vinculada ao lead
        // Vamos usar a tabela 'vendas' fazendo join com leads
        const { count: salesCount } = await supabase
          .from('vendas')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', orgId)
          .in('lead_id', (
            await supabase.from('leads').select('id').eq('creative_id', creative.id)
          ).data?.map(l => l.id) || []);

        return {
          ...creative,
          stats: {
            leads_count: leadsCount || 0,
            sales_count: salesCount || 0
          }
        };
      }));

      return creativesWithStats as Creative[];
    },
    enabled: !!user && !!orgId,
  });

  const updateCreativeName = useMutation({
    mutationFn: async ({ id, custom_name }: { id: string; custom_name: string }) => {
      const { error } = await supabase
        .from('marketing_creatives')
        .update({ custom_name })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_creatives', orgId] });
      toast.success('Nome do criativo atualizado!');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  const deleteCreative = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('marketing_creatives')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['marketing_creatives', orgId] });
      toast.success('Criativo excluído com sucesso.');
    },
    onError: (err: any) => toast.error(`Erro: ${err.message}`),
  });

  return {
    creatives,
    isLoading,
    updateCreativeName: updateCreativeName.mutate,
    deleteCreative: deleteCreative.mutate,
  };
}