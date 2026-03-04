import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface ScheduledMessageLog {
  id: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'error';
  error_message: string | null;
  sent_at: string | null;
  leads: {
    nome: string | null;
    telefone: string;
  } | null;
  mensagens_rapidas: {
    titulo: string;
  } | null;
}

export function useScheduledMessages() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: scheduledMessages = [], isLoading } = useQuery({
    queryKey: ['scheduled_messages_log', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      const { data, error } = await supabase
        .from('scheduled_quick_messages')
        .select(`
          id,
          scheduled_for,
          status,
          error_message,
          sent_at,
          leads (nome, telefone),
          mensagens_rapidas (titulo)
        `)
        .eq('organization_id', orgId)
        .is('batch_id', null) // Esconde as mensagens das sequências rápidas
        .order('scheduled_for', { ascending: false });

      if (error) throw error;
      return data as unknown as ScheduledMessageLog[];
    },
    enabled: !!user && !!orgId,
  });

  const deleteScheduledMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scheduled_quick_messages')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduled_messages_log', orgId] });
      toast.success('Agendamento cancelado com sucesso.');
    },
    onError: (err: any) => toast.error(`Erro ao cancelar: ${err.message}`),
  });

  return {
    scheduledMessages,
    isLoading,
    deleteScheduledMessage: deleteScheduledMessage.mutate,
    isDeleting: deleteScheduledMessage.isPending
  };
}