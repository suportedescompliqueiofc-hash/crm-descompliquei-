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
  /**
   * `date` no banco → chega como **'YYYY-MM-DD'** (primeiro dia do mês), NÃO
   * como 'YYYY-MM'. Conferido em 2026-07-31 por `pg_get_function_result` de
   * `cs_cliente_serie`; o comentário anterior dizia 'YYYY-MM' e uma tela
   * concatenou '-01' em cima, derrubando a ficha em tela branca. Para exibir,
   * use `formatMesCurto` de `@/components/cs/format` — nunca monte a data à mão.
   */
  mes: string;
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
 *
 * `jornada_elo_alvo` / `jornada_criterio_sucesso`: RECONFIRMADO ao vivo em
 * 2026-07-30 (projeto noncbgdczgcboronmcah, `pg_get_functiondef` +
 * `RETURNS TABLE`) — a função JÁ devolve as duas colunas (migration
 * `20260730130004`). Ambas nulas em todos os planos mensais reais hoje
 * (nenhum fechamento mensal ainda declarou elo/critério no sistema novo) —
 * `null` aqui é dado real, não ausência de coluna.
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
  jornada_elo_alvo: string | null;
  jornada_criterio_sucesso: string | null;
}

// ─── Contexto, Continuidade e Percepção (mesa de trabalho do cliente) ──────
//
// REVALIDADO AO VIVO em 2026-07-30 (projeto noncbgdczgcboronmcah), depois que
// o Executor de Dados publicou as funções: li `pg_get_functiondef` de cada
// RPC, testei SELECT com organizações reais (as 7 PCA, migradas do dossiê
// antigo em 2026-07-29) e testei os 3 INSERTs dentro de `BEGIN; ...;
// ROLLBACK;` (confirmado por SELECT que não sobrou linha nenhuma). Os nomes
// de campo abaixo são os REAIS — vários divergem do que o contrato descrevia
// em português informal, documentado caso a caso.
//
// Comportamento crítico do INSERT: `cs_continuidade` e `cs_percepcao` têm
// trigger `trg_*_bloquear_alteracao` que RAISE EXCEPTION em qualquer UPDATE
// ou DELETE ("Esta tabela só recebe entradas novas... Para corrigir uma
// entrada anterior, registre uma entrada nova") — não existem (e não devem
// existir) hooks de editar/apagar essas duas tabelas nesta pasta.

export type TipoContinuidade =
  | 'conversa'
  | 'decisao'
  | 'entrega'
  | 'observacao'
  | 'divergencia'
  | 'fechamento';
// Confirmado ao vivo: o dado migrado (7 linhas) usa só 'observacao'.
// 'conversa' foi testado explicitamente via INSERT em transação com
// ROLLBACK e foi aceito pelo banco (não há CHECK constraint bloqueando os
// demais valores do contrato) — os outros 4 não foram testados, mas nada
// indica que sejam rejeitados.

/** Um item de `percepcoes_recentes` — sub-objeto JSONB dentro de `cs_cliente_contexto`. */
export interface PercepcaoRecente {
  id: string;
  texto: string;
  /** date (YYYY-MM-DD) — nulo quando só a data aproximada é conhecida (ver `data_aproximada`). Nos 7 registros migrados vem sempre null. */
  data_percepcao: string | null;
  data_aproximada: boolean;
  /** Confirmado boolean real (true/false) — é o marcador de divergência citado no pedido do maestro. */
  diverge_do_dado: boolean;
  divergencia_nota: string | null;
  registrada_em: string; // timestamptz ISO
}

/**
 * Retorno REAL de `cs_cliente_contexto(p_org_id)` — nomes de coluna
 * confirmados via `pg_get_functiondef` + chamada real.
 *
 * Diferenças em relação ao que eu tinha assumido antes da validação:
 * - `modelo_negocio` não existe → é `convenio_particular`.
 * - `equipe` não existe → é `tem_equipe`.
 * - `elo_declarado`/`elo_declarado_desde` não existem → são `elo_restricao`/
 *   `elo_restricao_desde` (mesmo nome de campo usado em `ClienteCarteira`,
 *   é o mesmo conceito).
 * - `elo_restricao_desde` é TEXTO LIVRE, não uma data — visto em produção:
 *   "não se aplica ainda — nenhum fechamento (/cs-mes) rodou no sistema
 *   novo para este cliente". Não formatar como data.
 * - Ganhou `elo_restricao_status` (visto em produção: 'hipotese' | null —
 *   só esses dois valores observados; 'confirmado' é esperado depois do
 *   primeiro /cs-mes mas não foi visto ainda) e `atualizado_em`, que eu não
 *   tinha previsto.
 */
