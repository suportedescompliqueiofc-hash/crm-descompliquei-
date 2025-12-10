import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { Lead } from './useLeads';

export interface Notification {
  id: string;
  user_id: string;
  lead_id: string;
  mensagem: string;
  status: 'pendente' | 'resolvido';
  criado_em: string;
}

export interface NotificationWithLead extends Notification {
  leads: Pick<Lead, 'id' | 'nome' | 'telefone'> | null;
}

interface UseAllNotificationsProps {
  dateRange?: DateRange;
  leadId?: string | null;
}

export function useAllNotifications({ dateRange, leadId }: UseAllNotificationsProps) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const queryKey = ['all_notifications', orgId, dateRange, leadId];

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user || !orgId) return [];

      // MUDANÇA: Busca notificações baseadas nos leads da organização
      // Primeiro, pegamos todos os IDs de leads da organização (query simplificada)
      const { data: leadsData, error: leadsError } = await supabase
        .from('leads')
        .select('id')
        .eq('organization_id', orgId);
        
      if (leadsError) throw leadsError;
      
      const leadIds = leadsData.map(l => l.id);

      if (leadIds.length === 0) return [];

      let query = supabase
        .from('notificacoes')
        .select(`
          *,
          leads (
            id,
            nome,
            telefone
          )
        `)
        .in('lead_id', leadIds); // Filtra por lista de leads da org

      if (dateRange?.from) {
        query = query.gte('criado_em', format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss'));
      }
      if (dateRange?.to) {
        query = query.lte('criado_em', format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss'));
      }
      if (leadId && leadId !== 'todos') {
        query = query.eq('lead_id', leadId);
      }

      query = query.order('criado_em', { ascending: false });

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }
      
      return data as unknown as NotificationWithLead[];
    },
    enabled: !!user && !!orgId,
  });

  const updateNotificationStatus = useMutation({
    mutationFn: async ({ notificationId, status }: { notificationId: string, status: 'pendente' | 'resolvido' }) => {
      const { error } = await supabase
        .from('notificacoes')
        .update({ status })
        .eq('id', notificationId);
      if (error) throw error;
    },
    onMutate: async ({ notificationId, status }) => {
      // Cancela qualquer refetch pendente para não sobrescrever a atualização otimista
      await queryClient.cancelQueries({ queryKey });

      // Salva o estado anterior
      const previousNotifications = queryClient.getQueryData<NotificationWithLead[]>(queryKey);

      // Atualiza o cache localmente de forma otimista
      if (previousNotifications) {
        queryClient.setQueryData<NotificationWithLead[]>(queryKey, (old) =>
          old?.map(notification =>
            notification.id === notificationId
              ? { ...notification, status }
              : notification
          ) ?? []
        );
      }

      // Retorna o estado anterior para o caso de erro
      return { previousNotifications };
    },
    onError: (err: any, variables, context) => {
      // Se a mutação falhar, reverte para o estado anterior
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      toast.error('Erro ao atualizar notificação:', { description: err.message });
    },
    onSuccess: () => {
      toast.success('Notificação atualizada com sucesso!');
    },
    onSettled: () => {
      // No final (sucesso ou erro), busca os dados mais recentes do servidor para garantir consistência
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notifications,
    isLoading,
    updateStatus: updateNotificationStatus.mutate,
  };
}