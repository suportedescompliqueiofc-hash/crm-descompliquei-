// API de consulta do Método de CS — funções puras, sem hook, sem rede, sem
// leitura de disco em tempo de execução. Todo o conteúdo é importado como
// módulo ES no bundle (ver README.md desta pasta para a justificativa da
// escolha). Import daqui (`@/content/cs`), não dos arquivos individuais —
// mantém os pontos de import estáveis se o conteúdo for reparticionado.
//
// Uso típico por um agente de tela:
//   import { getMateriaisPorGrupo, getElo, getSemanaDoMes, getRoteiroReuniaoMensal } from '@/content/cs';
//   const materiais = getMateriaisPorGrupo('ticket');
//   const elo = getElo('resgate_lead_frio');
//   const semana2 = getSemanaDoMes(2);
import type {
  Camada,
  CamadaId,
  Elo,
  EloId,
  GrupoMaterialId,
  Material,
  NivelRisco,
  NivelRiscoId,
  Principio,
  SearchEntry,
  SecaoMeta,
  SemanaDoMes,
  SinalRisco,
} from './types';

import { CAMADAS, ELOS, CRITERIO_DE_AGRUPAMENTO, CRITERIO_ELO_RESTRICAO, getElo, getCamada, getElosDaCamada } from './cadeia';
import { PASSOS_DO_DIAGNOSTICO, O_QUE_NUNCA_FAZER_NO_DIAGNOSTICO } from './diagnostico';
import {
  MATERIAIS,
  O_QUE_NAO_VIRA_MATERIAL,
  COMO_O_CLAUDE_PRODUZ_MATERIAL,
  REGRA_DE_ENTREGA,
  PENDENCIA_MATERIAL_GESTAO_EQUIPE,
  getMateriaisPorGrupo,
  getMaterial,
} from './materiais';
import {
  PRINCIPIOS,
  TRES_RITUAIS,
  O_QUE_E_O_SISTEMA,
  POR_QUE_EXISTE,
  REGISTRAR_NAO_E_COMANDO,
  CICLO_MENSAL_FECHADO,
  COMPARECIMENTO_FECHAMENTO_NAO_HA_CEGUEIRA,
} from './principios';
import {
  SEMANAS_DO_MES,
  RITO_DIARIO,
  RITO_SEMANAL,
  SESSAO_TATICA_CALENDARIO,
  CADENCIA_INDIVIDUAL,
  CALENDARIO_DE_FECHAMENTO,
  O_MES_E_DO_CLIENTE_NAO_DA_EMPRESA,
  getSemanaDoMes,
} from './ritos-mes';
import { SINAIS_RISCO, NIVEIS_RISCO, REGRAS_TRANSICAO, ORDENACAO_DA_FILA } from './ritos-risco';
import { ONBOARDING } from './ritos-onboarding';
import { FIM_DE_CICLO } from './ritos-fim-de-ciclo';
import {
  REUNIAO_MENSAL_INTRO,
  PREPARACAO_ANTES_DA_CHAMADA,
  BLOCOS_REUNIAO_MENSAL,
  REGRAS_DURAS_DA_REUNIAO,
  CONVERSAS_DIFICEIS,
} from './ritos-reuniao-mensal';
import { SESSAO_TATICA_GRUPO } from './ritos-sessao-tatica';
import {
  O_QUE_E_UM_PLANO,
  O_QUE_NAO_E_UM_PLANO,
  EVIDENCIA_QUE_MOTIVA_O_RIGOR,
  UM_ELO_POR_PLANO,
  REGRA_PERMANENTE_PLATAFORMA_JA_FAZ,
  ANATOMIA_DO_PLANO,
  ACOES_DO_JOAO,
  PROGRESSAO_DENTRO_DO_MES,
  TESTE_DE_QUALIDADE_DE_UMA_ACAO,
  PARES_ACAO_RUIM_BOA,
  COMO_O_MATERIAL_SE_ACOPLA_AO_PLANO,
  CICLO_DE_VIDA_DO_PLANO,
  MUDANCA_DE_PLANO_NO_MEIO_DO_MES,
} from './plano-de-acao';
import {
  AMOSTRA_DATADA_AVISO,
  IA_PRE_ATENDIMENTO,
  FOLLOW_UP_AUTOMATICO,
  CONFIRMACAO_E_LEMBRETE,
  FUNIL_KANBAN,
  REGISTRO_VENDA_DESFECHO,
  METAS,
  NOTAS_PAGINAS,
  OUTRAS_AUTOMACOES_ENCONTRADAS,
  NUNCA_DECLARAR_ACAO_QUE_JA_EXISTE,
  TRABALHO_HUMANO_LEGITIMO,
  COMPARECIMENTO_E_FECHAMENTO,
  QUEM_ATENDE_O_LEAD,
  DIAGNOSTICO_AUTOMACOES_RANKING_OPORTUNIDADE,
} from './realidade';
import {
  SCHEMA_JORNADAS,
  REGRAS_DE_VISIBILIDADE,
  PROCEDIMENTO_DE_PUBLICACAO,
  QUERY_DE_ADERENCIA,
  LIMITES_DO_MODELO_DE_DADOS,
  PAINEL,
} from './tecnico';

