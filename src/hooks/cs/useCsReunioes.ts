import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  CSReuniao,
  NovaReuniaoInput,
  RemarcarReuniaoInput,
  ReunioesFiltros,
  SalvarNotasReuniaoInput,
} from './types';

// `cs_reunioes` é tabela interna do CS (não é dado de cliente) — consulta
// direta é permitida pelo contrato. organization_id null = sessão tática em grupo.

function buildReunioesQuery(filtros: ReunioesFiltros) {
  let q = (supabase as any).from('cs_reunioes').select('*');
  if (filtros.semCliente) {
    q = q.is('organization_id', null);
  } else if (filtros.organizationId) {
    q = q.eq('organization_id', filtros.organizationId);
  }
  if (filtros.tipo) q = q.eq('tipo', filtros.tipo);
  if (filtros.status) q = q.eq('status', filtros.status);
  if (filtros.de) q = q.gte('data_hora', filtros.de);
  if (filtros.ate) q = q.lte('data_hora', filtros.ate);
  return q.order('data_hora', { ascending: true });
}

export function useReunioes(filtros: ReunioesFiltros = {}) {
  return useQuery({
    queryKey: ['cs-reunioes', filtros],
    staleTime: 30 * 1000,
    queryFn: async (): Promise<CSReuniao[]> => {
      const { data, error } = await buildReunioesQuery(filtros);
      if (error) throw error;
      return (data ?? []) as CSReuniao[];
    },
  });
}

export function useAgendarReuniao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NovaReuniaoInput): Promise<CSReuniao> => {
      const { data, error } = await (supabase as any)
        .from('cs_reunioes')
        .insert({
          organization_id: input.organizationId ?? null,
          tipo: input.tipo,
          data_hora: input.dataHora,
          status: 'agendada',
          pauta: input.pauta ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as CSReuniao;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-reunioes'] }),
  });
}

export function useRemarcarReuniao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, dataHora }: RemarcarReuniaoInput) => {
      const { error } = await (supabase as any)
        .from('cs_reunioes')
        .update({ data_hora: dataHora, status: 'agendada' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-reunioes'] }),
  });
}

export function useCancelarReuniao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('cs_reunioes').update({ status: 'cancelada' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-reunioes'] }),
  });
}

export function useMarcarReuniaoRealizada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('cs_reunioes').update({ status: 'realizada' }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-reunioes'] }),
  });
}

export function useSalvarNotasReuniao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, notas }: SalvarNotasReuniaoInput) => {
      const { error } = await (supabase as any).from('cs_reunioes').update({ notas }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cs-reunioes'] }),
  });
}
