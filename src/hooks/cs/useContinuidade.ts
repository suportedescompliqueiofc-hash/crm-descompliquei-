import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ContinuidadeItem, RegistrarContinuidadeInput } from './types';

// Histórico cumulativo de um cliente — nunca sobrescreve; corrigir uma
// entrada anterior vira uma entrada NOVA (princípio P3 do sistema de CS, ver
// 05-operacoes-e-cs/sistema/00-como-funciona.md). Via RPC `cs_*` — nunca
// leads/vendas/agendamentos/mensagens/organizations/perfis direto.
//
// REVALIDADO AO VIVO em 2026-07-30 (projeto noncbgdczgcboronmcah) — nomes de
// campo e de parâmetro conferidos com `pg_get_functiondef` + chamada real
// (SELECT com as 7 orgs PCA migradas; INSERT testado em transação com
// ROLLBACK, confirmado sem sobra por SELECT depois). Ver comentários em
// `types.ts` para o detalhe campo a campo — vários nomes divergiam do que eu
// tinha assumido antes da validação (`data`→`data_evento`,
// `o_que_ficou_combinado`→`ficou_combinado`, `com_quem`→`combinado_com`, sem
// `organization_id` no retorno).
//
// `cs_continuidade` tem trigger que bloqueia UPDATE/DELETE — não existe (nem
// deve existir) hook de editar/apagar entrada de continuidade aqui.
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
          data_evento: r.data_evento,
          tipo: r.tipo,
          o_que_aconteceu: r.o_que_aconteceu,
          ficou_combinado: r.ficou_combinado ?? null,
          combinado_com: r.combinado_com ?? null,
          origem: r.origem ?? null,
          reuniao_id: r.reuniao_id ?? null,
          reuniao_tipo: r.reuniao_tipo ?? null,
          reuniao_data_hora: r.reuniao_data_hora ?? null,
          criada_em: r.criada_em,
        }),
      );
    },
  });
}

// A mutation mais usada do sistema: registrar continuidade é o ato mínimo de
// qualquer sessão de CS. Otimista — a entrada aparece na hora, prefixada em
// todas as queries de continuidade cacheadas para esta org, independente do
// `limite` usado para buscá-las — e invalida a carteira junto, porque
// `dias_sem_contato` é derivado da continuidade (`cs_dias_sem_contato`,
// confirmado ao vivo: `cs_carteira()` agora chama essa função de verdade em
// vez de devolver NULL fixo).
//
// `cs_registrar_continuidade` devolve só o `uuid` da linha criada (não a
// linha inteira) — o item otimista/de retorno é montado no cliente a partir
// do input, o que é seguro porque os únicos campos que o banco poderia
// preencher diferente (defaults) já são resolvidos aqui do lado do cliente
// antes de mandar (`origem` cai em 'registro_manual' se omitido, igual ao
// default do banco).
export function useRegistrarContinuidade() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarContinuidadeInput): Promise<ContinuidadeItem> => {
      const origem = input.origem ?? 'registro_manual';
      const { data, error } = await (supabase as any).rpc('cs_registrar_continuidade', {
        p_org_id: input.organizationId,
        p_data_evento: input.dataEvento,
        p_tipo: input.tipo,
        p_o_que_aconteceu: input.oQueAconteceu,
        p_ficou_combinado: input.ficouCombinado ?? null,
        p_combinado_com: input.combinadoCom ?? null,
        p_origem: origem,
        p_reuniao_id: input.reuniaoId ?? null,
      });
      if (error) throw error;
      // A RPC devolve o uuid escalar da linha criada — não um record.
      const novoId = (data as string | null) ?? `temp-${Date.now()}`;
      return {
        id: novoId,
        data_evento: input.dataEvento,
        tipo: input.tipo,
        o_que_aconteceu: input.oQueAconteceu,
        ficou_combinado: input.ficouCombinado ?? null,
        combinado_com: input.combinadoCom ?? null,
        origem,
        reuniao_id: input.reuniaoId ?? null,
        reuniao_tipo: null,
        reuniao_data_hora: null,
        criada_em: new Date().toISOString(),
      };
    },
    onMutate: async (input: RegistrarContinuidadeInput) => {
      await qc.cancelQueries({ queryKey: ['cs-continuidade', input.organizationId] });
      const snapshots = qc.getQueriesData<ContinuidadeItem[]>({
        queryKey: ['cs-continuidade', input.organizationId],
      });
      const otimista: ContinuidadeItem = {
        id: `temp-${Date.now()}`,
        data_evento: input.dataEvento,
        tipo: input.tipo,
        o_que_aconteceu: input.oQueAconteceu,
        ficou_combinado: input.ficouCombinado ?? null,
        combinado_com: input.combinadoCom ?? null,
        origem: input.origem ?? 'registro_manual',
        reuniao_id: input.reuniaoId ?? null,
        reuniao_tipo: null,
        reuniao_data_hora: null,
        criada_em: new Date().toISOString(),
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
