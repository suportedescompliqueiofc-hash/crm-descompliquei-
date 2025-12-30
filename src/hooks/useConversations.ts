import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Lead } from './useLeads';
import { useProfile } from './useProfile';
import { Tag } from './useTags';

export interface Attachment {
  id: string;
  message_id: string;
  file_path: string;
  file_type: 'imagem' | 'video' | 'audio' | 'arquivo';
}

export interface Message {
  id: string;
  lead_id: string;
  user_id: string | null;
  conteudo: string;
  direcao: 'entrada' | 'saida';
  remetente: 'lead' | 'agente' | 'bot' | 'agente_crm';
  tipo_conteudo: string;
  criado_em: string;
  media_path: string | null;
  id_mensagem: string | null;
  message_attachments?: Attachment[];
}

export interface Conversation extends Lead {
  last_message_content?: string;
  last_message_timestamp?: string;
  tags: Tag[];
}

// Hook para buscar a lista de conversas
export function useConversationsList() {
  const { user } = useAuth();
  const { profile } = useProfile(); 
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;
  const queryKey = ['conversations', orgId];

  // Mantemos um intervalo de segurança, mas aumentamos o tempo já que temos realtime
  const refetchInterval = 30000; 

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('public:mensagens_list_realtime')
      // Escuta novas mensagens para reordenar a lista e atualizar prévias
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mensagens' }, 
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      // Escuta mudanças nas tags dos leads
      .on( 
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads_tags' },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      // Escuta mudanças nos dados do lead (nome, telefone)
      .on( 
        'postgres_changes',
        { event: '*', schema: 'public', table: 'leads' },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orgId, queryClient, queryKey]);

  return useQuery<Conversation[], Error>({
    queryKey,
    queryFn: async () => {
      if (!orgId) return [];
      
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`
          *,
          leads_tags (
            tags (
              id,
              name,
              color
            )
          )
        `)
        .eq('organization_id', orgId);
        
      if (leadsError) throw leadsError;

      const conversations = await Promise.all(
        leads.map(async (lead: any) => {
          const { data: lastMessage } = await supabase
            .from('mensagens')
            .select('conteudo, criado_em')
            .eq('lead_id', lead.id)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          const tags = lead.leads_tags.map((lt: any) => lt.tags).filter(Boolean);

          return {
            ...lead,
            last_message_content: lastMessage?.conteudo || 'Nenhuma mensagem ainda',
            last_message_timestamp: lastMessage?.criado_em || lead.criado_em,
            tags: tags,
          };
        })
      );

      return conversations.sort((a, b) => 
        new Date(b.last_message_timestamp!).getTime() - new Date(a.last_message_timestamp!).getTime()
      );
    },
    enabled: !!orgId,
    refetchInterval, 
  });
}

// Hook para buscar mensagens (Já estava bom, mas mantive para consistência do arquivo)
export function useMessages(leadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['messages_v6', leadId];

  useEffect(() => {
    if (!leadId || !user) return;

    const channel = supabase
      .channel(`messages_watch_${leadId}`)
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'mensagens', filter: `lead_id=eq.${leadId}` },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .on(
        'postgres_changes', 
        { event: '*', schema: 'public', table: 'message_attachments' },
        () => queryClient.invalidateQueries({ queryKey })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, user, queryClient, queryKey]);

  return useQuery<Message[], Error>({
    queryKey,
    queryFn: async () => {
      if (!leadId || !user) return [];
      
      const { data: rawMessages, error: messagesError } = await supabase
        .from('mensagens')
        .select('id, lead_id, user_id, conteudo, direcao, remetente, tipo_conteudo, criado_em, media_path, id_mensagem')
        .eq('lead_id', leadId)
        .order('criado_em', { ascending: true });
        
      if (messagesError) throw messagesError;
      if (!rawMessages || rawMessages.length === 0) return [];

      const messageIds = rawMessages.map(m => m.id);

      const { data: attachmentsData, error: attachmentsError } = await supabase
        .from('message_attachments')
        .select('*')
        .in('message_id', messageIds);

      if (attachmentsError) throw attachmentsError;

      const attachmentsMap = new Map<string, Attachment[]>();
      if (attachmentsData) {
        for (const attachment of attachmentsData) {
          if (!attachmentsMap.has(attachment.message_id)) {
            attachmentsMap.set(attachment.message_id, []);
          }
          attachmentsMap.get(attachment.message_id)!.push(attachment as Attachment);
        }
      }

      return rawMessages.map(message => ({
        ...message,
        remetente: (message.remetente === 'agente_crm' ? 'agente' : message.remetente) as any,
        message_attachments: attachmentsMap.get(message.id) || [],
      })) as Message[];
    },
    enabled: !!leadId && !!user,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      if (!user) throw new Error('Usuário não autenticado');
      
      const { data: leadData, error: leadError } = await supabase
        .from('leads').select('telefone').eq('id', leadId).single();
      
      if (leadError || !leadData) throw new Error('Lead não encontrado.');

      try {
        const response = await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-vivianebraga', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lead_id: leadId, 
            user_id: user.id,
            conteudo_mensagem: content, 
            telefone: leadData.telefone 
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Falha na comunicação com o WhatsApp: ${errorBody}`);
        }
      } catch (webhookError) {
        console.error('Erro ao enviar webhook:', webhookError);
        throw webhookError;
      }
      
      return null;
    },
    onMutate: async ({ leadId, content }) => {
      if (!user) return;
      const queryKey = ['messages_v6', leadId];
      
      await queryClient.cancelQueries({ queryKey });
      
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);
      
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`, 
        lead_id: leadId, 
        user_id: user.id, 
        conteudo: content,
        direcao: 'saida', 
        remetente: 'agente',
        tipo_conteudo: 'texto', 
        criado_em: new Date().toISOString(),
        media_path: null,
        id_mensagem: null,
        message_attachments: []
      };
      
      queryClient.setQueryData<Message[]>(queryKey, (old) => 
        old ? [...old, optimisticMessage] : [optimisticMessage]
      );
      
      return { previousMessages, queryKey };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(context.queryKey, context.previousMessages);
      }
      toast.error('Erro ao enviar mensagem:', { description: (err as Error).message });
    }
  });
}

