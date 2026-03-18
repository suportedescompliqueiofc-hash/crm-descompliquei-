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
  file_type: 'imagem' | 'video' | 'audio' | 'arquivo' | 'pdf';
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
    
    // Otimização Extrema: Injeta a nova mensagem diretamente no cache da lista
    const channel = supabase.channel('conversations-list-sync')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensagens' }, (payload) => {
        const newMessage = payload.new as Message;
        
        queryClient.setQueryData<Conversation[]>(['conversations', orgId], (old) => {
          if (!old) return old;
          
          return old.map(conv => {
            if (conv.id === newMessage.lead_id) {
              return {
                ...conv,
                last_message_content: newMessage.conteudo || 'Mídia recebida',
                last_message_timestamp: newMessage.criado_em,
                last_message_type: newMessage.tipo_conteudo,
                last_message_sender: newMessage.remetente,
              };
            }
            return conv;
          }).sort((a, b) => new Date(b.last_message_timestamp!).getTime() - new Date(a.last_message_timestamp!).getTime());
        });
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
        .select(`
          *,
          leads_tags (
            tags (*)
          ),
          mensagens (
            conteudo,
            criado_em,
            tipo_conteudo,
            remetente
          )
        `)
        .eq('organization_id', orgId)
        .order('criado_em', { foreignTable: 'mensagens', ascending: false })
        .limit(1, { foreignTable: 'mensagens' });

      if (leadsError) {
        console.error("Erro ao buscar conversas:", leadsError);
        throw leadsError;
      }

      // Mapeia os dados recebidos para o formato que a interface precisa
      const conversations = leads.map((lead: any) => {
        const lastMessage = lead.mensagens && lead.mensagens.length > 0 ? lead.mensagens[0] : null;
        const tags = lead.leads_tags?.map((lt: any) => lt.tags).filter(Boolean) || [];
        
        // Remove os nós aninhados originais para manter a memória limpa
        delete lead.mensagens;
        delete lead.leads_tags;
        
        return {
          ...lead,
          last_message_content: lastMessage?.conteudo || 'Nenhuma mensagem ainda',
          last_message_timestamp: lastMessage?.criado_em || lead.criado_em,
          last_message_type: lastMessage?.tipo_conteudo || 'texto',
          last_message_sender: lastMessage?.remetente,
          tags: tags,
        };
      });

      // DESDUPLICAÇÃO INTELIGENTE POR TELEFONE
      // Caso automações tenham criado o mesmo lead várias vezes em milissegundos
      const uniqueMap = new Map<string, Conversation>();
      
      for (const conv of conversations) {
        // Limpa o telefone para garantir que a comparação seja exata
        const phone = (conv.telefone || '').replace(/\D/g, '');
        const existing = uniqueMap.get(phone);
        
        const convTime = new Date(conv.last_message_timestamp || conv.criado_em).getTime();
        const existingTime = existing ? new Date(existing.last_message_timestamp || existing.criado_em).getTime() : 0;
        
        // Se não existir ou se esta conversa for mais RECENTE, substitui a antiga no mapa
        if (!existing || convTime > existingTime) {
          uniqueMap.set(phone, conv);
        }
      }

      const uniqueConversations = Array.from(uniqueMap.values());

      return uniqueConversations.sort((a, b) => new Date(b.last_message_timestamp!).getTime() - new Date(a.last_message_timestamp!).getTime());
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5, // 5 minutos de cache
  });
}

