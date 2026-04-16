import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from './useProfile';

export function useLeadOptions() {
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  const { data: stages = [] } = useQuery({
    queryKey: ['etapas', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('etapas')
        .select('id, nome')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['fontes', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('fontes')
        .select('id, nome')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data;
    },
    enabled: !!orgId,
  });

  return { stages, sources };
}
