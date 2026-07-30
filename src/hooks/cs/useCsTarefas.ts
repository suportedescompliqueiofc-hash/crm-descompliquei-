import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { CSTarefa, EditarTarefaInput, NovaTarefaInput, TarefasFiltros } from './types';

// `cs_tarefas` é tabela interna do CS (não é dado de cliente) — consulta
// direta é permitida pelo contrato.

function buildTarefasQuery(filtros: TarefasFiltros) {
  let q = (supabase as any).from('cs_tarefas').select('*');
  if (filtros.semCliente) {
    q = q.is('organization_id', null);
  } else if (filtros.organizationId) {
    q = q.eq('organization_id', filtros.organizationId);
  }
  if (filtros.dono) q = q.eq('dono', filtros.dono);
  if (filtros.concluida !== undefined) q = q.eq('concluida', filtros.concluida);
  if (filtros.origem) q = q.eq('origem', filtros.origem);
  if (filtros.jornadaId) q = q.eq('jornada_id', filtros.jornadaId);
  if (filtros.prazoAte) q = q.lte('prazo', filtros.prazoAte);
  return q
    .order('concluida', { ascending: true })
    .order('prioridade', { ascending: false })
    .order('prazo', { ascending: true, nullsFirst: false });
}

export function useTarefas(filtros: TarefasFiltros = {}) {
  return useQuery({
    queryKey: ['cs-tarefas', filtros],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CSTarefa[]> => {
      const { data, error } = await buildTarefasQuery(filtros);
      if (error) throw error;
      return (data ?? []) as CSTarefa[];
    },
  });
}

// Atualiza a tarefa `id` em toda query cacheada com prefixo ['cs-tarefas'],
// independente do filtro usado para buscá-la (permite otimismo cross-filtro).
function patchTarefaCache(qc: ReturnType<typeof useQueryClient>, id: string, patch: Partial<CSTarefa>) {
  qc.setQueriesData<CSTarefa[]>({ queryKey: ['cs-tarefas'] }, (old) =>
    old ? old.map((t) => (t.id === id ? { ...t, ...patch } : t)) : old
  );
}

export function useCriarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovaTarefaInput): Promise<CSTarefa> => {
      const { data, error } = await (supabase as any)
        .from('cs_tarefas')
        .insert({
          organization_id: input.organizationId ?? null,
          titulo: input.titulo,
          descricao: input.descricao ?? null,
          dono: input.dono,
          origem: input.origem ?? 'manual',
          jornada_id: input.jornadaId ?? null,
          prazo: input.prazo ?? null,
          prioridade: input.prioridade ?? 0,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CSTarefa;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-tarefas'] }),
  });
}

// Concluir é otimista: a UI marca concluída na hora, sem esperar o round-trip.
export function useConcluirTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('cs_tarefas')
        .update({ concluida: true, concluida_em: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ['cs-tarefas'] });
      const snapshots = qc.getQueriesData<CSTarefa[]>({ queryKey: ['cs-tarefas'] });
      patchTarefaCache(qc, id, { concluida: true, concluida_em: new Date().toISOString() });
      return { snapshots };
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['cs-tarefas'] }),
  });
}

export function useReabrirTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('cs_tarefas')
        .update({ concluida: false, concluida_em: null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-tarefas'] }),
  });
}

export function useEditarTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: EditarTarefaInput) => {
      const { error } = await (supabase as any).from('cs_tarefas').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-tarefas'] }),
  });
}

export function useExcluirTarefa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('cs_tarefas').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-tarefas'] }),
  });
}
