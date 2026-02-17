import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useEffect, useMemo } from 'react';
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
  last_message_type?: string;
  last_message_sender?: string;
  tags: Tag[];
}

export function useConversationsList() {
  const { profile } = useProfile(); 
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;

  useEffect(() => {
    if (!orgId) return;
    const channel = supabase.channel(`list_sync_${orgId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, () => {
        // Para a lista lateral, a invalidação ainda é segura pois envolve joins complexos
        queryClient.invalidateQueries({ queryKey: ['conversations', orgId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient]);

  return useQuery<Conversation[], Error>({
    queryKey: ['conversations', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select(`*, leads_tags(tags(*))`)
        .eq('organization_id', orgId);
      if (leadsError) throw leadsError;

      const conversations = await Promise.all(
        leads.map(async (lead: any) => {
          const { data: lastMessage } = await supabase
            .from('mensagens')
            .select('conteudo, criado_em, tipo_conteudo, remetente')
            .eq('lead_id', lead.id)
            .order('criado_em', { ascending: false })
            .limit(1)
            .maybeSingle();
          const tags = lead.leads_tags?.map((lt: any) => lt.tags).filter(Boolean) || [];
          return {
            ...lead,
            last_message_content: lastMessage?.conteudo || 'Nenhuma mensagem ainda',
            last_message_timestamp: lastMessage?.criado_em || lead.criado_em,
            last_message_type: lastMessage?.tipo_conteudo || 'texto',
            last_message_sender: lastMessage?.remetente,
            tags: tags,
          };
        })
      );
      return conversations.sort((a, b) => new Date(b.last_message_timestamp!).getTime() - new Date(a.last_message_timestamp!).getTime());
    },
    enabled: !!orgId,
  });
}

export function useMessages(leadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => ['messages_v6', leadId], [leadId]);

  useEffect(() => {
    if (!leadId || !user) return;
    
    const channel = supabase.channel(`messages_realtime_${leadId}`)
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'mensagens', 
          filter: `lead_id=eq.${leadId}` 
        },
        (payload) => {
          const newMessage = payload.new as Message;
          
          queryClient.setQueryData<Message[]>(queryKey, (old) => {
            const current = old || [];
            
            // Lógica de substituição inteligente:
            // Se já temos uma mensagem temporária com o mesmo conteúdo, removemos a temporária e colocamos a real
            const exists = current.find(m => m.id === newMessage.id);
            if (exists) return current;

            const filtered = current.filter(m => 
                !(m.id.startsWith('temp-') && m.conteudo === newMessage.conteudo)
            );
            
            return [...filtered, newMessage].sort((a, b) => 
                new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
            );
          });
        }
      )
      .on('postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'mensagens', filter: `lead_id=eq.${leadId}` },
        (payload) => {
          queryClient.setQueryData<Message[]>(queryKey, (old) => 
            (old || []).filter(m => m.id !== payload.old.id)
          );
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [leadId, user, queryClient, queryKey]);

  return useQuery<Message[], Error>({
    queryKey,
    queryFn: async () => {
      if (!leadId || !user) return [];
      const { data: rawMessages, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('lead_id', leadId)
        .order('criado_em', { ascending: true });
      if (error) throw error;
      
      const messageIds = rawMessages.map(m => m.id);
      const { data: attachments } = await supabase.from('message_attachments').select('*').in('message_id', messageIds);
      
      return rawMessages.map(msg => ({
        ...msg,
        message_attachments: attachments?.filter(a => a.message_id === msg.id) || []
      })) as Message[];
    },
    enabled: !!leadId && !!user,
    staleTime: 1000 * 30, 
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      const response = await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-gleyce', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, user_id: user?.id, conteudo_mensagem: content, telefone: lead?.telefone }),
      });
      if (!response.ok) throw new Error("Falha ao enviar");
      return null;
    },
    onMutate: async ({ leadId, content }) => {
      const queryKey = ['messages_v6', leadId];
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);
      
      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        lead_id: leadId,
        user_id: user?.id || null,
        conteudo: content,
        direcao: 'saida',
        remetente: 'agente_crm',
        tipo_conteudo: 'texto',
        criado_em: new Date().toISOString(),
        media_path: null,
        id_mensagem: null,
        message_attachments: []
      };
      
      queryClient.setQueryData<Message[]>(queryKey, (old) => [...(old || []), optimisticMessage]);
      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages_v6', variables.leadId], context.previousMessages);
      }
      toast.error('Erro ao enviar mensagem.');
    },
    onSettled: (data, error, variables) => {
      // Pequeno delay para permitir que o Realtime processe antes da invalidação final de segurança
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['messages_v6', variables.leadId] });
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
      }, 500);
    }
  });
}

export function useSendAudioMessage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, audioBlob }: { leadId: string; audioBlob: Blob }) => {
      const timestamp = Date.now();
      const filePath = `${profile?.organization_id}/${leadId}/${timestamp}.webm`;
      const { error: uploadError } = await supabase.storage.from('media-mensagens').upload(filePath, audioBlob);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('media-mensagens').getPublicUrl(filePath);
      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-gleyce', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, user_id: user?.id, tipo: 'audio', url_midia: publicUrl, telefone: lead?.telefone }),
      });
      return null;
    },
    onSettled: (data, error, variables) => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['messages_v6', variables.leadId] });
      }, 500);
    }
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, leadId, id_mensagem }: { messageId: string; leadId: string; id_mensagem: string | null }) => {
      await supabase.functions.invoke('delete-message', { body: { messageId, leadId, id_mensagem } });
      return messageId;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', leadId] });
    }
  });
}