import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type {
  AtualizarStatusMaterialInput,
  CSMaterial,
  RegistrarEntregaMaterialInput,
  RegistrarMaterialInput,
} from './types';

// Materiais por cliente (Estratégico → HTML premium + Nota; Operacional → só
// Nota — ver 05-operacoes-e-cs/sistema/03-materiais-por-elo.md, seção 2). Via
// RPC `cs_*` — nunca query direta em `cs_materiais` fora daqui.
//
// REVALIDADO AO VIVO em 2026-07-30 (projeto noncbgdczgcboronmcah) — li
// `pg_get_functiondef` das 5 funções + os CHECK constraints reais de
// `cs_materiais`, testei SELECT com as 7 orgs PCA (`cs_materiais_cliente`
// devolve `[]` para todas, porque a tabela está 100% vazia hoje — inclui
// Dr. Derek Gonçalves e Dr. Jhonatan Dutra, que têm pouquíssimo dado) e
// testei os 3 caminhos de escrita em transação com `ROLLBACK` (INSERT válido
// + status + entrega; INSERT com `analise_previa` vazia; entrega com canal
// inválido) — confirmado por SELECT depois que nenhuma linha de teste
// sobrou. Ver detalhe campo a campo em `types.ts`.

function parseMaterial(r: any): CSMaterial {
  return {
    id: r.id,
    organization_id: r.organization_id,
    titulo: r.titulo,
    elo: r.elo,
    tipo: r.tipo,
    status: r.status,
    jornada_id: r.jornada_id ?? null,
    analise_previa: r.analise_previa ?? null,
    conteudo: r.conteudo ?? null,
    pagina_id: r.pagina_id ?? null,
    entregue_nota: !!r.entregue_nota,
    entregue_nota_em: r.entregue_nota_em ?? null,
    entregue_html: !!r.entregue_html,
    entregue_html_em: r.entregue_html_em ?? null,
    html_referencia: r.html_referencia ?? null,
    canal_entrega: r.canal_entrega,
    criado_em: r.criado_em,
    atualizado_em: r.atualizado_em,
  };
}

// Materiais do cliente, mais recente primeiro (ORDER BY criado_em DESC — já
// vem ordenado do banco).
export function useMateriaisCliente(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-materiais-cliente', orgId],
    enabled: !!orgId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<CSMaterial[]> => {
      const { data, error } = await (supabase as any).rpc('cs_materiais_cliente', {
        p_org_id: orgId,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map(parseMaterial);
    },
  });
}

// Um material por id. Confirmado ao vivo: id inexistente devolve null (zero
// linhas), nunca lança exceção — só o guard de usuário interno lança.
export function useMaterial(id: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-material', id],
    enabled: !!id,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<CSMaterial | null> => {
      const { data, error } = await (supabase as any).rpc('cs_material', { p_id: id });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return parseMaterial(row);
    },
  });
}

/**
 * Erro amigável para quando `analise_previa` vem vazia — traduzido a partir
 * da exceção real do banco (`cs_registrar_material` faz
 * `RAISE EXCEPTION` com essa condição, código Postgres `P0001`, mensagem
 * "analise_previa é obrigatória — ..."). A interface deve tratar este erro
 * mostrando a mensagem abaixo em vez de um toast genérico de falha —
 * confirmado ao vivo: o texto exato que o banco lança hoje é
 * "analise_previa é obrigatória — nenhum material nasce sem antes analisar
 * o atendimento real do cliente (03-materiais-por-elo.md, seção 1)".
 */
export class AnalisePreviaObrigatoriaError extends Error {
  constructor() {
    super(
      'Descreva a análise prévia do atendimento real do cliente antes de registrar o material — nenhum material nasce sem essa análise.',
    );
    this.name = 'AnalisePreviaObrigatoriaError';
  }
}

function isAnalisePreviaError(error: unknown): boolean {
  const msg = (error as any)?.message;
  return typeof msg === 'string' && msg.includes('analise_previa');
}

