// Barril dos primitivos visuais do console de CS. Importe SEMPRE daqui
// (`@/components/cs/ui`), nunca dos arquivos individuais.
//
// Conceito vigente: "Console" (2026-07-31) — canvas areia + painel branco +
// cromo grafite, laranja para ação e petróleo para o método. A justificativa
// de cada peça está no cabeçalho do próprio arquivo, e o conceito inteiro em
// 05-operacoes-e-cs/sistema/design-cs.md.
//
// Regra: nenhuma tela do console escreve cor crua nem monta caixa na mão.
// Se falta uma peça, ela nasce AQUI — não inline numa tela.

// Superfície
export { Panel, PanelHeader, PanelBody, PanelFooter, PanelBand, PanelRows } from './Panel';
export { Section } from './Section';

// Cabeçalho de tela
export { PageTitle, type TrilhaItem } from './PageTitle';

// Listas
export { ListRow, RowIndex } from './ListRow';

// Dado
export { Metric } from './Metric';
export { KeyValue, Rail, Checkline, Readout } from './Data';
export { Chip, Evidence } from './Chip';
export { StatusIndicator, StatusMark, type StatusTone } from './StatusIndicator';

// Ação
export { Action } from './Action';

// Estados
export { EmptyState } from './EmptyState';
export { LoadingState } from './LoadingState';
export { ErrorState } from './ErrorState';
