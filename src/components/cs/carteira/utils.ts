// Utilitários locais da tela Carteira.
// `formatDataBR` vive em `../format.ts` (compartilhado) — importar de lá.
//
// Reescrito na rodada de linguagem visual (2026-07-30): a barra do "relógio
// do contrato" saiu (virou texto corrido na própria linha — ver
// `CarteiraRow.tsx`), então `corRelogioContrato` não tem mais consumidor e
// foi removida daqui. `CARTEIRA_GRID_COLS` perdeu a 5ª coluna do chevron
// (o hover da linha já basta como affordance de clique).

/** Grid de colunas compartilhado entre o cabeçalho e cada linha da lista. */
export const CARTEIRA_GRID_COLS = 'md:grid-cols-[2.2fr_1fr_1.8fr_0.8fr]';
