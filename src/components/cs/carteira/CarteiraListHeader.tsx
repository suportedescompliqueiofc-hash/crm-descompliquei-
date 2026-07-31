// Cabeçalho de colunas da Carteira — texto simples, sem caixa/borda/fundo.
// Só aparece em telas médias/grandes: no mobile cada linha já rotula os
// próprios campos (ver `CarteiraRow.tsx`), então repetir o cabeçalho ali
// seria ruído duplicado.
import { cn } from '@/lib/utils';
import { CARTEIRA_GRID_COLS } from './utils';

export function CarteiraListHeader() {
  return (
    <div
      className={cn(
        'hidden md:grid items-center gap-6 px-3 pb-2 text-[11px] text-muted-foreground/40',
        CARTEIRA_GRID_COLS,
      )}
    >
      <span>Cliente</span>
      <span>Risco</span>
      <span>Elo-restrição</span>
      <span className="text-right">Aderência</span>
    </div>
  );
}
