import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ContinuidadeItem, RegistrarContinuidadeInput } from './types';

// Histórico cumulativo de um cliente — nunca sobrescreve; corrigir uma
// entrada anterior vira uma entrada NOVA (princípio P3 do sistema de CS, ver
// 05-operacoes-e-cs/sistema/00-como-funciona.md). Via RPC `cs_*` — nunca
// leads/vendas/agendamentos/mensagens/organizations/perfis direto.
//
// ATENÇÃO: `cs_cliente_continuidade` e `cs_registrar_continuidade` ainda NÃO
// existem no banco (confirmado ao vivo em 2026-07-30, projeto
// noncbgdczgcboronmcah — ver nota de divergência em types.ts). Hooks
// escritos contra o contrato do maestro; NÃO testados. CONFIRMAR campo a
// campo assim que a função existir.
export function useContinuidade(orgId: string | null | undefined, limite: number = 30) {
  return useQuery({
    queryKey: ['cs-continuidade', orgId, limite],
    enabled: !!orgId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<ContinuidadeItem[]> => {
      const { data, error } = await (supabase as any).rpc('cs_cliente_continuidade', {
        p_org_id: orgId,
        p_limite: limite,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(
        (r): ContinuidadeItem => ({
          id: r.id,
          organization_id: r.organization_id,
          data: r.data,
          tipo: r.tipo,
          o_que_aconteceu: r.o_que_aconteceu,
          o_que_ficou_combinado: r.o_que_ficou_combinado ?? null,
          com_quem: r.com_quem ?? null,
          origem: r.origem ?? null,
          reuniao_id: r.reuniao_id ?? null,
        }),
      );
    },
  });
}

// A mutation mais usada do sistema: registrar continuidade é o ato mínimo de
// qualquer sessão de CS. Otimista — a entrada aparece na hora, prefixada em
// todas as queries de continuidade cacheadas para esta org, independente do
// `limite` usado para buscá-las — e invalida a carteira junto, porque
// `dias_sem_contato` é derivado da continuidade (`cs_dias_sem_contato`).
export function useRegistrarContinuidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarContinuidadeInput): Promise<ContinuidadeItem> => {
      const { data, error } = await (supabase as any).rpc('cs_registrar_continuidade', {
        p_org_id: input.organizationId,
        p_tipo: input.tipo,
        p_o_que_aconteceu: input.oQueAconteceu,
        p_o_que_ficou_combinado: input.oQueFicouCombinado ?? null,
        p_com_quem: input.comQuem ?? null,
        p_origem: input.origem ?? null,
        p_reuniao_id: input.reuniaoId ?? null,
      });
      if (error) throw error;
      // A RPC pode devolver a linha criada (record) ou nada (void) —
      // cobrimos os dois casos sem assumir qual das duas será a real.
      const row = Array.isArray(data) ? data[0] : data;
      return {
        id: row?.id ?? `temp-${Date.now()}`,
        organization_id: input.organizationId,
        data: row?.data ?? new Date().toISOString(),
        tipo: input.tipo,
        o_que_aconteceu: input.oQueAconteceu,
        o_que_ficou_combinado: input.oQueFicouCombinado ?? null,
        com_quem: input.comQuem ?? null,
        origem: input.origem ?? null,
        reuniao_id: input.reuniaoId ?? null,
      };
    },
    onMutate: async (input: RegistrarContinuidadeInput) => {
      await qc.cancelQueries({ queryKey: ['cs-continuidade', input.organizationId] });
      const snapshots = qc.getQueriesData<ContinuidadeItem[]>({
        queryKey: ['cs-continuidade', input.organizationId],
      });
      const otimista: ContinuidadeItem = {
        id: `temp-${Date.now()}`,
        organization_id: input.organizationId,
        data: new Date().toISOString(),
        tipo: input.tipo,
        o_que_aconteceu: input.oQueAconteceu,
        o_que_ficou_combinado: input.oQueFicouCombinado ?? null,
        com_quem: input.comQuem ?? null,
        origem: input.origem ?? null,
        reuniao_id: input.reuniaoId ?? null,
      };
      qc.setQueriesData<ContinuidadeItem[]>(
        { queryKey: ['cs-continuidade', input.organizationId] },
        (old) => (old ? [otimista, ...old] : [otimista]),
      );
      return { snapshots };
    },
    onError: (_err, _input, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: (_data, _err, input) => {
      qc.invalidateQueries({ queryKey: ['cs-continuidade', input.organizationId] });
      qc.invalidateQueries({ queryKey: ['cs-carteira'] });
    },
  });
}
