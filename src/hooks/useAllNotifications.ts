import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { DateRange } from 'react-day-picker';
import { format, startOfDay, endOfDay } from 'date-fns';
import { toast } from 'sonner';
import { Lead } from './useLeads';
import { useEffect } from 'react';

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

  // Configuração do Real-time para atualizar o sininho e a lista automaticamente
  useEffect(() => {
    if (!orgId) return;

    // Inscreve-se em mudanças na tabela de notificações
    // O filtro filter: `lead_id=in.(...)` é complexo com RLS, então ouvimos tudo da tabela
    // e confiamos que o Supabase só envia eventos permitidos pelo RLS ou filtramos no client se necessário.
    // Para simplificar e garantir funcionamento, invalidamos a query ao receber qualquer evento na tabela 'notificacoes'.
    const channel = supabase
      .channel('global_notifications_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notificacoes' },
        (payload) => {
          // Opcional: Verificar se o payload pertence à organização (se o backend enviar dados completos)
          // Mas invalidar a query é a forma mais segura de obter os dados atualizados com os joins corretos.
          queryClient.invalidateQueries({ queryKey: ['all_notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient]);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!user || !orgId) return [];

      // MUDANÇA: Removido !inner e filtro redundante de organização.
      // O RLS da tabela 'notificacoes' já deve filtrar apenas as notificações visíveis para o usuário.
      // Usamos um Left Join padrão para trazer os dados do lead.
      let query = supabase
        .from('notificacoes')
        .select(`
          *,
          leads (
            id,
            nome,
            telefone
          )
        `);

      // Filtros de Data
      if (dateRange?.from) {
        query = query.gte('criado_em', format(startOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss'));
      }
      
      if (dateRange?.to) {
        query = query.lte('criado_em', format(endOfDay(dateRange.to), 'yyyy-MM-dd HH:mm:ss'));
      } else if (dateRange?.from && !dateRange.to) {
        // Se tiver apenas data inicial (seleção de um dia), considera até o fim desse dia
        query = query.lte('criado_em', format(endOfDay(dateRange.from), 'yyyy-MM-dd HH:mm:ss'));
      }

      // Filtro de Lead específico
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
      // Cancela qualquer refetch pendente
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

      return { previousNotifications };
    },
    onError: (err: any, variables, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(queryKey, context.previousNotifications);
      }
      toast.error('Erro ao atualizar notificação:', { description: err.message });
    },
    onSuccess: () => {
      toast.success('Notificação atualizada com sucesso!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    notifications,
    isLoading,
    updateStatus: updateNotificationStatus.mutate,
  };
}