export function useSendAudioMessage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, audioBlob }: { leadId: string; audioBlob: Blob }) => {
      if (!user || !profile?.organization_id) throw new Error('Usuário ou Organização não autenticado');

      const timestamp = Date.now();
      const filePath = `${profile.organization_id}/${leadId}/${timestamp}.webm`;
      
      const { error: uploadError } = await supabase.storage
        .from('media-mensagens')
        .upload(filePath, audioBlob, { contentType: 'audio/webm' });

      if (uploadError) throw new Error(`Erro no upload: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from('media-mensagens')
        .getPublicUrl(filePath);

      const { data: leadData } = await supabase
        .from('leads').select('telefone').eq('id', leadId).single();

      if (!leadData) throw new Error('Lead não encontrado');

      const { data: message, error: dbError } = await supabase
        .from('mensagens')
        .insert({
          lead_id: leadId,
          user_id: user.id,
          conteudo: '', 
          direcao: 'saida',
          remetente: 'agente',
          tipo_conteudo: 'audio',
          media_path: filePath 
        })
        .select()
        .single();

      if (dbError) throw dbError;

      await supabase
        .from('message_attachments')
        .insert({
          message_id: message.id,
          file_path: filePath,
          file_type: 'audio'
        });

      try {
        const response = await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-vivianebraga', {
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            lead_id: leadId, 
            user_id: user.id,
            conteudo_mensagem: '', 
            tipo: 'audio',
            url_midia: publicUrl,
            telefone: leadData.telefone 
          }),
        });

        if (!response.ok) {
          throw new Error('Falha ao enviar para o WhatsApp');
        }

        const responseData = await response.json().catch(() => null);
        const whatsappId = responseData?.id || responseData?.id_mensagem || responseData?.key?.id;

        if (whatsappId && message.id) {
          await supabase
            .from('mensagens')
            .update({ id_mensagem: whatsappId })
            .eq('id', message.id);
        }

      } catch (webhookError) {
        console.error('Erro no webhook de áudio:', webhookError);
        toast.error('Áudio salvo, mas houve erro no envio para o WhatsApp.');
      }

      return message;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', leadId] });
      toast.success('Áudio enviado!');
    },
    onError: (err: any) => {
      toast.error('Erro ao processar áudio', { description: err.message });
    }
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, leadId, id_mensagem }: { messageId: string; leadId: string; id_mensagem: string | null }) => {
      if (messageId.startsWith('temp-')) {
        return messageId;
      }
      
      const { data, error } = await supabase.functions.invoke('delete-message', {
        body: { 
          messageId: messageId,
          leadId: leadId,
          id_mensagem: id_mensagem 
        }
      });

      if (error) throw new Error(error.message);
      if (data && data.error) throw new Error(data.error);

      return messageId;
    },
    onMutate: async ({ messageId, leadId }) => {
      const queryKey = ['messages_v6', leadId];
      await queryClient.cancelQueries({ queryKey });

      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);

      if (previousMessages) {
        queryClient.setQueryData<Message[]>(queryKey, (old) =>
          old?.filter((message) => message.id !== messageId) ?? []
        );
      }
      
      return { previousMessages, queryKey };
    },
    onError: (err: any, variables, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(context.queryKey, context.previousMessages);
      }
      toast.error("Erro ao excluir mensagem.", { description: err.message });
    },
    onSuccess: () => {
      toast.success("Mensagem excluída.");
    },
    onSettled: (data, error, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', leadId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}