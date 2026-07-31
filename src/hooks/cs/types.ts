// ═══════════════════════════════════════════════════════════════════════════
// Tipos da camada de dados do app de CS — Descompliquei.
//
// Contrato acordado com o Executor de Dados (que cria tabelas/RPCs em paralelo,
// 2026-07-30). Modelo de referência dos elos: 8 elos em 4 camadas — ver
// `05-operacoes-e-cs/sistema/proposta-novos-elos.md`.
//
// REGRA DE SEGURANÇA: dado de CLIENTE (leads, vendas, agendamentos, mensagens,
// metas, organizations, perfis) só chega aqui via as funções RPC `cs_*` abaixo.
// As tabelas `cs_tarefas` / `cs_reunioes` / `cs_aderencia_snapshot` são tabelas
// do próprio CS (não de cliente) — consulta direta a elas é permitida.
// ═══════════════════════════════════════════════════════════════════════════

// ─── Enums / literais ───────────────────────────────────────────────────────

export type DonoTarefa = 'joao' | 'claude';
export type OrigemTarefa = 'plano' | 'manual' | 'sistema';
export type TipoReuniao = 'kickoff' | 'semanal' | 'mensal' | 'sob_demanda' | 'tatica_grupo';
export type StatusReuniao = 'agendada' | 'realizada' | 'cancelada';

export type CamadaElo = 0 | 1 | 2 | 3;

/**
 * Os 8 elos propostos (ver proposta-novos-elos.md, seção 10) — union
 * ILUSTRATIVA em snake_case para leitura rápida do modelo, não o formato
 * literal que trafega em runtime. As RPCs (`cs_cliente_elos`,
 * `cs_cliente_serie`, `cs_carteira.elo_restricao`) devolvem o nome do elo em
 * Title Case PT-BR ("Demanda", "Resgate de Lead Frio", "Ciclo de Venda"...) —
 * ver as chaves de `ELO_META`/`ELO_CAMADA` em `src/components/cs/eloMeta.ts`,
 * a fonte que de fato bate com o dado real. Confundir os dois formatos foi a
 * causa de um bug real corrigido na revisão de 2026-07-30 (a cadeia de elos
 * da Ficha do Cliente renderizava vazia).
 */
export type NomeElo =
  | 'demanda'
  | 'agendamento'
  | 'resgate_lead_frio'
  | 'comparecimento'
  | 'fechamento'
  | 'ticket'
  | 'ciclo_venda'
  | 'recompra';

// ─── Tabelas internas do CS (consulta direta permitida) ────────────────────

export interface CSTarefa {
  id: string;
  organization_id: string | null;
  titulo: string;
  descricao: string | null;
  dono: DonoTarefa;
  origem: OrigemTarefa;
  jornada_id: string | null;
  prazo: string | null; // date (YYYY-MM-DD)
  prioridade: number;
  concluida: boolean;
  concluida_em: string | null;
  criada_por: string | null;
  criada_em: string;
}

export interface CSReuniao {
  id: string;
  organization_id: string | null; // null = sessão tática em grupo
  tipo: TipoReuniao;
  data_hora: string; // timestamptz ISO
  status: StatusReuniao;
  pauta: string | null;
  notas: string | null;
}

export interface AderenciaPorSemana {
  semana: number;
  total_passos: number;
  passos_concluidos: number;
  pct: number;
}

/** Espelha a tabela `cs_aderencia_snapshot` — congelada no fechamento mensal. */
export interface CSAderenciaSnapshot {
  id: string;
  organization_id: string;
  periodo_ref: string;
  jornada_id: string | null;
  total_passos: number;
  passos_concluidos: number;
  pct: number;
  por_semana: AderenciaPorSemana[] | null;
  congelado_em: string;
}

// ─── Retornos das RPCs (única forma permitida de ler dado de cliente) ──────

