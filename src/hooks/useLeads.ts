import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { useProfile } from './useProfile';
import { Tag } from './useTags';
import { useEffect } from 'react';

export interface Lead {
  id: string;
  usuario_id: string;
  organization_id?: string;
  nome?: string;
  telefone: string;
  email?: string;
  cpf?: string;
  idade?: number;
  genero?: string;
  endereco?: string;
  queixa_principal?: string;
  procedimento_interesse?: string;
  resumo?: string;
  origem?: string;
  fonte?: string;
  criativo_id?: string; 
  status: string;
  posicao_pipeline: number;
  ultimo_contato?: string;
  criado_em: string;
  atualizado_em: string;
  data_nascimento?: string;
  ia_ativa?: boolean;
  ia_paused_until?: string;
  leads_tags?: { tags: Tag }[];
  agendamento?: string;
}

export function useLeads(dateRange?: DateRange) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  // Realtime Subscription com Injeção Direta de Cache
  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('leads_global_sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads', filter: `organization_id=eq.${orgId}` },
        (payload) => {
          const queryKey = ['leads', orgId, dateRange];
          
          if (payload.eventType === 'INSERT') {
            const newLead = payload.new as Lead;
            queryClient.setQueryData<Lead[]>(queryKey, (old) => {
              const current = old || [];
              if (current.find(l => l.id === newLead.id)) return current;
              return [newLead, ...current];
            });
          } 
          else if (payload.eventType === 'UPDATE') {
            const updatedLead = payload.new as Lead;
            queryClient.setQueryData<Lead[]>(queryKey, (old) => {
              return (old || []).map(lead => lead.id === updatedLead.id ? { ...lead, ...updatedLead } : lead);
            });
            // Atualiza também o cache individual do lead se ele estiver sendo visualizado
            queryClient.setQueryData(['lead', updatedLead.id, orgId], updatedLead);
          }
          else if (payload.eventType === 'DELETE') {
            queryClient.setQueryData<Lead[]>(queryKey, (old) => {
              return (old || []).filter(lead => lead.id !== payload.old.id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient, dateRange]);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ['leads', orgId, dateRange],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      let query = supabase
        .from('leads')
        .select(`
          *,
          leads_tags (
            tags (
              *
            )
          )
        `)
        .eq('organization_id', orgId)
        .order('criado_em', { ascending: false });

      if (dateRange?.from && dateRange?.to) {
        const startDate = format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss');
        const endDate = format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss');
        query = query.or(`and(criado_em.gte.${startDate},criado_em.lte.${endDate}),and(agendamento.gte.${startDate},agendamento.lte.${endDate})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Lead[];
    },
    enabled: !!user && !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache "fresco"
  });

  const createLead = useMutation({
    mutationFn: async (lead: Omit<Lead, 'id' | 'usuario_id' | 'organization_id' | 'criado_em' | 'atualizado_em'>) => {
      if (!user || !orgId) throw new Error("Usuário/Organização não autenticado");
      const { data, error } = await supabase
        .from('leads')
        .insert([{ ...lead, usuario_id: user.id, organization_id: orgId }])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // Injeta imediatamente para o usuário que criou
      queryClient.setQueryData<Lead[]>(['leads', orgId, dateRange], (old) => [data, ...(old || [])]);
      toast.success('Lead criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error(error.code === '23505' ? 'Telefone já cadastrado.' : error.message);
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lead> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async (variables) => {
      const queryKey = ['leads', orgId, dateRange];
      await queryClient.cancelQueries({ queryKey });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKey);
      
      // Atualização Otimista
      queryClient.setQueryData<Lead[]>(queryKey, (old) => {
        return (old || []).map(lead => lead.id === variables.id ? { ...lead, ...variables } : lead);
      });
      
      return { previousLeads };
    },
    onError: (err, variables, context) => {
      if (context?.previousLeads) {
        queryClient.setQueryData(['leads', orgId, dateRange], context.previousLeads);
      }
      toast.error('Erro ao atualizar lead.');
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      const queryKey = ['leads', orgId, dateRange];
      await queryClient.cancelQueries({ queryKey });
      const previousLeads = queryClient.getQueryData<Lead[]>(queryKey);
      queryClient.setQueryData<Lead[]>(queryKey, (old) => (old || []).filter(lead => lead.id !== id));
      return { previousLeads };
    },
  });

  return {
    leads,
    isLoading,
    createLead: createLead.mutate,
    updateLead: updateLead.mutate,
    deleteLead: deleteLead.mutate,
  };
}

export function useLead(leadId: string | null) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId || !orgId) return;

    const channel = supabase
      .channel(`lead_detail_${leadId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'leads', filter: `id=eq.${leadId}` },
        (payload) => {
          queryClient.setQueryData(['lead', leadId, orgId], payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, orgId, queryClient]);

  return useQuery<Lead | null, Error>({
    queryKey: ['lead', leadId, orgId],
    queryFn: async () => {
      if (!leadId || !user || !orgId) return null;
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .eq('organization_id', orgId)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }
      return data;
    },
    enabled: !!leadId && !!user && !!orgId,
  });
}