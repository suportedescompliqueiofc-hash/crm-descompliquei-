import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Aderencia, ClienteAdocaoItem, ClienteElo, ClienteSerieMes } from './types';

// Mesa de trabalho de um cliente PCA — cadeia dos 8 elos, série histórica,
// checklist de adoção (Camada 0) e aderência ao plano corrente. Toda leitura
// via RPC `cs_*` — nunca query direta em leads/vendas/agendamentos/mensagens.

// Os elos do cliente num mês de referência (mês corrente do plano, em geral).
export function useClienteElos(orgId: string | null | undefined, mes: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-cliente-elos', orgId, mes],
    enabled: !!orgId && !!mes,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ClienteElo[]> => {
      const { data, error } = await (supabase as any).rpc('cs_cliente_elos', {
        p_org_id: orgId,
        p_mes: mes,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r): ClienteElo => ({
        camada: r.camada,
        elo: r.elo,
        valor: r.valor == null ? null : Number(r.valor),
        numerador: r.numerador == null ? null : Number(r.numerador),
        denominador: r.denominador == null ? null : Number(r.denominador),
        amostra_suficiente: !!r.amostra_suficiente,
      }));
    },
  });
}

// Série mês a mês desde o cadastro do cliente, com os 8 elos — ver nota de
// divergência sobre o shape assumido em `types.ts` (ClienteSerieMes).
export function useClienteSerie(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-cliente-serie', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ClienteSerieMes[]> => {
      const { data, error } = await (supabase as any).rpc('cs_cliente_serie', { p_org_id: orgId });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r): ClienteSerieMes => ({
        mes: r.mes,
        camada: r.camada,
        elo: r.elo,
        valor: r.valor == null ? null : Number(r.valor),
        numerador: r.numerador == null ? null : Number(r.numerador),
        denominador: r.denominador == null ? null : Number(r.denominador),
        amostra_suficiente: !!r.amostra_suficiente,
      }));
    },
  });
}

// Checklist da Camada 0 (adoção), item a item.
export function useClienteAdocao(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-cliente-adocao', orgId],
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ClienteAdocaoItem[]> => {
      const { data, error } = await (supabase as any).rpc('cs_cliente_adocao', { p_org_id: orgId });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r): ClienteAdocaoItem => ({
        item: r.item,
        ligado: !!r.ligado,
        evidencia: r.evidencia ?? null,
      }));
    },
  });
}

// Aderência ao plano do período (ex.: mês corrente) — total de passos,
// concluídos, percentual e quebra por semana.
export function useAderencia(orgId: string | null | undefined, periodo: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-aderencia', orgId, periodo],
    enabled: !!orgId && !!periodo,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Aderencia> => {
      const { data, error } = await (supabase as any).rpc('cs_aderencia', {
        p_org_id: orgId,
        p_periodo: periodo,
      });
      if (error) throw error;
      const d = (data ?? {}) as any;
      return {
        total_passos: Number(d.total_passos ?? 0),
        passos_concluidos: Number(d.passos_concluidos ?? 0),
        pct: Number(d.pct ?? 0),
        por_semana: ((d.por_semana ?? []) as any[]).map((s) => ({
          semana: Number(s.semana ?? 0),
          total_passos: Number(s.total_passos ?? s.total ?? 0),
          passos_concluidos: Number(s.passos_concluidos ?? s.concluidos ?? 0),
          pct: Number(s.pct ?? 0),
        })),
      };
    },
  });
}