export type {
  Camada,
  CamadaId,
  Elo,
  EloId,
  GrupoMaterialId,
  Material,
  NivelRisco,
  NivelRiscoId,
  Principio,
  SearchEntry,
  SecaoId,
  SecaoMeta,
  SemanaDoMes,
  SinalRisco,
  Ritual,
  TipoMaterial,
  RegraTransicao,
  BlocoReuniao,
  ConversaDificil,
  ParDeAcao,
  ErradoCerto,
} from './types';

export {
  // Fundamentos
  PRINCIPIOS,
  TRES_RITUAIS,
  O_QUE_E_O_SISTEMA,
  POR_QUE_EXISTE,
  REGISTRAR_NAO_E_COMANDO,
  CICLO_MENSAL_FECHADO,
  COMPARECIMENTO_FECHAMENTO_NAO_HA_CEGUEIRA,
  CAMADAS,
  ELOS,
  CRITERIO_DE_AGRUPAMENTO,
  CRITERIO_ELO_RESTRICAO,
  PASSOS_DO_DIAGNOSTICO,
  O_QUE_NUNCA_FAZER_NO_DIAGNOSTICO,
  // Ritos
  SEMANAS_DO_MES,
  RITO_DIARIO,
  RITO_SEMANAL,
  SESSAO_TATICA_CALENDARIO,
  CADENCIA_INDIVIDUAL,
  CALENDARIO_DE_FECHAMENTO,
  O_MES_E_DO_CLIENTE_NAO_DA_EMPRESA,
  SINAIS_RISCO,
  NIVEIS_RISCO,
  REGRAS_TRANSICAO,
  ORDENACAO_DA_FILA,
  ONBOARDING,
  FIM_DE_CICLO,
  REUNIAO_MENSAL_INTRO,
  PREPARACAO_ANTES_DA_CHAMADA,
  BLOCOS_REUNIAO_MENSAL,
  REGRAS_DURAS_DA_REUNIAO,
  CONVERSAS_DIFICEIS,
  SESSAO_TATICA_GRUPO,
  // Artefatos
  MATERIAIS,
  O_QUE_NAO_VIRA_MATERIAL,
  COMO_O_CLAUDE_PRODUZ_MATERIAL,
  REGRA_DE_ENTREGA,
  PENDENCIA_MATERIAL_GESTAO_EQUIPE,
  O_QUE_E_UM_PLANO,
  O_QUE_NAO_E_UM_PLANO,
  EVIDENCIA_QUE_MOTIVA_O_RIGOR,
  UM_ELO_POR_PLANO,
  REGRA_PERMANENTE_PLATAFORMA_JA_FAZ,
  ANATOMIA_DO_PLANO,
  ACOES_DO_JOAO,
  PROGRESSAO_DENTRO_DO_MES,
  TESTE_DE_QUALIDADE_DE_UMA_ACAO,
  PARES_ACAO_RUIM_BOA,
  COMO_O_MATERIAL_SE_ACOPLA_AO_PLANO,
  CICLO_DE_VIDA_DO_PLANO,
  MUDANCA_DE_PLANO_NO_MEIO_DO_MES,
  // A realidade da operação
  AMOSTRA_DATADA_AVISO,
  IA_PRE_ATENDIMENTO,
  FOLLOW_UP_AUTOMATICO,
  CONFIRMACAO_E_LEMBRETE,
  FUNIL_KANBAN,
  REGISTRO_VENDA_DESFECHO,
  METAS,
  NOTAS_PAGINAS,
  OUTRAS_AUTOMACOES_ENCONTRADAS,
  NUNCA_DECLARAR_ACAO_QUE_JA_EXISTE,
  TRABALHO_HUMANO_LEGITIMO,
  COMPARECIMENTO_E_FECHAMENTO,
  QUEM_ATENDE_O_LEAD,
  DIAGNOSTICO_AUTOMACOES_RANKING_OPORTUNIDADE,
  // Técnico
  SCHEMA_JORNADAS,
  REGRAS_DE_VISIBILIDADE,
  PROCEDIMENTO_DE_PUBLICACAO,
  QUERY_DE_ADERENCIA,
  LIMITES_DO_MODELO_DE_DADOS,
  PAINEL,
};

