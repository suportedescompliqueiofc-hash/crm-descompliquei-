// Linha de lista genérica do app de CS — substitui o "card dentro de card"
// (borda + sombra + radius em cada linha) da plataforma do cliente. Uma
// lista é uma pilha de linhas separadas por filete (`divide-y`), não uma
// pilha de cartões — ver design-cs.md, princípio 6.
//
// Não define colunas: o layout interno (grid, flex) é do consumidor. Este
// componente só resolve a moldura comum — respiro vertical, affordance de
// clique (hover + teclado), sem ícone de chevron (o hover já basta).
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListRowProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}

export function ListRow({ children, onClick, className }: ListRowProps) {
  const interactive = !!onClick;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (!onClick) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'py-4 -mx-3 px-3 rounded-lg transition-colors',
        interactive &&
          'cursor-pointer hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20',
        className,
      )}
    >
      {children}
    </div>
  );
}
