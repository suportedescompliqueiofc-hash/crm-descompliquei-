import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { TimelineEvento, TimelineFiltros } from './types';

// Linha do tempo unificada de um cliente — une continuidade, reuniões,
// materiais, tarefas concluídas, plano publicado, entrada no PCA e primeira
// venda numa única lista ordenada por data (mais recente primeiro). Via RPC
// `cs_cliente_timeline` — nunca query direta nas tabelas de origem
// (cs_continuidade/cs_reunioes/cs_materiais/cs_tarefas/jornadas/
// organizations/vendas) fora daqui.
//
// REVALIDADO AO VIVO em 2026-07-30 (projeto noncbgdczgcboronmcah) — li
// `pg_get_functiondef` da função e testei SELECT com as 7 orgs PCA,
// incluindo Dr. Derek Gonçalves e Dr. Jhonatan Dutra: ambos devolvem eventos
// reais (`cliente_entrou` + `continuidade` da migração), nunca erro, mesmo
// com pouquíssimo dado — a função não tem nenhum caminho de exceção
// dependente de dado, só o guard de usuário interno.
export function useTimelineCliente(orgId: string | null | undefined, filtros: TimelineFiltros = {}) {
  const limite = filtros.limite ?? 100;
  const desde = filtros.desde ?? null;
  return useQuery({
    queryKey: ['cs-timeline', orgId, limite, desde],
    enabled: !!orgId,
    staleTime: 30 * 1000,
    queryFn: async (): Promise<TimelineEvento[]> => {
      const { data, error } = await (supabase as any).rpc('cs_cliente_timeline', {
        p_org_id: orgId,
        p_limite: limite,
        p_desde: desde,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(
        (r): TimelineEvento => ({
          data: r.data,
          tipo: r.tipo,
          titulo: r.titulo,
          descricao: r.descricao ?? null,
          origem: r.origem,
          registro_origem_id: r.registro_origem_id,
        }),
      );
    },
  });
}
