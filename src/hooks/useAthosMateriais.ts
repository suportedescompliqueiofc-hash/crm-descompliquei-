import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Materiais/ferramentas comerciais do cliente — construídos com o Athos ou manualmente.
 *
 * Fonte: tabela `meus_materiais` (user-scoped, `user_id = auth.uid()`) — a MESMA que o copiloto
 * Athos (`descompliquei-os`) já popula via a tool `criar_material` e que o antigo "Meus Materiais"
 * lê. Assim a nova área premium mostra o que o Athos cria SEM tocar em nenhuma edge function.
 * O doc de diagnóstico (`categoria = 'diagnostico'`) é excluído — é um doc de sistema à parte.
 */
export interface MeuMaterial {
  id: string;
  titulo: string;
  conteudo: string;
  categoria: string | null;
  criado_manualmente: boolean;
  disponivel_atendimento: boolean;
  /** Material padrão da clínica (ex.: quebra de objeção, script de atendimento) — vale para qualquer mês, distinto do material gerado junto de um plano de ação mensal específico. */
  padrao_clinica: boolean;
  created_at: string;
  updated_at: string;
}
export type MeuMaterialListItem = Omit<MeuMaterial, "conteudo">;

const LIST_COLS = "id, titulo, categoria, criado_manualmente, disponivel_atendimento, padrao_clinica, created_at, updated_at";

export function useAthosMateriais() {
  const { user } = useAuth();
  const userId = user?.id;
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: ["meus-materiais", userId] });

  const list = useQuery({
    queryKey: ["meus-materiais", userId],
    enabled: !!userId,
    queryFn: async (): Promise<MeuMaterialListItem[]> => {
      const { data, error } = await (supabase as any)
        .from("meus_materiais")
        .select(LIST_COLS)
        .eq("user_id", userId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as MeuMaterialListItem[]).filter((m) => m.categoria !== "diagnostico");
    },
  });

  /** Busca o conteúdo completo sob demanda (lazy). */
  async function getConteudo(id: string): Promise<string> {
    const { data, error } = await supabase
      .from("meus_materiais")
      .select("conteudo")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return (data as { conteudo?: string } | null)?.conteudo ?? "";
  }

  const create = useMutation({
    mutationFn: async (input: { titulo: string; conteudo: string; categoria: string; padrao_clinica?: boolean }) => {
      if (!userId) throw new Error("Usuário não encontrado");
      const { data, error } = await (supabase as any)
        .from("meus_materiais")
        .insert({ user_id: userId, titulo: input.titulo, conteudo: input.conteudo, categoria: input.categoria, padrao_clinica: input.padrao_clinica ?? false, criado_manualmente: true })
        .select("id")
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error("Erro ao criar material: " + String(e)),
  });

  const update = useMutation({
    mutationFn: async (input: { id: string; titulo?: string; conteudo?: string; categoria?: string; disponivel_atendimento?: boolean; padrao_clinica?: boolean }) => {
      const { id, ...rest } = input;
      const { error } = await (supabase as any)
        .from("meus_materiais")
        .update({ ...rest, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error("Erro ao salvar material: " + String(e)),
  });

  const toggleAtendimento = useMutation({
    mutationFn: async (input: { id: string; disponivel_atendimento: boolean }) => {
      const { error } = await (supabase as any)
        .from("meus_materiais")
        .update({ disponivel_atendimento: input.disponivel_atendimento })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error("Erro ao atualizar: " + String(e)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("meus_materiais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
    onError: (e: unknown) => toast.error("Erro ao excluir material: " + String(e)),
  });

  return { list, getConteudo, create, update, remove, toggleAtendimento };
}

/** Materiais marcados como disponíveis durante o atendimento (painel da conversa). */
export function useMeusMateriaisAtendimento() {
  const { user } = useAuth();
  const userId = user?.id;
  return useQuery({
    queryKey: ["meus-materiais-atendimento", userId],
    enabled: !!userId,
    queryFn: async (): Promise<(MeuMaterialListItem & { conteudo: string })[]> => {
      const { data, error } = await (supabase as any)
        .from("meus_materiais")
        .select(`${LIST_COLS}, conteudo`)
        .eq("user_id", userId!)
        .eq("disponivel_atendimento", true)
        .order("titulo", { ascending: true });
      if (error) throw error;
      return (data ?? []) as (MeuMaterialListItem & { conteudo: string })[];
    },
  });
}