export interface ClienteContexto {
  organization_id: string;
  nome: string;
  cidade: string | null;
  cliente_desde: string; // date
  promessa_venda: string | null;
  /** String livre vinda do banco — sem enum confirmado. */
  convenio_particular: string | null;
  quem_atende: string | null;
  quem_vende: string | null;
  tem_equipe: string | null;
  elo_restricao: string | null;
  /** Valores observados em produção: 'hipotese' | null. */
  elo_restricao_status: string | null;
  /** TEXTO LIVRE — não é data. */
  elo_restricao_desde: string | null;
  restricoes_conhecidas: string | null;
  atualizado_em: string; // timestamptz ISO
  percepcoes_recentes: PercepcaoRecente[];
}

/**
 * Retorno REAL de `cs_cliente_continuidade(p_org_id, p_limite)` — mais
 * recente primeiro (`ORDER BY data_evento DESC, criada_em DESC`).
 *
 * Diferenças em relação ao que eu tinha assumido antes da validação:
 * - NÃO devolve `organization_id` (o chamador já sabe qual org pediu).
 * - `data` não existe → é `data_evento`, e é DATE (YYYY-MM-DD), não
 *   timestamptz — o timestamp real do registro é `criada_em`.
 * - `o_que_ficou_combinado`/`com_quem` não existem → são `ficou_combinado`/
 *   `combinado_com`.
 * - Ganhou `reuniao_tipo`/`reuniao_data_hora` (do LEFT JOIN com
 *   `cs_reunioes` — null quando `reuniao_id` é null) e `criada_em`, que eu
 *   não tinha previsto.
 */
export interface ContinuidadeItem {
  id: string;
  data_evento: string; // date (YYYY-MM-DD)
  tipo: TipoContinuidade;
  o_que_aconteceu: string;
  ficou_combinado: string | null;
  combinado_com: string | null;
  /** Valor observado em produção: 'registro_manual' (default da RPC de escrita). */
  origem: string | null;
  reuniao_id: string | null;
  reuniao_tipo: string | null;
  reuniao_data_hora: string | null; // timestamptz ISO
  criada_em: string; // timestamptz ISO
}

// ─── Payloads de contexto / continuidade / percepção ───────────────────────
//
// Nomes de parâmetro abaixo confirmados via `pg_get_functiondef` de cada RPC
// de escrita (2026-07-30) — os hooks usam exatamente estes `p_*` nas
// chamadas `.rpc(...)`.

/**
 * `cs_salvar_contexto` é um UPSERT por `organization_id` que faz
 * `COALESCE(EXCLUDED.campo, cs_contexto.campo)` — ou seja, passar `null`/
 * `undefined` NUNCA apaga um valor já salvo, só mantém o que já existia.
 * Não há hoje uma forma de limpar um campo de contexto para null por esta
 * RPC; só de substituir por outro valor não-nulo.
 */
export interface SalvarContextoInput {
  organizationId: string;
  cidade?: string | null;
  clienteDesde?: string | null; // date (YYYY-MM-DD)
  promessaVenda?: string | null;
  convenioParticular?: string | null;
  quemAtende?: string | null;
  quemVende?: string | null;
  temEquipe?: string | null;
  eloRestricao?: string | null;
  eloRestricaoStatus?: string | null;
  /** TEXTO LIVRE — não precisa ser data. */
  eloRestricaoDesde?: string | null;
  restricoesConhecidas?: string | null;
}

export interface RegistrarContinuidadeInput {
  organizationId: string;
  /** date (YYYY-MM-DD) — OBRIGATÓRIO no banco, sem default (`p_data_evento date` sem `DEFAULT`). */
  dataEvento: string;
  tipo: TipoContinuidade;
  oQueAconteceu: string;
  ficouCombinado?: string | null;
  combinadoCom?: string | null;
  /** Default no banco: 'registro_manual'. */
  origem?: string;
  reuniaoId?: string | null;
}

