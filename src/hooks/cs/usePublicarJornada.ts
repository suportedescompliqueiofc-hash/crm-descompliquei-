import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PublicarJornadaInput } from './types';

// Publica o plano de ação mensal pelo app (cs_publicar_jornada) — hoje esse
// procedimento é SQL manual (05-operacoes-e-cs/sistema/05-publicar-plano.md).
// A jornada já nasce status='ativa' + ativada_em=now(): chamar esta mutation
// É o ato de publicar — a aprovação de conteúdo do João já aconteceu antes,
// em conversa (04-plano-de-acao.md, seção 11 "ciclo de vida do plano"). Só
// passos de dono='cliente' viram `jornada_passos` (é a mesma tabela que a
// tela Jornada da PLATAFORMA REAL do cliente exibe, fora do app de CS); os
// de dono='joao' viram `cs_tarefas` (dono='joao', origem='plano', jornada_id
// preenchido) em vez de aparecerem no checklist do cliente — fecha o loop
// descrito em 04-plano-de-acao.md §5 (a lista diária do João nasce do plano,
// nunca é escrita à mão em paralelo).
//
// DIVERGÊNCIA DECLARADA com a leitura literal de arquitetura-app-cs.md (bloco
// 3 da Ficha do Cliente): a especificação mostra passos de dono João dentro
// do MESMO checklist publicado, com rótulo de dono. Esta função NÃO grava o
// passo do João em `jornada_passos` porque essa tabela é a mesma lida pela
// tela Jornada real do cliente (`useJornada.ts`/`Jornada.tsx`, fora da fatia
// deste squad e da plataforma principal) — gravar ali exporia ações internas
// do João ao cliente de verdade, o oposto do que a própria arquitetura pede
// ("o cliente não deve vê-las"). Se o bloco 3 da Ficha precisa mesmo mostrar
// as ações do João junto do checklist do cliente, a correção correta é UNIR
// `cs_plano_conteudo` com `cs_tarefas(origem='plano')` no client-side (ou numa
// RPC nova) — não gravar o passo do João em `jornada_passos`. Reportado ao
// CEO/maestro para decisão; ver COMMENT completo em `cs_publicar_jornada` no
// banco.
//
// CONFIRMADO AO VIVO (projeto noncbgdczgcboronmcah, 2026-07-31) — testado em
// transação com ROLLBACK usando a organização real do Dr. Derek Gonçalves
// (f1015744-992f-4db5-aac3-566e4cbd8d18), período 2026-09-01, 2 estágios
// (Semana 1 com data_inicio, Semana 2 sem) e 3 passos (2 dono=cliente, 1
// dono=joao, prazoDias=2 na Semana 1 com data_inicio='2026-09-01'). Resultado
// real: jornada criada com status='ativa', tipo='mensal', organization_id
// preenchido, ativada_em não nulo; os 2 passos 'cliente' foram para
// jornada_passos com dono='cliente'; o passo 'joao' virou 1 linha em
// cs_tarefas (dono='joao', origem='plano', jornada_id preenchido,
// prazo='2026-09-03' = data_inicio do estágio + prazoDias do passo).
// Testada também a recusa de duplicata (mesma org+mês com jornada mensal
// ativa já publicada) e as validações de passo sem dono válido e de
// `estagios` vazio — as três lançam exceção com mensagem legível em
// português. SELECT pós-ROLLBACK confirmou zero linhas de teste
// remanescentes (nenhuma jornada/tarefa de teste ficou no banco).
export function usePublicarJornada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PublicarJornadaInput): Promise<string> => {
      const { data, error } = await (supabase as any).rpc('cs_publicar_jornada', {
        p_org_id: input.organizationId,
        p_periodo_ref: input.periodoRef,
        p_titulo: input.titulo ?? null,
        p_elo_alvo: input.eloAlvo,
        p_criterio_sucesso: input.criterioSucesso,
        p_estagios: input.estagios.map((estagio, estagioIndex) => ({
          titulo: estagio.titulo ?? undefined,
          descricao: estagio.descricao ?? undefined,
          ordem: estagio.ordem ?? estagioIndex,
          prazo_dias: estagio.prazoDias ?? undefined,
          data_inicio: estagio.dataInicio ?? undefined,
          passos: estagio.passos.map((passo, passoIndex) => ({
            titulo: passo.titulo,
            descricao: passo.descricao ?? undefined,
            ordem: passo.ordem ?? passoIndex,
            tipo: passo.tipo ?? undefined,
            obrigatorio: passo.obrigatorio ?? undefined,
            prazo_dias: passo.prazoDias ?? undefined,
            dono: passo.dono,
          })),
        })),
      });
      if (error) throw error;
      // A função devolve o uuid escalar da jornada criada.
      return data as string;
    },
    onSuccess: (_jornadaId, input) => {
      // Plano do período recém-publicado, aderência (agora com passos reais
      // para contar), carteira (elo_restricao/aderencia_pct podem mudar) e a
      // linha do tempo (novo evento 'plano_publicado').
      qc.invalidateQueries({ queryKey: ['cs-plano-conteudo', input.organizationId] });
      qc.invalidateQueries({ queryKey: ['cs-aderencia', input.organizationId] });
      qc.invalidateQueries({ queryKey: ['cs-carteira'] });
      qc.invalidateQueries({ queryKey: ['cs-timeline', input.organizationId] });
      // Passos de dono='joao' viram cs_tarefas — invalida a família inteira
      // (['cs-tarefas'] casa com qualquer filtro cacheado), usada tanto pela
      // tela Semana quanto pelo bloco 4 (Tarefas) da Ficha do Cliente.
      qc.invalidateQueries({ queryKey: ['cs-tarefas'] });
    },
  });
}

// Promove um rascunho que JÁ EXISTE no banco (estágios/passos já inseridos,
// tipicamente por mim direto no banco durante uma conversa de CS) para
// status='ativa' — sem recompor nada, ao contrário de usePublicarJornada.
// Espelha a mesma checagem de duplicata e a mesma criação de cs_tarefas para
// passos dono='joao' que cs_publicar_jornada faz, só que a partir de um
// jornada_id em vez de um payload inteiro (RPC cs_promover_jornada_rascunho).
export function usePromoverJornada() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { jornadaId: string; organizationId: string }): Promise<void> => {
      const { error } = await (supabase as any).rpc('cs_promover_jornada_rascunho', {
        p_jornada_id: input.jornadaId,
      });
      if (error) throw error;
    },
    onSuccess: (_void, input) => {
      qc.invalidateQueries({ queryKey: ['cs-plano-conteudo', input.organizationId] });
      qc.invalidateQueries({ queryKey: ['cs-aderencia', input.organizationId] });
      qc.invalidateQueries({ queryKey: ['cs-carteira'] });
      qc.invalidateQueries({ queryKey: ['cs-timeline', input.organizationId] });
      qc.invalidateQueries({ queryKey: ['cs-tarefas'] });
    },
  });
}
