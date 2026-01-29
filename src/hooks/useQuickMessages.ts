import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from './useProfile';
import { toast } from 'sonner';

export interface QuickMessage {
  id: string;
  organization_id: string;
  titulo: string;
  conteudo: string | null;
  tipo: 'texto' | 'audio' | 'imagem' | 'video' | 'pdf';
  arquivo_path: string | null;
  criado_em: string;
}

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-moncao';

export function useQuickMessages() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  // Buscar mensagens
  const { data: quickMessages = [], isLoading } = useQuery({
    queryKey: ['quick_messages', orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];
      
      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .select('*')
        .eq('organization_id', orgId)
        .order('titulo', { ascending: true });

      if (error) throw error;
      return data as QuickMessage[];
    },
    enabled: !!user && !!orgId,
  });

  // Criar mensagem
  const createQuickMessage = useMutation({
    mutationFn: async ({ 
      titulo, 
      conteudo, 
      tipo, 
      file 
    }: { 
      titulo: string; 
      conteudo: string; 
      tipo: string; 
      file?: File | null 
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      let arquivo_path = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${orgId}/quick-messages/${fileName}`;

        // Usa o bucket 'media-mensagens' (ou outro existente)
        const { error: uploadError } = await supabase.storage
          .from('media-mensagens')
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        arquivo_path = filePath;
      }

      const { data, error } = await supabase
        .from('mensagens_rapidas')
        .insert([{ 
          titulo, 
          conteudo: conteudo || '', 
          tipo, 
          arquivo_path, 
          organization_id: orgId 
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

  // Deletar mensagem
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

  // Enviar mensagem (Disparar Webhook)
  const sendQuickMessage = useMutation({
    mutationFn: async ({ message, leadId, phone }: { message: QuickMessage; leadId: string; phone: string }) => {
      if (!user) throw new Error("Usuário não autenticado");

      let url_midia = null;

      // Se tiver arquivo, gerar URL assinada ou pública para o webhook baixar
      if (message.arquivo_path) {
        const { data } = supabase.storage
          .from('media-mensagens')
          .getPublicUrl(message.arquivo_path);
        
        url_midia = data.publicUrl;
      }

      const payload = {
        lead_id: leadId,
        user_id: user.id,
        telefone: phone, // Passar telefone para facilitar no n8n
        tipo: message.tipo,
        conteudo: message.conteudo,
        url_midia: url_midia,
        titulo_botao: message.titulo // Útil para log
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
    onSuccess: () => {
      toast.success('Mensagem enviada!');
    },
    onError: (err: any) => {
      toast.error('Erro no envio.', { description: err.message });
    }
  });

  return {
    quickMessages,
    isLoading,
    createQuickMessage: createQuickMessage.mutate,
    isCreating: createQuickMessage.isPending,
    deleteQuickMessage: deleteQuickMessage.mutate,
    sendQuickMessage: sendQuickMessage.mutate,
    isSending: sendQuickMessage.isPending
  };
}