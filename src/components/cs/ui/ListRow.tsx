// Linha de lista do console — a peça mais repetida do sistema.
//
// Uma lista é uma pilha de linhas separadas por filete, nunca uma pilha de
// cartões (cartão dentro de painel = caixa dentro de caixa). O que mudou em
// 2026-07-31: a linha ganhou densidade e MARCADOR. Densidade porque linha
// alta e solta lê como parágrafo; marcador porque a linha precisa dizer o
// seu estado antes de ser lida — é o que separa "lista de textos" de
// "fila de trabalho".
//
// A calha (gutter) de 20px à esquerda é fixa mesmo quando vazia: sem ela, as
// linhas com e sem marcador desalinham e a pilha perde a régua vertical.
//
// Layout interno é do consumidor (grid/flex livre em `children`). Este
// componente resolve só a moldura: respiro, calha, hover, foco de teclado.
import type { KeyboardEvent, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ListRowProps {
  children: ReactNode;
  /** Marcador na calha: índice da fila, caixa de conclusão, ponto de estado. */
  mark?: ReactNode;
  /** Bloco à direita, alinhado ao topo — número, chip, data. */
  trailing?: ReactNode;
  onClick?: () => void;
  /** Fio laranja de 2px na borda esquerda — a linha que pede ação agora. */
  flagged?: boolean;
  className?: string;
}

export function ListRow({ children, mark, trailing, onClick, flagged, className }: ListRowProps) {
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
        'relative flex items-start gap-3 px-4 py-3 transition-colors',
        flagged && 'before:absolute before:left-0 before:inset-y-0 before:w-[2px] before:bg-[hsl(var(--cs-accent))] before:content-[""]',
        interactive &&
          'cursor-pointer hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[hsl(var(--cs-accent))]/40',
        className,
      )}
    >
      <div className="w-5 shrink-0 pt-[1px] flex justify-center">{mark}</div>
      <div className="min-w-0 flex-1">{children}</div>
      {trailing && <div className="shrink-0 text-right pl-2">{trailing}</div>}
    </div>
  );
}

/** Número de ordem da fila — o marcador padrão de lista priorizada. */
export function RowIndex({ n, flagged }: { n: number; flagged?: boolean }) {
  return (
    <span
      className={cn(
        'font-display tabular-nums text-[11px] font-bold leading-5',
        flagged ? 'text-[hsl(var(--cs-accent))]' : 'text-muted-foreground/45',
      )}
    >
      {n}
    </span>
  );
}