export interface ClienteCarteira {
  organization_id: string;
  nome: string;
  cliente_desde: string;
  dias_de_ciclo: number;
  pct_contrato: number;
  camada_0_ok: boolean;
  /** Nome do elo eleito como restrição — string livre vinda do banco (ver NomeElo). */
  elo_restricao: string | null;
  /** String livre vinda do banco (ex.: 'baixo'|'medio'|'alto') — não travado em union por falta de enum confirmado no contrato. */
  nivel_risco: string | null;
  aderencia_pct: number | null;
  dias_sem_contato: number | null;
  ordem_fila: number;
}

export interface ClienteElo {
  camada: CamadaElo;
  elo: string;
  valor: number | null;
  numerador: number | null;
  denominador: number | null;
  amostra_suficiente: boolean;
}

/**
 * Formato assumido para `cs_cliente_serie`: "long format" — uma linha por
 * mês x elo, no mesmo shape de `ClienteElo` + `mes`. O contrato passado pelo
 * maestro não detalhou as colunas desta RPC especificamente; este é o design
 * mais consistente com `cs_cliente_elos` (mesma família de função, mesmo
 * vocabulário camada/elo/valor/numerador/denominador/amostra_suficiente).
 * CONFIRMAR contra o retorno real assim que a RPC existir no banco — reportado
 * como divergência em aberto no relatório final do Executor de Hooks.
 */
export interface ClienteSerieMes extends ClienteElo {
  mes: string; // YYYY-MM
}

export interface ClienteAdocaoItem {
  item: string;
  ligado: boolean;
  evidencia: string | null;
}

export interface Aderencia {
  total_passos: number;
  passos_concluidos: number;
  pct: number;
  por_semana: AderenciaPorSemana[];
}

/**
 * Uma linha de `cs_plano_conteudo` — um passo do plano publicado, com o
 * estágio a que pertence. Formato "long" (uma linha por passo), já ordenado
 * pelo banco por `estagio_ordem` e depois `passo_ordem`. NÃO assumir que
 * "estágio = semana" nem que existem 4 estágios — o dado real varia (visto em
 * produção: 5 estágios com títulos descritivos, não "Semana N").
 */
export interface PlanoPasso {
  jornada_id: string;
  jornada_titulo: string;
  jornada_status: string;
  estagio_id: string;
  estagio_titulo: string;
  estagio_ordem: number;
  passo_id: string;
  passo_titulo: string;
  passo_descricao: string | null;
  passo_ordem: number;
  passo_tipo: string;
  obrigatorio: boolean;
  concluido: boolean;
  concluido_em: string | null;
}

// ─── Filtros de query ───────────────────────────────────────────────────────

export interface TarefasFiltros {
  organizationId?: string;
  /** true = apenas tarefas internas (organization_id IS NULL). */
  semCliente?: boolean;
  dono?: DonoTarefa;
  concluida?: boolean;
  origem?: OrigemTarefa;
  jornadaId?: string;
  /** YYYY-MM-DD — traz tarefas com prazo até esta data (inclusive). */
  prazoAte?: string;
}

export interface ReunioesFiltros {
  organizationId?: string;
  /** true = apenas sessões táticas em grupo (organization_id IS NULL). */
  semCliente?: boolean;
  tipo?: TipoReuniao;
  status?: StatusReuniao;
  /** ISO date/datetime — limite inferior de data_hora. */
  de?: string;
  /** ISO date/datetime — limite superior de data_hora. */
  ate?: string;
}

// ─── Payloads de mutation ───────────────────────────────────────────────────

export interface NovaTarefaInput {
  organizationId?: string | null;
  titulo: string;
  descricao?: string | null;
  dono: DonoTarefa;
  origem?: OrigemTarefa;
  jornadaId?: string | null;
  prazo?: string | null;
  prioridade?: number;
}

export type EditarTarefaInput = Partial<
  Pick<CSTarefa, 'titulo' | 'descricao' | 'dono' | 'origem' | 'jornada_id' | 'prazo' | 'prioridade' | 'organization_id'>
> & { id: string };

export interface NovaReuniaoInput {
  organizationId?: string | null;
  tipo: TipoReuniao;
  dataHora: string;
  pauta?: string | null;
}

export interface RemarcarReuniaoInput {
  id: string;
  dataHora: string;
}

export interface SalvarNotasReuniaoInput {
  id: string;
  notas: string;
}
