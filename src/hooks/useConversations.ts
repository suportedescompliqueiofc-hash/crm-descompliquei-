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
  last_message_type?: string;
  last_message_sender?: string;
  tags: Tag[];
}

export function useConversationsList() {
  const { user } = useAuth();
  const { profile } = useProfile(); 
  const queryClient = useQueryClient();
  const orgId = profile?.organization_id;
  const queryKey = ['conversations', orgId];

  useEffect(() => {
    if (!orgId) return;

    const channel = supabase
      .channel('public:list_refresh')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens' }, () => {
        queryClient.invalidateQueries({ queryKey });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId, queryClient, queryKey]);

  return useQuery<Conversation[], Error>({
    queryKey,
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
            // PRIORIDADE: Data da mensagem, FALLBACK: Data de criação do lead
            last_message_timestamp: lastMessage?.criado_em || lead.criado_em,
            last_message_type: lastMessage?.tipo_conteudo || 'texto',
            last_message_sender: lastMessage?.remetente,
            tags: tags,
          };
        })
      );

      return conversations.sort((a, b) => 
        new Date(b.last_message_timestamp!).getTime() - new Date(a.last_message_timestamp!).getTime()
      );
    },
    enabled: !!orgId,
    refetchInterval: 30000, 
  });
}

// Manter as outras funções (useMessages, sendMessage, etc) exatamente como estão
export function useMessages(leadId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['messages_v6', leadId];

  useEffect(() => {
    if (!leadId || !user) return;
    const channel = supabase.channel(`messages_${leadId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mensagens', filter: `lead_id=eq.${leadId}` },
        () => queryClient.invalidateQueries({ queryKey }))
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
  });
}

export function useSendMessage() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ leadId, content }: { leadId: string; content: string }) => {
      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-gleyce', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, user_id: user?.id, conteudo_mensagem: content, telefone: lead?.telefone }),
      });
      return null;
    }
  });
}

export function useSendAudioMessage() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ leadId, audioBlob }: { leadId: string; audioBlob: Blob }) => {
      const filePath = `${profile?.organization_id}/${leadId}/${Date.now()}.webm`;
      await supabase.storage.from('media-mensagens').upload(filePath, audioBlob);
      const { data: { publicUrl } } = supabase.storage.from('media-mensagens').getPublicUrl(filePath);
      const { data: lead } = await supabase.from('leads').select('telefone').eq('id', leadId).single();
      await fetch('https://webhook.orbevision.shop/webhook/mensagens-crm-gleyce', {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id: leadId, user_id: user?.id, tipo: 'audio', url_midia: publicUrl, telefone: lead?.telefone }),
      });
      return null;
    },
    onSuccess: (_, { leadId }) => {
      queryClient.invalidateQueries({ queryKey: ['messages_v6', leadId] });
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