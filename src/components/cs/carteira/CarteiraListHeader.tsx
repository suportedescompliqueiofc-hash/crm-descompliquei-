import { cn } from '@/lib/utils';
import { CARTEIRA_GRID_COLS } from './utils';

/** Cabeçalho de colunas — só aparece em telas médias/grandes (a lista vira card no mobile). */
export function CarteiraListHeader() {
  return (
    <div
      className={cn(
        'hidden md:grid items-center gap-6 px-5 py-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50',
        CARTEIRA_GRID_COLS,
      )}
    >
      <span>Cliente</span>
      <span>Risco</span>
      <span>Elo-restrição</span>
      <span>Aderência</span>
      <span />
    </div>
  );
}