export function useMessages(leadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!leadId) return;

    const channel = supabase.channel(`messages-sync-${leadId}`)
      .on(
        'postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'mensagens', filter: `lead_id=eq.${leadId}` }, 
        (payload) => {
          const newMessage = payload.new as Message;
          
          queryClient.setQueryData<Message[]>(['messages', leadId], (old) => {
            const current = old || [];
            const isOutgoing = newMessage.remetente !== 'lead';
            
            if (isOutgoing) {
              const tempIndex = current.findIndex(m => {
                const isTemp = m.id.startsWith('temp');
                const isTempOutgoing = m.remetente !== 'lead' || m.direcao === 'saida';
                const isSameType = m.tipo_conteudo === newMessage.tipo_conteudo;
                
                if (newMessage.tipo_conteudo === 'texto') {
                  return isTemp && isTempOutgoing && m.conteudo === newMessage.conteudo;
                }
                return isTemp && isTempOutgoing && isSameType;
              });

              if (tempIndex !== -1) {
                const updated = [...current];
                updated[tempIndex] = { 
                  ...newMessage, 
                  message_attachments: updated[tempIndex].message_attachments 
                };
                return updated;
              }
            }

            if (current.some(m => m.id === newMessage.id)) return current;
            return [...current, newMessage];
          });
        }
      )
      .on(
        'postgres_changes', 
        { event: 'DELETE', schema: 'public', table: 'mensagens', filter: `lead_id=eq.${leadId}` }, 
        (payload) => {
          queryClient.setQueryData<Message[]>(['messages', leadId], (old) => 
            (old || []).filter(m => m.id !== payload.old.id)
          );
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'message_attachments' },
        (payload) => {
          const newAttachment = payload.new as Attachment;
          queryClient.setQueryData<Message[]>(['messages', leadId], (old) => {
            if (!old) return old;
            return old.map(m => {
              if (m.id === newAttachment.message_id) {
                const exists = (m.message_attachments || []).some(a => a.id === newAttachment.id);
                if (exists) return m;
                return { ...m, message_attachments: [...(m.message_attachments || []), newAttachment] };
              }
              return m;
            });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  return useQuery<Message[], Error>({
    queryKey: ['messages', leadId],
    queryFn: async () => {
      if (!leadId || !user) return [];
      const { data: rawMessages, error } = await supabase
        .from('mensagens')
        .select('*')
        .eq('lead_id', leadId)
        .order('criado_em', { ascending: true });
      if (error) throw error;
      
      const messageIds = rawMessages.map(m => m.id);
      
      let attachments: any[] = [];
      if (messageIds.length > 0) {
        const { data } = await supabase.from('message_attachments').select('*').in('message_id', messageIds);
        attachments = data || [];
      }
      
      return rawMessages.map(msg => ({
        ...msg,
        message_attachments: attachments?.filter(a => a.message_id === msg.id) || []
      })) as Message[];
    },
    enabled: !!leadId && !!user,
    staleTime: Infinity,
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const { data: insertedMsg, error: insertError } = await supabase
        .from('mensagens')
        .insert({
            lead_id: leadId,
            user_id: user?.id,
            conteudo: content,
            direcao: 'saida',
            remetente: 'agente',
            tipo_conteudo: 'texto'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      
      const response = await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-gleyce', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            lead_id: leadId, 
            user_id: user?.id, 
            conteudo_mensagem: content, 
            telefone: lead?.telefone,
            internal_msg_id: insertedMsg.id 
        }),
      });

      if (!response.ok) throw new Error("Falha ao enviar via WhatsApp");
      return insertedMsg;
    },
    onMutate: async ({ leadId, content }) => {
      const queryKey = ['messages', leadId];
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);

      const optimisticMessage: Message = {
        id: `temp-${Date.now()}`,
        lead_id: leadId,
        user_id: user?.id || null,
        conteudo: content,
        direcao: 'saida',
        remetente: 'agente',
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
        queryClient.setQueryData(['messages', variables.leadId], context.previousMessages);
      }
      toast.error("Erro ao enviar mensagem.");
    },
  });
}

