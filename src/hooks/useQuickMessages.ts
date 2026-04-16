import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "./useProfile";
import { toast } from "sonner";
import { Message } from "./useConversations";
import { useEffect } from "react";

export interface QuickMessage {
  id: string;
  organization_id: string;
  titulo: string;
  conteudo: string | null;
  tipo: "texto" | "audio" | "imagem" | "video" | "pdf";
  arquivo_path: string | null;
  criado_em: string;
  folder_id?: string | null;
  position: number;
  delay_seconds: number; // Novo campo
}

export interface SequenceLog {
  id: string;
  quick_message_id: string;
  status: "pending" | "sent" | "error";
  scheduled_for: string;
  batch_id: string;
  folder_id: string;
  mensagens_rapidas: {
    titulo: string;
    tipo: string;
  } | null;
}

const EMPTY_MSGS: QuickMessage[] = [];

export function useQuickMessages() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const orgId = profile?.organization_id;
  const queryClient = useQueryClient();

  const { data: quickMessages = EMPTY_MSGS, isLoading } = useQuery({
    queryKey: ["quick_messages", orgId],
    queryFn: async () => {
      if (!user || !orgId) return [];

      const { data, error } = await supabase
        .from("mensagens_rapidas")
        .select("*")
        .eq("organization_id", orgId)
        .order("position", { ascending: true })
        .order("titulo", { ascending: true });

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
      folder_id,
      delay_seconds,
    }: {
      titulo: string;
      conteudo: string;
      tipo: string;
      file?: File | null;
      folder_id?: string | null;
      delay_seconds: number;
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      let arquivo_path = null;

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${orgId}/quick-messages/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media-mensagens")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        arquivo_path = filePath;
      }

      let query = supabase
        .from("mensagens_rapidas")
        .select("position")
        .eq("organization_id", orgId)
        .order("position", { ascending: false })
        .limit(1);

      if (folder_id && folder_id !== "none") {
        query = query.eq("folder_id", folder_id);
      } else {
        query = query.is("folder_id", null);
      }

      const { data: maxPosData } = await query.maybeSingle();
      const nextPos = (maxPosData?.position || 0) + 1;

      const { data, error } = await supabase
        .from("mensagens_rapidas")
        .insert([
          {
            titulo,
            conteudo: conteudo || "",
            tipo,
            arquivo_path,
            organization_id: orgId,
            folder_id: folder_id === "none" ? null : folder_id,
            position: nextPos,
            delay_seconds,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_messages", orgId] });
      toast.success("Mensagem rápida criada com sucesso!");
    },
  });

  const updateQuickMessage = useMutation({
    mutationFn: async ({
      id,
      titulo,
      conteudo,
      tipo,
      file,
      folder_id,
      delay_seconds,
    }: {
      id: string;
      titulo: string;
      conteudo: string;
      tipo: string;
      file?: File | null;
      folder_id?: string | null;
      delay_seconds: number;
    }) => {
      if (!user || !orgId) throw new Error("Usuário não autenticado");

      let updates: any = {
        titulo,
        conteudo: conteudo || "",
        tipo,
        folder_id: folder_id === "none" ? null : folder_id,
        delay_seconds,
      };

      if (file) {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${orgId}/quick-messages/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("media-mensagens")
          .upload(filePath, file);

        if (uploadError) throw uploadError;
        updates.arquivo_path = filePath;
      }

      const { data, error } = await supabase
        .from("mensagens_rapidas")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_messages", orgId] });
      toast.success("Mensagem atualizada!");
    },
  });

  const deleteQuickMessage = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("mensagens_rapidas")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quick_messages", orgId] });
      toast.success("Mensagem excluída.");
    },
  });

  const sendQuickMessage = useMutation({
    mutationFn: async ({
      message,
      leadId,
      phone,
    }: {
      message: QuickMessage;
      leadId: string;
      phone: string;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");

      let url_midia: string | null = null;
      if (message.arquivo_path) {
        const { data } = supabase.storage
          .from("media-mensagens")
          .getPublicUrl(message.arquivo_path);
        url_midia = data.publicUrl;
      }

      const payload = {
        lead_id: leadId,
        mensagem: message.conteudo || "",
        tipo: message.tipo,
        url_midia,
        titulo_pdf: message.tipo === "pdf" ? message.titulo : null,
        telefone: phone,
        user_id: user.id,
        remetente: "bot",
      };

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke(
        "send-quick-message",
        {
          body: payload,
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        },
      );

      if (error) {
        console.error("[sendQuickMessage] Erro na função:", error);
        throw new Error("Falha ao enviar: " + error.message);
      }
      return { leadId, payload };
    },
    onMutate: async ({ message, leadId }) => {
      const queryKey = ["messages", leadId];
      await queryClient.cancelQueries({ queryKey });
      const previousMessages = queryClient.getQueryData<Message[]>(queryKey);

      const url_midia = message.arquivo_path
        ? supabase.storage
            .from("media-mensagens")
            .getPublicUrl(message.arquivo_path).data.publicUrl
        : null;

      const optimisticMessage: Message = {
        id: `temp-quick-${Date.now()}`,
        lead_id: leadId,
        user_id: user?.id || null,
        conteudo: message.conteudo || "",
        direcao: "saida",
        remetente: "bot",
        tipo_conteudo: message.tipo || "texto",
        criado_em: new Date().toISOString(),
        media_path: url_midia,
        id_mensagem: null,
        message_attachments: [],
      };

      queryClient.setQueryData<Message[]>(queryKey, (old) => [
        ...(old || []),
        optimisticMessage,
      ]);
      return { previousMessages };
    },
    onSuccess: () => toast.success("Mensagem enviada!"),
    onError: (error: any, variables, context: any) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", variables.leadId],
          context.previousMessages,
        );
      }
      toast.error(
        "Erro ao enviar mensagem: " + (error?.message || "Tente novamente."),
      );
    },
  });

  const scheduleQuickMessage = useMutation({
    mutationFn: async ({
      message,
      leadId,
      scheduledFor,
    }: {
      message: QuickMessage;
      leadId: string;
      scheduledFor: string;
    }) => {
      if (!user || !orgId) throw new Error("Sessão inválida");

      const { error } = await supabase.from("scheduled_quick_messages").insert([
        {
          organization_id: orgId,
          lead_id: leadId,
          quick_message_id: message.id,
          scheduled_for: scheduledFor,
          user_id: user.id,
          status: "pending",
        },
      ]);

      if (error) throw error;
      return true;
    },
    onSuccess: () => toast.success("Mensagem agendada!"),
  });

  // ENVIO EM SEQUÊNCIA (COM DELAYS INDIVIDUAIS)
  const sendFolderSequence = useMutation({
    mutationFn: async ({
      folderId,
      leadId,
      messages,
    }: {
      folderId: string;
      leadId: string;
      messages: QuickMessage[];
    }) => {
      if (!user || !orgId) throw new Error("Não autenticado");

      const batchId = crypto.randomUUID();
      let accumulatedDelay = 0;

      // Ordena as mensagens pela posição definida no CRM
      const sortedMessages = [...messages].sort(
        (a, b) => a.position - b.position,
      );

      const inserts = sortedMessages.map((msg, index) => {
        // Removemos o buffer artificial: o tempo exato garante que
        // a primeira mensagem seja <= Date.now() e capturada imediatamente
        const scheduledFor = new Date(
          Date.now() + (accumulatedDelay * 1000),
        ).toISOString();

        // O delay desta mensagem será aplicado para a PRÓXIMA mensagem
        const delay = msg.delay_seconds || 5;
        accumulatedDelay += delay;

        return {
          organization_id: orgId,
          lead_id: leadId,
          quick_message_id: msg.id,
          scheduled_for: scheduledFor,
          user_id: user.id,
          status: "pending",
          batch_id: batchId,
          folder_id: folderId,
        };
      });

      const { error } = await supabase
        .from("scheduled_quick_messages")
        .insert(inserts);
      if (error) throw error;

      // Disparamos o script cron imediatamente para forçar o processamento
      // da primeira mensagem (que está agendada para Date.now() ou passado).
      // As próximas serão capturadas pelas invocações deste mesmo script a cada minuto
      // caso já tenham ultrapassado seu delay.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      supabase.functions
        .invoke("process-folder-sequence", {
          body: { batchId },
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
        })
        .catch((err) =>
          console.error("[sendFolderSequence] Erro na Edge Function:", err),
        );

      return true;
    },
    onSuccess: () => toast.success("Sequência de mensagens iniciada!"),
  });

  const updateMessagesOrder = useMutation({
    mutationFn: async (
      updates: { id: string; position: number; folder_id: string | null }[],
    ) => {
      const promises = updates.map((update) =>
        supabase
          .from("mensagens_rapidas")
          .update({ position: update.position, folder_id: update.folder_id })
          .eq("id", update.id),
      );
      await Promise.all(promises);
    },
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
    isSendingSequence: sendFolderSequence.isPending,
    updateMessagesOrder,
  };
}

