// Painel — a unidade de superfície do console de CS.
//
// Por que ele existe (e por que a versão anterior deste app NÃO tinha nada
// assim): sem painel, tudo vive no mesmo plano branco e a tela lê como
// documento. O CEO reprovou exatamente isso em 2026-07-31 ("tá muito
// minimalista, tudo preto e branco, quero um sistema aqui"). O painel branco
// sobre canvas areia é o que produz camada — e camada é o que faz software.
//
// Isto NÃO é o card da plataforma do cliente (`rounded-2xl` + sombra difusa +
// header com ícone em pílula). Aqui: canto menor, fio visível, sombra curta e
// quente, cabeçalho de 40px em barra — vocabulário de instrumento, não de
// cartão de marketing.
//
// Regras de composição:
//   • Painel NUNCA dentro de painel. Precisa agrupar? Use PanelSplit ou uma
//     faixa `PanelBand` dentro do mesmo painel.
//   • Lista dentro de painel = `PanelRows` (filete entre linhas, zero borda
//     em volta de cada linha).
//   • `tone="accent"` põe um fio laranja no topo — reservado ao bloco que
//     pede ação AGORA. Mais de um por tela anula o efeito.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PanelTone = 'default' | 'accent' | 'signal';

const TONE_EDGE: Record<PanelTone, string> = {
  default: '',
  accent: 'before:bg-[hsl(var(--cs-accent))]',
  signal: 'before:bg-[hsl(var(--cs-signal))]',
};

interface PanelProps {
  children: ReactNode;
  /** Fio de 2px no topo do painel. Use com parcimônia — é o grito da tela. */
  tone?: PanelTone;
  className?: string;
}

export function Panel({ children, tone = 'default', className }: PanelProps) {
  return (
    <section
      className={cn(
        'relative rounded-xl bg-card border border-border shadow-[var(--cs-shadow)] overflow-hidden',
        tone !== 'default' &&
          'before:absolute before:inset-x-0 before:top-0 before:h-[2px] before:content-[""] before:z-10',
        TONE_EDGE[tone],
        className,
      )}
    >
      {children}
    </section>
  );
}

interface PanelHeaderProps {
  /** Rótulo curto em caixa alta — o nome do instrumento, não uma frase. */
  title: string;
  /** Uma linha de contexto ao lado do título, em peso normal. */
  hint?: ReactNode;
  /** Controles à direita: filtro, contador, botão pequeno. */
  action?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, hint, action, className }: PanelHeaderProps) {
  return (
    <header
      className={cn(
        'h-10 px-4 flex items-center justify-between gap-3 border-b border-border bg-muted/40',
        className,
      )}
    >
      <div className="flex items-baseline gap-2.5 min-w-0">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.13em] text-foreground/65 shrink-0">{title}</h2>
        {hint && <span className="text-[11.5px] text-muted-foreground/70 truncate">{hint}</span>}
      </div>
      {action && <div className="shrink-0 flex items-center gap-1.5">{action}</div>}
    </header>
  );
}

interface PanelBodyProps {
  children: ReactNode;
  /** `flush` remove o respiro interno — para quando o corpo é uma lista. */
  flush?: boolean;
  className?: string;
}

export function PanelBody({ children, flush, className }: PanelBodyProps) {
  return <div className={cn(flush ? '' : 'px-4 py-4', className)}>{children}</div>;
}

export function PanelFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer
      className={cn(
        'px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between gap-3',
        className,
      )}
    >
      {children}
    </footer>
  );
}

/** Faixa interna — separa grupos DENTRO de um painel sem criar outro painel. */
export function PanelBand({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('px-4 py-3.5 border-t border-border/70 first:border-t-0', className)}>
      {label && (
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/55 mb-2">{label}</p>
      )}
      {children}
    </div>
  );
}

/** Lista dentro de painel: filete entre linhas, nada em volta. */
export function PanelRows({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('divide-y divide-border/70', className)}>{children}</div>;
}
