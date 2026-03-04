import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';
import { Message } from './useConversations';
import { useEffect } from 'react';

export interface QuickMessage {
  id: string;
  organization_id: string;
  titulo: string;
  conteudo: string | null;
  tipo: 'texto' | 'audio' | 'imagem' | 'video' | 'pdf';
  arquivo_path: string | null;
  criado_em: string;
  folder_id?: string | null;
  position: number;
}

export interface ScheduledMessage {
  id: string;
  lead_id: string;
  quick_message_id: string;
  scheduled_for: string;
  status: 'pending' | 'sent' | 'error';
  created_at: string;
}

export interface SequenceLog {
  id: string;
  quick_message_id: string;
  status: 'pending' | 'sent' | 'error';
  scheduled_for: string;
  batch_id: string;
  folder_id: string;
  mensagens_rapidas: {
    titulo: string;
    tipo: string;
  } | null;
}

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-gleyce';

export function useQuickMessages() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: quickMessages = [], isLoading } = useQuery({
    queryKey: ['quick_messages', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .select('*')
        .eq('organization_id', orgId)
        .order('position', { ascending: true })
        .order('titulo', { ascending: true });

      if (error) throw error;
      return data as QuickMessage[];
    },
    enabled: !!user && !!orgId,
  });

  const createQuickMessage = useMutation({
    mutationFn: async ({ 
      titulo, 
      conteudo, 
      tipo, 
      file,
      folder_id
    }: { 
      titulo: string; 
      conteudo: string; 
      tipo: string; 
      file?: File | null;
      folder_id?: string | null;
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      let arquivo_path = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${orgId}/quick-messages/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-mensagens')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        arquivo_path = filePath;
      }

      let query = supabase
        .from('mensagens_rapidas')
        .select('position')
        .eq('organization_id', orgId)
        .order('position', { ascending: false })
        .limit(1);
        
      if (folder_id) {
        query = query.eq('folder_id', folder_id);
      } else {
        query = query.is('folder_id', null);
      }

      const { data: maxPosData } = await query.single();
      const nextPos = (maxPosData?.position || 0) + 1;

      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .insert([{ 
          titulo, 
          conteudo: conteudo || '', 
          tipo, 
          arquivo_path, 
          organization_id: orgId,
          folder_id: folder_id || null,
          position: nextPos
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
      toast.success('Mensagem rápida criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao criar mensagem: ${error.message}`);
    },
  });

  const updateQuickMessage = useMutation({
    mutationFn: async ({ 
      id,
      titulo, 
      conteudo, 
      tipo, 
      file,
      folder_id
    }: { 
      id: string;
      titulo: string; 
      conteudo: string; 
      tipo: string; 
      file?: File | null;
      folder_id?: string | null;
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      let updates: any = { 
        titulo, 
        conteudo: conteudo || '', 
        tipo, 
        folder_id: folder_id || null 
      };

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${orgId}/quick-messages/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('media-mensagens')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        updates.arquivo_path = filePath;
      }

      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
      toast.success('Mensagem atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error(`Erro ao atualizar mensagem: ${error.message}`);
    },
  });

  const deleteQuickMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('mensagens_rapidas')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
      toast.success('Mensagem excluída.');
    },
    onError: (error: any) => {
      toast.error(`Erro ao excluir: ${error.message}`);
    },
  });

  const sendQuickMessage = useMutation({
    mutationFn: async ({ message, leadId, phone }: { message: QuickMessage; leadId: string; phone: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      let url_midia = null;

      if (message.arquivo_path) {
        const { data } = supabase.storage
          .from('media-mensagens')
          .getPublicUrl(message.arquivo_path);
        
        url_midia = data.publicUrl;
      }

      const payload = {
        lead_id: leadId,
        mensagem: message.conteudo || '',
        tipo: message.tipo,
        url_midia: url_midia,
        titulo_pdf: message.tipo === 'pdf' ? message.titulo : null,
        telefone: phone,
        user_id: user.id,
        remetente: 'bot'
      };

      const response = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar para o webhook.');
      }

      return true;
    },
    onMutate: async ({ message, leadId }) => {
      if (!user) return;
      const queryKey = ['messages_v6', leadId];
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);
      const tempId = `temp-qm-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        lead_id: leadId,
        user_id: user.id,
        conteudo: message.conteudo || '',
        direcao: 'saida',
        remetente: 'bot',
        tipo_conteudo: message.tipo,
        criado_em: new Date().toISOString(),
        media_path: message.arquivo_path,
        id_mensagem: null,
        message_attachments: []
      };
      if (message.arquivo_path) {
        let fileType: 'imagem' | 'video' | 'audio' | 'arquivo' = 'arquivo';
        if (message.tipo === 'imagem') fileType = 'imagem';
        else if (message.tipo === 'video') fileType = 'video';
        else if (message.tipo === 'audio') fileType = 'audio';
        const finalType = message.tipo === 'pdf' ? 'pdf' : fileType;
        optimisticMessage.message_attachments = [{
          id: `att-${tempId}`,
          message_id: tempId,
          file_path: message.arquivo_path,
          file_type: finalType as any
        }];
      }
      queryClient.setQueryData<Message[]>(queryKey, (old) => 
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );
      return { previousMessages };
    },
    onError: (err: any, variables, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages_v6', variables.leadId], context.previousMessages);
      }
      toast.error('Erro no envio.', { description: err.message });
    },
    onSuccess: () => {
      toast.success('Mensagem enviada!');
    },
  });

  const scheduleQuickMessage = useMutation({
    mutationFn: async ({ 
      message, 
      leadId, 
      scheduledFor 
    }: { 
      message: QuickMessage; 
      leadId: string; 
      scheduledFor: string;
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from('scheduled_quick_messages')
        .insert([{
          organization_id: orgId,
          lead_id: leadId,
          quick_message_id: message.id,
          scheduled_for: scheduledFor,
          user_id: user.id,
          status: 'pending'
        }]);

      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      toast.success('Mensagem agendada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['scheduled_messages_log', orgId] });
    },
    onError: (error: any) => {
      toast.error(`Erro ao agendar: ${error.message}`);
    }
  });

  // ENVIO EM SEQUÊNCIA (PASTAS INTEIRAS)
  const sendFolderSequence = useMutation({
    mutationFn: async ({ 
      folderId, 
      leadId, 
      messages, 
      intervalSeconds 
    }: { 
      folderId: string; 
      leadId: string; 
      messages: QuickMessage[]; 
      intervalSeconds: number 
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      const batchId = crypto.randomUUID();
      let currentDelay = 0;

      // Garante a ordem correta baseada no position
      const sortedMessages = [...messages].sort((a, b) => a.position - b.position);

      const inserts = sortedMessages.map(msg => {
        // Incrementa o tempo em segundos
        const scheduledFor = new Date(Date.now() + currentDelay * 1000).toISOString();
        currentDelay += intervalSeconds;
        
        return {
          organization_id: orgId,
          lead_id: leadId,
          quick_message_id: msg.id,
          scheduled_for: scheduledFor,
          user_id: user.id,
          status: 'pending',
          batch_id: batchId,
          folder_id: folderId
        };
      });

      const { error } = await supabase.from('scheduled_quick_messages').insert(inserts);
      if (error) throw error;

      // Dispara a Edge Function imediatamente para lidar com os segundos precisos em plano de fundo
      await supabase.functions.invoke('process-folder-sequence', {
        body: { batchId }
      });

      return true;
    },
    onSuccess: () => {
      toast.success('Envio em sequência iniciado!');
    },
    onError: (err: any) => {
      toast.error(`Erro ao iniciar sequência: ${err.message}`);
    }
  });

  const updateMessagesOrder = useMutation({
    mutationFn: async (updates: { id: string; position: number; folder_id: string | null }[]) => {
      if (!user || !orgId) return;
      const promises = updates.map(update => 
        supabase
          .from('mensagens_rapidas')
          .update({ position: update.position, folder_id: update.folder_id })
          .eq('id', update.id)
      );
      await Promise.all(promises);
    },
    onSuccess: () => {},
    onError: (err: any) => {
      toast.error(`Erro ao salvar ordem das mensagens: ${err.message}`);
      queryClient.invalidateQueries({ queryKey: ['quick_messages', orgId] });
    }
  });

  return {
    quickMessages,
    isLoading,
    createQuickMessage: createQuickMessage.mutate,
    updateQuickMessage: updateQuickMessage.mutate,
    isCreating: createQuickMessage.isPending || updateQuickMessage.isPending,
    deleteQuickMessage: deleteQuickMessage.mutate,
    sendQuickMessage: sendQuickMessage.mutate,
    scheduleQuickMessage: scheduleQuickMessage.mutate,
    sendFolderSequence: sendFolderSequence.mutate,
    isScheduling: scheduleQuickMessage.isPending,
    isSending: sendQuickMessage.isPending,
    isSendingSequence: sendFolderSequence.isPending,
    updateMessagesOrder
  };
}

export function useLeadSequenceLogs(leadId: string | undefined) {
  const queryClient = useQueryClient();

  // Ouve atualizações em tempo real dos envios da sequência para o lead atual
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase
      .channel(`seq_logs_${leadId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'scheduled_quick_messages', filter: `lead_id=eq.${leadId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['sequence_logs', leadId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['sequence_logs', leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from('scheduled_quick_messages')
        .select(`
          id, status, scheduled_for, batch_id, folder_id, quick_message_id,
          mensagens_rapidas (titulo, tipo)
        `)
        .eq('lead_id', leadId)
        .not('batch_id', 'is', null) // Traz apenas as que fazem parte de um lote/sequência
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      return data as SequenceLog[];
    },
    enabled: !!leadId,
  });

  const cancelSequence = useMutation({
    mutationFn: async (batchId: string) => {
      const { error } = await supabase
        .from('scheduled_quick_messages')
        .delete()
        .eq('batch_id', batchId)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence_logs', leadId] });
      toast.success('Envios pendentes cancelados.');
    },
    onError: (err: any) => toast.error(`Erro ao cancelar: ${err.message}`)
  });

  const clearCompletedLogs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('scheduled_quick_messages')
        .delete()
        .eq('lead_id', leadId)
        .not('batch_id', 'is', null)
        .in('status', ['sent', 'error']);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequence_logs', leadId] });
    }
  });

  return { logs, isLoading, cancelSequence: cancelSequence.mutate, clearCompletedLogs: clearCompletedLogs.mutate };
}