// Registrar material. Valida `analisePrevia` no cliente ANTES de ir ao banco
// (evita o round-trip no caso mais comum) e, se mesmo assim o banco recusar
// (ex.: string só com espaços — o banco usa `btrim`), traduz a exceção real
// na mesma `AnalisePreviaObrigatoriaError` em vez de deixar vazar o erro
// Postgres cru.
export function useRegistrarMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarMaterialInput): Promise<string> => {
      if (!input.analisePrevia || !input.analisePrevia.trim()) {
        throw new AnalisePreviaObrigatoriaError();
      }
      const { data, error } = await (supabase as any).rpc('cs_registrar_material', {
        p_org_id: input.organizationId,
        p_titulo: input.titulo,
        p_elo: input.elo,
        p_tipo: input.tipo,
        p_analise_previa: input.analisePrevia,
        p_conteudo: input.conteudo ?? null,
        p_jornada_id: input.jornadaId ?? null,
        p_status: input.status ?? 'solicitado',
      });
      if (error) {
        if (isAnalisePreviaError(error)) throw new AnalisePreviaObrigatoriaError();
        throw error;
      }
      // A RPC devolve o uuid escalar da linha criada.
      return data as string;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['cs-materiais-cliente', input.organizationId] });
      qc.invalidateQueries({ queryKey: ['cs-timeline', input.organizationId] });
    },
  });
}

// Atualizar status é otimista — a UI reflete na hora, sem esperar o
// round-trip. Atualiza tanto a lista (`cs-materiais-cliente`, qualquer org
// cacheada) quanto o item isolado (`cs-material`, se estiver aberto).
export function useAtualizarStatusMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: AtualizarStatusMaterialInput): Promise<boolean> => {
      const { data, error } = await (supabase as any).rpc('cs_atualizar_status_material', {
        p_id: id,
        p_status: status,
      });
      if (error) throw error;
      return !!data;
    },
    onMutate: async ({ id, status }: AtualizarStatusMaterialInput) => {
      await qc.cancelQueries({ queryKey: ['cs-materiais-cliente'] });
      await qc.cancelQueries({ queryKey: ['cs-material', id] });
      const snapshotsLista = qc.getQueriesData<CSMaterial[]>({ queryKey: ['cs-materiais-cliente'] });
      const snapshotItem = qc.getQueryData<CSMaterial | null>(['cs-material', id]);
      qc.setQueriesData<CSMaterial[]>({ queryKey: ['cs-materiais-cliente'] }, (old) =>
        old ? old.map((m) => (m.id === id ? { ...m, status } : m)) : old,
      );
      qc.setQueryData<CSMaterial | null>(['cs-material', id], (old) => (old ? { ...old, status } : old));
      return { snapshotsLista, snapshotItem };
    },
    onError: (_err, { id }, ctx) => {
      ctx?.snapshotsLista.forEach(([key, data]) => qc.setQueryData(key, data));
      if (ctx) qc.setQueryData(['cs-material', id], ctx.snapshotItem);
    },
    onSettled: (_data, _err, { id }) => {
      qc.invalidateQueries({ queryKey: ['cs-materiais-cliente'] });
      qc.invalidateQueries({ queryKey: ['cs-material', id] });
    },
  });
}

// Registrar entrega (Nota ou HTML) — marca `entregue` na primeira entrega,
// confirmado ao vivo (a linha volta com `status: 'entregue'` já na primeira
// chamada, `canal_entrega` reflete o canal usado). Invalida também a
// timeline: a entrega muda a `data`/`descricao` da linha de material que já
// existe lá (ver nota em `TimelineEvento`, types.ts) — sem `organizationId`
// disponível aqui, invalida a família inteira de queries de timeline
// (`['cs-timeline']` sem sufixo casa com qualquer org cacheada).
export function useRegistrarEntregaMaterial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarEntregaMaterialInput): Promise<boolean> => {
      const { data, error } = await (supabase as any).rpc('cs_registrar_entrega_material', {
        p_id: input.id,
        p_canal: input.canal,
        p_pagina_id: input.paginaId ?? null,
        p_html_referencia: input.htmlReferencia ?? null,
        p_quando: input.quando ?? new Date().toISOString(),
      });
      if (error) throw error;
      return !!data;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['cs-material', input.id] });
      qc.invalidateQueries({ queryKey: ['cs-materiais-cliente'] });
      qc.invalidateQueries({ queryKey: ['cs-timeline'] });
    },
  });
}
