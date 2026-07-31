// Instrumentos de leitura de dado do console — as peças que fazem a tela
// parecer painel de instrumento em vez de texto corrido.
//
//   KeyValue  — rótulo à esquerda, valor à direita, fio pontilhado ligando.
//               É a linha mais densa possível sem virar tabela.
//   Rail      — trilho de progresso de 4px. Único gráfico do sistema.
//   Checkline — linha de checklist com caixa real e evidência de banco.
//   Readout   — o número grande com rótulo, para o topo das telas.
//
// Todos herdam a mesma regra de número: `font-display tabular-nums`
// SEMPRE juntos (ver Metric.tsx). Formate antes de passar — `formatBRL`,
// `formatInt`, `formatPct` de `@/lib/format`; sem dado é sempre '—'.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Metric } from './Metric';

/* ── KeyValue ───────────────────────────────────────────────────────────── */

interface KeyValueProps {
  label: ReactNode;
  value: ReactNode;
  /** Linha de apoio abaixo do rótulo — evidência de banco, ressalva, prazo. */
  hint?: ReactNode;
  /** Liga o fio pontilhado entre rótulo e valor. Desligue em listas curtas. */
  leader?: boolean;
  className?: string;
}

/**
 * Correção de 2026-07-31: o valor era `shrink-0`, o que é certo para número
 * ("49%" nunca deve quebrar no meio) e ERRADO para texto — um valor longo
 * (ex.: "Atende só particular — informação repassada na venda") não cabia,
 * não quebrava e vazava para fora do painel, que foi o que o CEO viu na
 * coluna lateral da Ficha.
 *
 * A solução mantém as duas leituras: `flex-wrap` deixa o valor cair inteiro
 * para a linha de baixo quando não couber ao lado do rótulo (em vez de
 * espremer os dois), e `break-words` garante que nem uma palavra sem espaços
 * estoure a caixa. Número curto continua na mesma linha, como antes.
 */
export function KeyValue({ label, value, hint, leader = true, className }: KeyValueProps) {
  return (
    <div className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5 py-[7px] text-[13px]', className)}>
      <span className="text-muted-foreground shrink-0">{label}</span>
      {leader && <span className="flex-1 min-w-[16px] border-b border-dotted border-border/80 translate-y-[-3px]" />}
      <span className={cn('min-w-0 max-w-full text-right break-words', !leader && 'ml-auto')}>{value}</span>
      {hint && <span className="sr-only">{hint}</span>}
    </div>
  );
}

/* ── Rail ───────────────────────────────────────────────────────────────── */

interface RailProps {
  /** 0 a 1. Valores fora da faixa são cortados, não estouram o trilho. */
  value: number;
  tone?: 'ink' | 'accent' | 'signal';
  className?: string;
}

const RAIL_FILL: Record<NonNullable<RailProps['tone']>, string> = {
  ink: 'bg-foreground/75',
  accent: 'bg-[hsl(var(--cs-accent))]',
  signal: 'bg-[hsl(var(--cs-signal))]',
};

export function Rail({ value, tone = 'ink', className }: RailProps) {
  const pct = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0)) * 100;
  return (
    <div className={cn('h-1 w-full rounded-full bg-muted overflow-hidden', className)}>
      <div className={cn('h-full rounded-full transition-[width] duration-500', RAIL_FILL[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Checkline ──────────────────────────────────────────────────────────── */

interface ChecklineProps {
  /** `null` = ainda não se sabe (carregando ou sem medição). */
  checked: boolean | null;
  label: ReactNode;
  /** Origem do dado — passe um <Evidence>. */
  evidence?: ReactNode;
  className?: string;
}

export function Checkline({ checked, label, evidence, className }: ChecklineProps) {
  return (
    <div className={cn('flex items-start gap-2.5 py-[5px]', className)}>
      <span
        aria-hidden
        className={cn(
          'mt-[3px] h-[13px] w-[13px] rounded-[3px] border shrink-0 flex items-center justify-center',
          checked === true && 'bg-[hsl(var(--cs-signal))] border-[hsl(var(--cs-signal))]',
          checked === false && 'border-[hsl(var(--cs-accent))] bg-[hsl(var(--cs-accent-soft))]',
          checked === null && 'border-border bg-muted',
        )}
      >
        {checked === true && (
          <svg viewBox="0 0 10 10" className="h-[9px] w-[9px] text-white" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1.5 5.2 4 7.6 8.6 2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className={cn('text-[13px] leading-snug', checked === true ? 'text-foreground' : 'text-foreground')}>{label}</p>
        {evidence && <div className="mt-0.5">{evidence}</div>}
      </div>
    </div>
  );
}

/* ── Readout ────────────────────────────────────────────────────────────── */

interface ReadoutProps {
  label: string;
  value: ReactNode;
  /** Frase curta abaixo do número. */
  caption?: ReactNode;
  size?: 'lg' | 'md';
  tone?: 'default' | 'accent' | 'signal' | 'muted';
  className?: string;
}

export function Readout({ label, value, caption, size = 'md', tone = 'default', className }: ReadoutProps) {
  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">{label}</p>
      <div className="mt-1">
        <Metric size={size === 'lg' ? 'xl' : 'lg'} tone={tone} value={value} />
      </div>
      {caption && <p className="text-[11.5px] text-muted-foreground/75 mt-0.5 leading-snug">{caption}</p>}
    </div>
  );
}