export interface RegistrarPercepcaoInput {
  organizationId: string;
  texto: string;
  /** date (YYYY-MM-DD) — omitir quando só se sabe a data aproximada. */
  dataPercepcao?: string | null;
  /** Default no banco: false. */
  dataAproximada?: boolean;
  /** Default no banco: false. É o marcador de divergência. */
  divergeDoDado?: boolean;
  divergenciaNota?: string | null;
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

// ─── Materiais por cliente e Timeline unificada ────────────────────────────
//
// Contrato publicado pelo Executor de Dados em 2026-07-30. REVALIDADO AO VIVO
// (projeto noncbgdczgcboronmcah, `pg_get_functiondef` das 6 funções +
// `pg_get_constraintdef`/`information_schema.columns` de `cs_materiais`) —
// os valores de `elo`/`tipo`/`status` abaixo batem exatamente com os CHECK
// constraints reais da tabela, sem divergência. Testado com as 7 orgs PCA
// (`cs_materiais_cliente` e `cs_cliente_timeline`, incluindo Dr. Derek
// Gonçalves e Dr. Jhonatan Dutra — devolvem lista vazia, nunca erro, porque
// `cs_materiais` está 100% vazia hoje e a timeline só depende de dado
// existente por org). Escrita testada em transação com `ROLLBACK` (INSERT +
// UPDATE de status + UPDATE de entrega + erro de canal inválido), confirmado
// por SELECT depois que não sobrou nenhuma linha de teste.
//
// `cs_materiais_cliente`/`cs_material` devolvem MAIS colunas do que o
// contrato original citava: além de `canal_entrega` (computado), a função
// também devolve as colunas cruas `entregue_nota`/`entregue_nota_em`/
// `entregue_html`/`entregue_html_em`/`html_referencia`/`pagina_id` — úteis
// para a UI decidir, por exemplo, se um material Estratégico já tem o HTML
// gerado sem precisar decompor a string de `canal_entrega`.

/** Valores reais do CHECK constraint `cs_materiais_elo_check`. */
export type EloMaterial =
  | 'Adoção (Camada 0)'
  | 'Demanda'
  | 'Agendamento'
  | 'Resgate de Lead Frio'
  | 'Comparecimento'
  | 'Fechamento'
  | 'Ticket'
  | 'Ciclo de Venda'
  | 'Recompra';

/** Valores reais do CHECK constraint `cs_materiais_tipo_check`. */
export type TipoMaterial = 'estrategico' | 'operacional';

/** Valores reais do CHECK constraint `cs_materiais_status_check`. */
export type StatusMaterial = 'solicitado' | 'em_producao' | 'pronto' | 'entregue';

/** Computado na leitura (`CASE` dentro da RPC) — não é coluna da tabela. */
export type CanalEntregaMaterial = 'nenhuma' | 'nota' | 'html' | 'ambos';

/**
 * Retorno REAL de `cs_materiais_cliente(p_org_id)` e `cs_material(p_id)` —
 * mesmo shape nas duas (`cs_material` devolve 0 ou 1 linha, nunca erro para
 * id inexistente).
 */
export interface CSMaterial {
  id: string;
  organization_id: string;
  titulo: string;
  elo: EloMaterial;
  tipo: TipoMaterial;
  status: StatusMaterial;
  jornada_id: string | null;
  /** Nullable na coluna, mas a RPC de escrita nunca deixa passar vazio — ver `cs_registrar_material`. */
  analise_previa: string | null;
  conteudo: string | null;
  pagina_id: string | null;
  entregue_nota: boolean;
  entregue_nota_em: string | null; // timestamptz ISO
  entregue_html: boolean;
  entregue_html_em: string | null; // timestamptz ISO
  html_referencia: string | null;
  canal_entrega: CanalEntregaMaterial;
  criado_em: string; // timestamptz ISO
  atualizado_em: string; // timestamptz ISO
}

export interface RegistrarMaterialInput {
  organizationId: string;
  titulo: string;
  elo: EloMaterial;
  tipo: TipoMaterial;
  /**
   * OBRIGATÓRIA — o banco lança exceção (`P0001`) se vier vazia/em branco.
   * Ver `useRegistrarMaterial`, que valida no cliente antes de ir ao banco
   * e traduz o erro do banco (se ainda assim chegar lá) na mesma mensagem
   * amigável, via `AnalisePreviaObrigatoriaError`.
   */
  analisePrevia: string;
  conteudo?: string | null;
  jornadaId?: string | null;
  /** Default no banco: 'solicitado'. */
  status?: StatusMaterial;
}

export interface AtualizarStatusMaterialInput {
  id: string;
  status: StatusMaterial;
}

export interface RegistrarEntregaMaterialInput {
  id: string;
  canal: 'nota' | 'html';
  paginaId?: string | null;
  htmlReferencia?: string | null;
  /** timestamptz ISO — default no banco: `now()`. */
  quando?: string;
}

/** Valores reais do `tipo` devolvido por `cs_cliente_timeline`. */
export type TipoEventoTimeline =
  | 'continuidade'
  | 'reuniao'
  | 'material'
  | 'tarefa_concluida'
  | 'plano_publicado'
  | 'cliente_entrou'
  | 'primeira_venda';

/** Valores reais de `origem` devolvido por `cs_cliente_timeline`. */
export type OrigemTimeline =
  | 'cs_continuidade'
  | 'cs_reunioes'
  | 'cs_materiais'
  | 'cs_tarefas'
  | 'jornadas'
  | 'organizations'
  | 'vendas';

/**
 * Retorno REAL de `cs_cliente_timeline(p_org_id, p_limite, p_desde)` — mais
 * recente primeiro (`ORDER BY data DESC`). Uma linha de material representa
 * o material INTEIRO (não um evento por entrega) — a `data` e a `descricao`
 * dessa linha mudam quando o material é entregue (a função usa
 * `COALESCE(GREATEST(entregue_nota_em, entregue_html_em), atualizado_em)`),
 * então `useRegistrarEntregaMaterial` invalida a timeline para refletir isso.
 */
export interface TimelineEvento {
  data: string; // timestamptz ISO
  tipo: TipoEventoTimeline;
  titulo: string;
  descricao: string | null;
  origem: OrigemTimeline;
  registro_origem_id: string;
}

export interface TimelineFiltros {
  /** Default no banco: 100. */
  limite?: number;
  /** date (YYYY-MM-DD) — limite inferior de `data`. */
  desde?: string | null;
}

// ─── Publicar plano (cs_publicar_jornada) e Marcos do CRM (cs_cliente_marcos) ──
//
// Contrato desta rodada (2026-07-31) — o Executor de Dados e Hooks é o mesmo
// agente que criou a função no banco e o hook que a consome, então não há
// repasse entre dois contratos divergentes (motivo declarado no brief desta
// tarefa). Testado ao vivo (projeto noncbgdczgcboronmcah): publicação real em
// transação com ROLLBACK usando a org do Dr. Derek Gonçalves
// (f1015744-992f-4db5-aac3-566e4cbd8d18), período 2026-09-01 — ver comentário
// de `usePublicarJornada` para o resultado campo a campo. `cs_cliente_marcos`
// testada com as 7 orgs PCA reais, incluindo Dr. Derek Gonçalves e Dr.
// Jhonatan Dutra (que devolve `[]`, zero marcos, nunca erro — a org tem
// praticamente nenhum dado ainda).

export type DonoPasso = 'cliente' | 'joao';

export interface PublicarJornadaPassoInput {
  titulo: string;
  descricao?: string | null;
  /** Default no banco: índice do passo dentro do estágio (0-based). */
  ordem?: number;
  /** Default no banco: 'acao_livre'. Mesmos valores de `jornada_passos.tipo`. */
  tipo?: string;
  /** Default no banco: true. */
  obrigatorio?: boolean;
  prazoDias?: number | null;
  /**
   * OBRIGATÓRIO — sem valor válido ('cliente'|'joao'), o banco lança exceção
   * citando o título do passo (04-plano-de-acao.md §4.2: "dono... nunca 'a
   * equipe' de forma genérica"). Passos 'joao' NÃO viram jornada_passos —
   * viram cs_tarefas(dono='joao', origem='plano') — ver COMMENT de
   * `usePublicarJornada` para a divergência declarada com a arquitetura.
   */
  dono: DonoPasso;
}

export interface PublicarJornadaEstagioInput {
  /** Default no banco: "Semana N" (N = posição no array, 1-based) se omitido/vazio. */
  titulo?: string;
  descricao?: string | null;
  /** Default no banco: índice do estágio no array (0-based). */
  ordem?: number;
  /** Default no banco: 7. Usado também como fallback de prazo dos passos 'joao' sem prazoDias próprio. */
  prazoDias?: number;
  /** date (YYYY-MM-DD). Sem ela, passos 'joao' deste estágio não recebem prazo calculado em cs_tarefas.prazo (fica NULL). */
  dataInicio?: string | null;
  passos: PublicarJornadaPassoInput[];
}

export interface PublicarJornadaInput {
  organizationId: string;
  /** date (YYYY-MM-DD) — primeiro dia do mês do plano, ex.: '2026-09-01'. Usado para a checagem de duplicata (mesma org + mesmo mês + status=ativa). */
  periodoRef: string;
  /** Default no banco: 'Plano de Ação — YYYY-MM' se omitido/vazio. */
  titulo?: string;
  /** OBRIGATÓRIO — o banco lança exceção se vazio (04-plano-de-acao.md §2: todo plano ataca um elo declarado). */
  eloAlvo: string;
  /** OBRIGATÓRIO — o banco lança exceção se vazio (04-plano-de-acao.md §4.3: uma métrica só, com alvo numérico único). */
  criterioSucesso: string;
  /** Ao menos 1 estágio — o banco lança exceção se o array vier vazio. */
  estagios: PublicarJornadaEstagioInput[];
}

/** Valores reais devolvidos por `cs_cliente_marcos` — ver COMMENT da função no banco para o critério de "relevante" na demanda. */
export type TipoMarcoCliente =
  | 'primeira_venda'
  | 'primeiro_agendamento'
  | 'primeira_mensagem'
  | 'salto_demanda'
  | 'queda_demanda';

/** Retorno REAL de `cs_cliente_marcos(p_org_id)` — sem ordem fixa de tipos, ordenado por `data DESC`. */
export interface ClienteMarco {
  tipo: TipoMarcoCliente;
  titulo: string;
  descricao: string | null;
  data: string; // date (YYYY-MM-DD)
}
