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
  folder_id?: string | null;
  position: number;
}

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-moncao';

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

      // Get max position in folder
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
        // Mantendo dados de contexto para garantir o envio
        telefone: phone,
        user_id: user.id
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
    onSuccess: () => {
      // Silent success
    },
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
    isSending: sendQuickMessage.isPending,
    updateMessagesOrder
  };
}