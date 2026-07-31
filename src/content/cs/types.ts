// Tipos do conteúdo do Método de CS. Fonte: 05-operacoes-e-cs/sistema/*.md
// (o "manual"). Este módulo só declara forma — dado real mora em cadeia.ts,
// materiais.ts, ritos.ts, plano-de-acao.ts, principios.ts, realidade.ts,
// tecnico.ts. Ver README.md desta pasta para a decisão de arquitetura.

/** As 4 camadas do modelo de diagnóstico. 0 não é elo — é pré-condição. */
export type CamadaId = 0 | 1 | 2 | 3;

/** Os 8 elos da cadeia comercial (Camadas 1-3). */
export type EloId =
  | 'demanda'
  | 'agendamento'
  | 'resgate_lead_frio'
  | 'comparecimento'
  | 'fechamento'
  | 'ticket'
  | 'ciclo_venda'
  | 'recompra';

/** Elo + a Camada 0 (Adoção), usado como chave de agrupamento do catálogo de materiais. */
export type GrupoMaterialId = EloId | 'adocao';

/** Mesmo vocabulário de `cs_carteira.nivel_risco` já usado no banco e em StatusIndicator. */
export type NivelRiscoId = 'critico' | 'atencao' | 'saudavel' | 'referencia';

export interface Camada {
  id: CamadaId;
  nome: string;
  ehElo: boolean;
  naturezaDoTrabalho: string;
  oQueE: string;
  elos: EloId[];
  observacao?: string;
}

export interface EloLeituraComplementar {
  nome: string;
  texto: string;
}

export interface Elo {
  id: EloId;
  nome: string;
  camada: CamadaId;
  oQueE: string;
  formula: string;
  origemBanco: string[];
  oQueSignificaEstarQuebrado: string;
  causasTipicas: string[];
  faixaReferenciaMercado: string;
  leituraComplementar?: EloLeituraComplementar;
  notaDeReclassificacao?: string;
}

export type TipoMaterial = 'operacional' | 'estrategico';

export interface Material {
  id: string;
  nome: string;
  grupo: GrupoMaterialId;
  oQueE: string;
  quandoSeAplica: string;
  oQueAnalisarAntes: string;
  tipo: TipoMaterial;
}

export interface Principio {
  id: string;
  titulo: string;
  texto: string;
}

export interface Ritual {
  comando: string;
  nome: string;
  descricao: string;
}

export interface SemanaDoMes {
  numero: 1 | 2 | 3 | 4;
  titulo: string;
  objetivo: string;
  oQueOCsFaz: string[];
  oQueOCsNaoFaz: string[];
  porQue?: string;
}

export interface SinalRisco {
  numero: number;
  nome: string;
  oQueMede: string;
  comoSeMede: string;
  porQueImporta: string;
  detalhe?: string;
}

export interface NivelRisco {
  nivel: NivelRiscoId;
  definicao: string;
  gatilhos?: string[];
  cadenciaContato: string;
  acaoObrigatoria: string;
  oQueMudaNoPlano: string;
}

export interface RegraTransicao {
  de: string;
  para: string;
  regra: string;
  porQue?: string;
}

export interface BlocoReuniao {
  numero: number;
  titulo: string;
  duracao: string;
  oQueDizer: string;
  oQueMostrar: string;
  oQuePerguntar: string;
}

export interface ConversaDificil {
  caso: string;
  comoConduzir: string;
}

export interface ParDeAcao {
  elo: EloId | 'instrumentacao';
  eloNome: string;
  ruim: string;
  boa: string;
  dono: string;
}

export interface ErradoCerto {
  errado: string;
  certo: string;
}

/** As 5 seções de navegação da tela de Método — ordem = ordem de leitura. */
export type SecaoId = 'fundamentos' | 'ritos' | 'artefatos' | 'realidade' | 'tecnico';

export interface SecaoMeta {
  id: SecaoId;
  nome: string;
  descricao: string;
}

/** Uma entrada indexada para busca — gerada a partir do conteúdo estruturado, não escrita à mão. */
export interface SearchEntry {
  id: string;
  secao: SecaoId;
  documento: string;
  titulo: string;
  texto: string;
}
