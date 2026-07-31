// Utilitários locais da tela Carteira.
// `formatDataBR` foi promovido para `../format.ts` (compartilhado) na
// consolidação de 2026-07-30 — importar de lá, não daqui.

/** Grid de colunas compartilhado entre o cabeçalho e cada linha da lista. */
export const CARTEIRA_GRID_COLS =
  'md:grid-cols-[2.2fr_0.95fr_1.7fr_0.9fr_20px]';

/** Cor da barra do relógio do contrato — mais consumido, mais urgente. */
export function corRelogioContrato(pct: number): string {
  if (pct >= 70) return 'bg-red-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-foreground/50';
}