export const SECOES: SecaoMeta[] = [
  { id: 'fundamentos', nome: 'Fundamentos', descricao: 'O que o sistema é, os princípios, os 3 rituais, a cadeia de 8 elos.' },
  { id: 'ritos', nome: 'Ritos', descricao: 'O mês do CS, a régua de risco, onboarding, fim de ciclo, reunião mensal, sessão tática em grupo.' },
  { id: 'artefatos', nome: 'Artefatos', descricao: 'O plano de ação mensal e o catálogo de materiais por elo.' },
  { id: 'realidade', nome: 'A realidade da operação', descricao: 'O que a plataforma já faz, quem atende o lead de fato, onde Comparecimento e Fechamento se medem.' },
  { id: 'tecnico', nome: 'Técnico', descricao: 'Schema de jornadas, regras de publicação do plano, especificação do painel.' },
];

// ---------------------------------------------------------------------------
// API de consulta
// ---------------------------------------------------------------------------

export { getElo, getCamada, getElosDaCamada, getMateriaisPorGrupo, getMaterial, getSemanaDoMes };

export function getPrincipio(id: string): Principio | undefined {
  return PRINCIPIOS.find((p) => p.id.toLowerCase() === id.toLowerCase());
}

export function getSinalRisco(numero: number): SinalRisco | undefined {
  return SINAIS_RISCO.find((s) => s.numero === numero);
}

export function getSinaisRisco(): SinalRisco[] {
  return SINAIS_RISCO;
}

export function getNivelRisco(nivel: NivelRiscoId): NivelRisco | undefined {
  return NIVEIS_RISCO.find((n) => n.nivel === nivel);
}

export function getNiveisRisco(): NivelRisco[] {
  return NIVEIS_RISCO;
}

export function getDiagnostico() {
  return { passos: PASSOS_DO_DIAGNOSTICO, oQueNuncaFazer: O_QUE_NUNCA_FAZER_NO_DIAGNOSTICO };
}

/** O roteiro completo da reunião mensal individual (04-reuniao-mensal.md). */
export function getRoteiroReuniaoMensal() {
  return {
    intro: REUNIAO_MENSAL_INTRO,
    preparacao: PREPARACAO_ANTES_DA_CHAMADA,
    blocos: BLOCOS_REUNIAO_MENSAL,
    regrasDuras: REGRAS_DURAS_DA_REUNIAO,
    conversasDificeis: CONVERSAS_DIFICEIS,
  };
}

export function getSessaoTaticaGrupo() {
  return SESSAO_TATICA_GRUPO;
}

export function getOnboarding() {
  return ONBOARDING;
}

export function getFimDeCiclo() {
  return FIM_DE_CICLO;
}

/** O par de ação ruim/boa do catálogo, para o elo (ou 'instrumentacao'). */
export function getParDeAcao(elo: EloId | 'instrumentacao') {
  return PARES_ACAO_RUIM_BOA.find((p) => p.elo === elo);
}

export function getPlanoDeAcao() {
  return {
    oQueE: O_QUE_E_UM_PLANO,
    oQueNaoE: O_QUE_NAO_E_UM_PLANO,
    evidencia: EVIDENCIA_QUE_MOTIVA_O_RIGOR,
    umEloPorPlano: UM_ELO_POR_PLANO,
    regraPermanente: REGRA_PERMANENTE_PLATAFORMA_JA_FAZ,
    anatomia: ANATOMIA_DO_PLANO,
    acoesDoJoao: ACOES_DO_JOAO,
    progressao: PROGRESSAO_DENTRO_DO_MES,
    testeDeQualidade: TESTE_DE_QUALIDADE_DE_UMA_ACAO,
    pares: PARES_ACAO_RUIM_BOA,
    comoMaterialSeAcopla: COMO_O_MATERIAL_SE_ACOPLA_AO_PLANO,
    cicloDeVida: CICLO_DE_VIDA_DO_PLANO,
    mudancaNoMeioDoMes: MUDANCA_DE_PLANO_NO_MEIO_DO_MES,
  };
}

