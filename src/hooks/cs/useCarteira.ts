import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteCarteira } from './types';

// A carteira PCA inteira, já ordenada pela régua de risco (ordem_fila).
// Única fonte permitida de dado de cliente agregado — nunca leads/vendas/
// agendamentos/mensagens/metas/organizations/perfis direto (ver types.ts).
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
