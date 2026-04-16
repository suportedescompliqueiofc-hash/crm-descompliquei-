import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';

export interface Stage {
  id: number;
  nome: string;
  cor: string;
  posicao_ordem: number;
  criado_em: string;
  em_funil?: boolean;
}

// QueryKey padrão - DEVE ser igual em todo o sistema para invalidação funcionar
export const STAGES_QUERY_KEY = ['stages'];

export function useStages() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data: stages = [], isLoading } = useQuery({
    queryKey: STAGES_QUERY_KEY,
    queryFn: async () => {
      if (!user) return [];
      
      let query = supabase
        .from('etapas')
        .select('*');

      if (orgId) {
        query = query.eq('organization_id', orgId);
      } else {
        query = query.is('organization_id', null);
      }

      const { data, error } = await query.order('posicao_ordem', { ascending: true });

      if (error) throw error;
      return data as Stage[];
    },
    enabled: !!user,
    staleTime: 0, // Sem cache - sempre busca dados frescos
  });

  return {
    stages,
    isLoading,
  };
}