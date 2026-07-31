import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Aderencia, CamadaElo, ClienteAdocaoItem, ClienteElo, ClienteSerieMes, PlanoPasso } from './types';

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
        // `camada` chega como TEXT ('1'/'2'/'3') da RPC — sem essa coerção, a
        // comparação por igualdade estrita em CadeiaElos.tsx (`e.camada ===
        // camada`, contra o number de ORDEM_CAMADA) nunca bate e a cadeia
        // inteira renderiza vazia. Bug real encontrado na revisão de 2026-07-30.
        camada: Number(r.camada) as CamadaElo,
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
        camada: Number(r.camada) as CamadaElo,
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

// Conteúdo real do plano publicado no período — um passo por linha, com o
// estágio a que pertence, já ordenado pelo banco (estagio_ordem, passo_ordem).
// Fonte distinta de useAderencia (que só soma/agrupa): esta é a única forma
// permitida de ler título/descrição de estágio e passo, sem tocar
// jornadas/jornada_estagios/jornada_passos diretamente. Zero linhas = sem
// plano no período (nunca erro).
//
// `jornada_elo_alvo` / `jornada_criterio_sucesso`: RECONFIRMADO ao vivo em
// 2026-07-30 (projeto noncbgdczgcboronmcah, `pg_get_functiondef` direto na
// função) — a função DEVOLVE as duas colunas (migration `20260730130004`).
// Um comentário anterior deste arquivo dizia o contrário ("ainda NÃO foi
// atualizada") com base em uma leitura anterior de `pg_get_functiondef` que
// ficou desatualizada — nunca confiar em comentário de código como fonte da
// verdade sobre o schema; a fonte é sempre a função lida ao vivo. Hoje as
// duas vêm `null` em todos os planos mensais reais (nenhum fechamento
// mensal declarou elo/critério ainda no sistema novo) — é dado real, a tela
// consumidora precisa tratar como lacuna do método, não esconder.
export function usePlanoConteudo(orgId: string | null | undefined, periodo: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-plano-conteudo', orgId, periodo],
    enabled: !!orgId && !!periodo,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<PlanoPasso[]> => {
      const { data, error } = await (supabase as any).rpc('cs_plano_conteudo', {
        p_org_id: orgId,
        p_periodo: periodo,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r): PlanoPasso => ({
        jornada_id: r.jornada_id,
        jornada_titulo: r.jornada_titulo,
        jornada_status: r.jornada_status,
        estagio_id: r.estagio_id,
        estagio_titulo: r.estagio_titulo,
        estagio_ordem: Number(r.estagio_ordem ?? 0),
        passo_id: r.passo_id,
        passo_titulo: r.passo_titulo,
        passo_descricao: r.passo_descricao ?? null,
        passo_ordem: Number(r.passo_ordem ?? 0),
        passo_tipo: r.passo_tipo,
        obrigatorio: !!r.obrigatorio,
        concluido: !!r.concluido,
        concluido_em: r.concluido_em ?? null,
        jornada_elo_alvo: r.jornada_elo_alvo ?? null,
        jornada_criterio_sucesso: r.jornada_criterio_sucesso ?? null,
      }));
    },
  });
}