export function useDeleteChat() {
  const queryClient = useQueryClient();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;

  return useMutation({
    mutationFn: async (leadId: string) => {
      const { error } = await supabase
        .from('mensagens')
        .delete()
        .eq('lead_id', leadId);
      
      if (error) throw error;
      return leadId;
    },
    onSuccess: (leadId) => {
      queryClient.invalidateQueries({ queryKey: ['conversations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['messages', leadId] });
      toast.success('Conversa excluída com sucesso.');
    },
    onError: (err: any) => {
      toast.error('Erro ao excluir conversa: ' + err.message);
    }
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ messageId, leadId, id_mensagem }: { messageId: string; leadId: string; id_mensagem: string | null }) => {
      await supabase.functions.invoke('delete-message', { body: { messageId, leadId, id_mensagem } });
      return { messageId, leadId };
    },
    onSuccess: ({ leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages', leadId] });
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
      const filePath = `${profile?.organization_id}/${leadId}/${timestamp}.ogg`;
      
      const { error: uploadError } = await supabase.storage.from('media-mensagens').upload(filePath, audioBlob);
      if (uploadError) throw uploadError;
      
      const { data: insertedMsg, error: insertError } = await supabase
        .from('mensagens')
        .insert({
            lead_id: leadId,
            user_id: user?.id,
            conteudo: '',
            direcao: 'saida',
            remetente: 'agente',
            tipo_conteudo: 'audio',
            media_path: filePath
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await supabase.from('message_attachments').insert({
        message_id: insertedMsg.id,
        file_path: filePath,
        file_type: 'audio'
      });
      
      const { data: { publicUrl } } = supabase.storage.from('media-mensagens').getPublicUrl(filePath);
      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      
      const response = await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-gleyce', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lead_id: leadId, 
          user_id: user?.id, 
          tipo: 'audio', 
          url_midia: publicUrl, 
          telefone: lead?.telefone,
          internal_msg_id: insertedMsg.id
        }),
      });

      if (!response.ok) throw new Error("Falha ao enviar áudio pelo gateway");
      return insertedMsg;
    },
    onMutate: async ({ leadId, audioBlob }) => {
      const queryKey = ['messages', leadId];
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);

      const optimisticMessage: Message = {
        id: `temp-audio-${Date.now()}`,
        lead_id: leadId,
        user_id: user?.id || null,
        conteudo: '',
        direcao: 'saida',
        remetente: 'agente',
        tipo_conteudo: 'audio',
        criado_em: new Date().toISOString(),
        media_path: URL.createObjectURL(audioBlob),
        id_mensagem: null,
        message_attachments: []
      };

      queryClient.setQueryData<Message[]>(queryKey, (old) => [...(old || []), optimisticMessage]);

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.leadId], context.previousMessages);
      }
      toast.error("Erro ao enviar áudio.");
    }
  });
}

export function useSendMediaMessage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, file, type, caption }: { leadId: string; file: File; type: 'imagem' | 'video' | 'pdf'; caption?: string }) => {
      const timestamp = Date.now();
      const fileExt = file.name.split('.').pop();
      const filePath = `${profile?.organization_id}/${leadId}/${timestamp}.${fileExt}`;
      
      // 1. Upload do Arquivo para o Storage
      const { error: uploadError } = await supabase.storage.from('media-mensagens').upload(filePath, file);
      if (uploadError) throw uploadError;
      
      // 2. Criar registro na tabela mensagens
      const { data: insertedMsg, error: insertError } = await supabase
        .from('mensagens')
        .insert({
            lead_id: leadId,
            user_id: user?.id,
            conteudo: caption || '',
            direcao: 'saida',
            remetente: 'agente',
            tipo_conteudo: type,
            media_path: filePath
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // 3. Criar registro na tabela message_attachments
      await supabase.from('message_attachments').insert({
        message_id: insertedMsg.id,
        file_path: filePath,
        file_type: type === 'pdf' ? 'pdf' : type as any
      });
      
      // 4. Disparar Webhook para envio real
      const { data: { publicUrl } } = supabase.storage.from('media-mensagens').getPublicUrl(filePath);
      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      
      const response = await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-gleyce', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          lead_id: leadId, 
          user_id: user?.id, 
          tipo: type, 
          url_midia: publicUrl, 
          telefone: lead?.telefone,
          internal_msg_id: insertedMsg.id,
          conteudo_mensagem: caption || ''
        }),
      });

      if (!response.ok) throw new Error(`Falha ao enviar ${type} pelo gateway`);
      return insertedMsg;
    },
    onMutate: async ({ leadId, file, type, caption }) => {
      const queryKey = ['messages', leadId];
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);

      const optimisticMessage: Message = {
        id: `temp-media-${Date.now()}`,
        lead_id: leadId,
        user_id: user?.id || null,
        conteudo: caption || '',
        direcao: 'saida',
        remetente: 'agente',
        tipo_conteudo: type,
        criado_em: new Date().toISOString(),
        media_path: URL.createObjectURL(file),
        id_mensagem: null,
        message_attachments: []
      };

      queryClient.setQueryData<Message[]>(queryKey, (old) => [...(old || []), optimisticMessage]);

      return { previousMessages };
    },
    onError: (err, variables, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(['messages', variables.leadId], context.previousMessages);
      }
      toast.error(`Erro ao enviar ${variables.type}.`);
    }
  });
}