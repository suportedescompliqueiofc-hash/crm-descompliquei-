// Utilitários locais da tela Carteira.

/** Grid de colunas compartilhado entre o cabeçalho e cada linha da lista. */
export const CARTEIRA_GRID_COLS =
  'md:grid-cols-[2.2fr_0.95fr_1.7fr_0.9fr_20px]';

/**
 * Formata uma data (ISO completa ou "YYYY-MM-DD") em pt-BR, sem o
 * deslocamento de fuso que `new Date('YYYY-MM-DD')` introduz (interpretada
 * como UTC meia-noite, cai um dia para trás em fusos negativos como BRT).
 */
export function formatDataBR(value: string | null | undefined): string {
  if (!value) return '—';
  const soDataMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (soDataMatch) {
    const [, ano, mes, dia] = soDataMatch;
    return `${dia}/${mes}/${ano}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

/** Cor da barra do relógio do contrato — mais consumido, mais urgente. */
export function corRelogioContrato(pct: number): string {
  if (pct >= 70) return 'bg-red-500';
  if (pct >= 40) return 'bg-amber-500';
  return 'bg-foreground/50';
}
