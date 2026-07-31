// Botão do console.
//
// Existe para acabar com o botão-âncora sublinhado que sobrou do desenho
// anterior ("Publicar plano" como link no meio do texto). Num documento,
// ação é link; num sistema, ação é botão com superfície — e essa diferença é
// metade da sensação de "isto é software".
//
// Variantes, por ordem de peso:
//   solid   — grafite. A ação principal do bloco. Uma por painel.
//   accent  — laranja. A ação principal da TELA. No máximo uma por tela.
//   outline — branca com fio. Ações secundárias.
//   ghost   — sem superfície. Ações terciárias e de linha de lista.
//   danger  — só para destruir/desfazer de verdade.
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ActionVariant = 'solid' | 'accent' | 'outline' | 'ghost' | 'danger';
type ActionSize = 'sm' | 'md';

const VARIANT: Record<ActionVariant, string> = {
  solid: 'bg-[hsl(var(--cs-ink))] text-white hover:bg-[hsl(var(--cs-ink-2))] shadow-[0_1px_1px_hsl(28_20%_20%/0.12)]',
  accent: 'bg-[hsl(var(--cs-accent))] text-white hover:bg-[hsl(var(--cs-accent))]/90 shadow-[0_1px_1px_hsl(20_60%_30%/0.18)]',
  outline: 'bg-card border border-border text-foreground hover:bg-muted/60',
  ghost: 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
  danger: 'bg-card border border-destructive/30 text-destructive hover:bg-destructive/[0.06]',
};

const SIZE: Record<ActionSize, string> = {
  sm: 'h-7 px-2.5 text-[11.5px] rounded-md gap-1.5',
  md: 'h-[34px] px-3.5 text-[12.5px] rounded-lg gap-2',
};

interface ActionProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ActionVariant;
  size?: ActionSize;
}

export function Action({ children, variant = 'outline', size = 'md', className, ...rest }: ActionProps) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cs-accent))]/45 focus-visible:ring-offset-1 focus-visible:ring-offset-card',
        'disabled:opacity-45 disabled:pointer-events-none',
        SIZE[size],
        VARIANT[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