// ---------------------------------------------------------------------------
// Busca — índice gerado a partir do conteúdo estruturado (não escrito à mão)
// ---------------------------------------------------------------------------

function buildSearchIndex(): SearchEntry[] {
  const entries: SearchEntry[] = [];
  let n = 0;
  const push = (secao: SearchEntry['secao'], documento: string, titulo: string, texto: string) => {
    if (!texto) return;
    entries.push({ id: `s${n++}`, secao, documento, titulo, texto });
  };

  // Fundamentos
  push('fundamentos', 'Como funciona', 'O que é o sistema', O_QUE_E_O_SISTEMA);
  PRINCIPIOS.forEach((p) => push('fundamentos', 'Como funciona', `${p.id} — ${p.titulo}`, p.texto));
  TRES_RITUAIS.forEach((r) => push('fundamentos', 'Como funciona', `${r.comando} — ${r.nome}`, r.descricao));
  CAMADAS.forEach((c) => push('fundamentos', 'A cadeia', `Camada ${c.id} — ${c.nome}`, `${c.naturezaDoTrabalho}. ${c.oQueE}`));
  ELOS.forEach((e) => {
    push('fundamentos', 'A cadeia', `Elo ${e.nome}`, `${e.oQueE} ${e.oQueSignificaEstarQuebrado} Causas típicas: ${e.causasTipicas.join('; ')}.`);
    if (e.leituraComplementar) push('fundamentos', 'A cadeia', `${e.nome} — ${e.leituraComplementar.nome}`, e.leituraComplementar.texto);
  });
  push('fundamentos', 'A cadeia', 'Critério de elo-restrição', CRITERIO_ELO_RESTRICAO.definicao + ' ' + CRITERIO_ELO_RESTRICAO.metodo);
  PASSOS_DO_DIAGNOSTICO.forEach((p) => push('fundamentos', 'Diagnóstico', `Passo ${p.numero} — ${p.titulo}`, p.texto));
  O_QUE_NUNCA_FAZER_NO_DIAGNOSTICO.forEach((t, i) => push('fundamentos', 'Diagnóstico', `Nunca fazer ${i + 1}`, t));

  // Ritos
  SEMANAS_DO_MES.forEach((s) =>
    push('ritos', 'O mês do CS', `Semana ${s.numero} — ${s.titulo}`, `${s.objetivo} ${s.oQueOCsFaz.join(' ')}`),
  );
  push('ritos', 'O mês do CS', 'Rito diário', RITO_DIARIO.passos.join(' '));
  push('ritos', 'O mês do CS', 'Sessão tática — calendário', SESSAO_TATICA_CALENDARIO.comoOTemaEEscolhido);
  SINAIS_RISCO.forEach((s) => push('ritos', 'Régua de risco', `Sinal ${s.numero} — ${s.nome}`, `${s.oQueMede} ${s.comoSeMede} ${s.porQueImporta}`));
  NIVEIS_RISCO.forEach((n2) => push('ritos', 'Régua de risco', `Nível ${n2.nivel}`, `${n2.definicao} ${n2.acaoObrigatoria}`));
  push('ritos', 'Onboarding', 'A tese central', ONBOARDING.tese);
  push('ritos', 'Onboarding', 'Semana 1', ONBOARDING.semana1.objetivo + ' ' + ONBOARDING.semana1.oQueOCsFaz.join(' '));
  push('ritos', 'Onboarding', 'Semana 2', ONBOARDING.semana2.objetivo + ' ' + ONBOARDING.semana2.oQueOClienteFaz.join(' '));
  push('ritos', 'Fim de ciclo', 'Quando começa', `${FIM_DE_CICLO.quandoComeca} ${FIM_DE_CICLO.porQueNao175.join(' ')}`);
  push('ritos', 'Fim de ciclo', 'Prestação de contas', FIM_DE_CICLO.prestacaoDeContas.regraDura);
  BLOCOS_REUNIAO_MENSAL.forEach((b) => push('ritos', 'Reunião mensal', `Bloco ${b.numero} — ${b.titulo}`, `${b.oQueDizer} ${b.oQuePerguntar}`));
  CONVERSAS_DIFICEIS.forEach((c) => push('ritos', 'Reunião mensal', c.caso, c.comoConduzir));
  push('ritos', 'Sessão tática em grupo', 'O que é', SESSAO_TATICA_GRUPO.oQueE);
  push('ritos', 'Sessão tática em grupo', 'Como o tema é escolhido', SESSAO_TATICA_GRUPO.comoOTemaEEscolhido);

  // Artefatos
  push('artefatos', 'Plano de ação', 'O que é um plano', O_QUE_E_UM_PLANO);
  push('artefatos', 'Plano de ação', 'Regra permanente — nunca duplicar a plataforma', REGRA_PERMANENTE_PLATAFORMA_JA_FAZ.citacaoDoCeo);
  PARES_ACAO_RUIM_BOA.forEach((p) => push('artefatos', 'Plano de ação', `Ação ${p.eloNome}`, `Ruim: ${p.ruim} Boa: ${p.boa}`));
  TESTE_DE_QUALIDADE_DE_UMA_ACAO.forEach((t, i) => push('artefatos', 'Plano de ação', `Teste de qualidade ${i + 1}`, t));
  MATERIAIS.forEach((m) => push('artefatos', 'Catálogo de materiais', m.nome, `${m.oQueE} Quando se aplica: ${m.quandoSeAplica}`));

  // Realidade
  push('realidade', 'O que a plataforma já faz', 'IA de pré-atendimento', `${IA_PRE_ATENDIMENTO.oQueE} ${IA_PRE_ATENDIMENTO.limiteDuro}`);
  push('realidade', 'O que a plataforma já faz', 'Follow-up automático', FOLLOW_UP_AUTOMATICO.comoFunciona);
  push('realidade', 'O que a plataforma já faz', 'Confirmação e lembrete', CONFIRMACAO_E_LEMBRETE.oQueNaoExiste);
  NUNCA_DECLARAR_ACAO_QUE_JA_EXISTE.forEach((e) => push('realidade', 'O que a plataforma já faz', 'Errado/certo', `Errado: ${e.errado} Certo: ${e.certo}`));
  push('realidade', 'Comparecimento e Fechamento', 'Veredito', COMPARECIMENTO_E_FECHAMENTO.veredito);
  push('realidade', 'Comparecimento e Fechamento', 'Onde moram', `${COMPARECIMENTO_E_FECHAMENTO.comparecimentoMoraEm} ${COMPARECIMENTO_E_FECHAMENTO.fechamentoMoraEm}`);
  push('realidade', 'Quem atende o lead', 'Veredito', QUEM_ATENDE_O_LEAD.veredito);
  push('realidade', 'Quem atende o lead', 'Implicação para o CS', QUEM_ATENDE_O_LEAD.implicacaoParaOCS);

  // Técnico
  push('tecnico', 'Publicar plano', 'Regras de visibilidade', REGRAS_DE_VISIBILIDADE.rascunhoInvisivel);
  push('tecnico', 'Publicar plano', 'organization_id sempre', REGRAS_DE_VISIBILIDADE.organizationIdSempre);
  LIMITES_DO_MODELO_DE_DADOS.forEach((l, i) => push('tecnico', 'Publicar plano', `Limite ${i + 1}`, l));
  push('tecnico', 'Painel', 'O que é', PAINEL.oQueE);

  return entries;
}

let _searchIndex: SearchEntry[] | null = null;

function getSearchIndex(): SearchEntry[] {
  if (!_searchIndex) _searchIndex = buildSearchIndex();
  return _searchIndex;
}

export interface SearchResult extends SearchEntry {
  /** Trecho do texto ao redor do termo encontrado, para exibir na lista de resultados. */
  trecho: string;
}

/**
 * Busca por substring (case-insensitive, sem acentuação sensível) no
 * conteúdo do método inteiro. Pura — não depende de DOM nem de estado global
 * fora do índice construído uma vez por sessão do bundle.
 */
export function search(query: string, opts: { limit?: number } = {}): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const limit = opts.limit ?? 30;
  const results: SearchResult[] = [];
  for (const entry of getSearchIndex()) {
    const haystack = `${entry.titulo} ${entry.texto}`.toLowerCase();
    const idx = haystack.indexOf(q);
    if (idx === -1) continue;
    const start = Math.max(0, idx - 40);
    const trecho = (start > 0 ? '…' : '') + haystack.slice(start, idx + q.length + 80);
    results.push({ ...entry, trecho });
    if (results.length >= limit) break;
  }
  return results;
}
