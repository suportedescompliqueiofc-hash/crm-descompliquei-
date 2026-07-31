import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteCarteira } from './types';

// A carteira PCA inteira, já ordenada pela régua de risco (ordem_fila).
// Única fonte permitida de dado de cliente agregado — nunca leads/vendas/
// agendamentos/mensagens/metas/organizations/perfis direto (ver types.ts).
//
// `dias_sem_contato`: o parse abaixo já tolera tanto `null` quanto um número
// real, então nenhuma mudança de código é necessária quando a função passar
// a derivar o valor de verdade da continuidade (`cs_dias_sem_contato`).
// Conferido ao vivo em 2026-07-30 (projeto noncbgdczgcboronmcah): a
// `cs_carteira()` hoje em produção ainda devolve `NULL::int` hardcoded
// (`WITH final AS (... NULL::int AS dias_sem_contato ...)` na definição da
// função) — o contrato ainda não foi implementado no banco.
export function useCarteira() {
  return useQuery({
    queryKey: ['cs-carteira'],
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ClienteCarteira[]> => {
      const { data, error } = await (supabase as any).rpc('cs_carteira');
      if (error) throw error;
      return ((data ?? []) as any[])
        .map((r): ClienteCarteira => ({
          organization_id: r.organization_id,
          nome: r.nome,
          cliente_desde: r.cliente_desde,
          dias_de_ciclo: Number(r.dias_de_ciclo ?? 0),
          pct_contrato: Number(r.pct_contrato ?? 0),
          camada_0_ok: !!r.camada_0_ok,
          elo_restricao: r.elo_restricao ?? null,
          nivel_risco: r.nivel_risco ?? null,
          aderencia_pct: r.aderencia_pct == null ? null : Number(r.aderencia_pct),
          dias_sem_contato: r.dias_sem_contato == null ? null : Number(r.dias_sem_contato),
          ordem_fila: Number(r.ordem_fila ?? 0),
        }))
        .sort((a, b) => a.ordem_fila - b.ordem_fila);
    },
  });
}