export function useLeadSequenceLogs(leadId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!leadId) return;
    const channel = supabase
      .channel(`seq_logs_${leadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "scheduled_quick_messages",
          filter: `lead_id=eq.${leadId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["sequence_logs", leadId],
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [leadId, queryClient]);

  const { data: logs = [] } = useQuery({
    queryKey: ["sequence_logs", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      const { data, error } = await supabase
        .from("scheduled_quick_messages")
        .select(
          `
          id, 
          status, 
          scheduled_for, 
          batch_id, 
          folder_id, 
          quick_message_id, 
          mensagens_rapidas (titulo, tipo)
        `,
        )
        .eq("lead_id", leadId)
        .not("batch_id", "is", null)
        .order("scheduled_for", { ascending: true });
      if (error) throw error;
      return data as SequenceLog[];
    },
    enabled: !!leadId,
  });

  const cancelSequence = useMutation({
    mutationFn: async (batchId: string) => {
      await supabase
        .from("scheduled_quick_messages")
        .delete()
        .eq("batch_id", batchId)
        .eq("status", "pending");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequence_logs", leadId] });
      toast.success("Cancelado.");
    },
  });

  const clearCompletedLogs = useMutation({
    mutationFn: async () => {
      await supabase
        .from("scheduled_quick_messages")
        .delete()
        .eq("lead_id", leadId)
        .not("batch_id", "is", null)
        .in("status", ["sent", "error"]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sequence_logs", leadId] });
    },
  });

  return {
    logs,
    cancelSequence: cancelSequence.mutate,
    clearCompletedLogs: clearCompletedLogs.mutate,
  };
}
