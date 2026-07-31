// Valor numérico do console — todo número, valor, data e percentual passa
// por aqui.
//
// Regra herdada da plataforma (a única que fica): `font-display tabular-nums`
// SEMPRE juntos na mesma tag. Isolados, caem num bug latente do CSS base que
// joga o número para JetBrains Mono — e número em mono é proibido no console
// (mono ali significa "identificador de banco", ver Evidence em Chip.tsx).
// Formate o valor ANTES de passar (`formatBRL`/`formatInt`/`formatPct` de
// `@/lib/format`); "sem dado" é sempre '—'.
//
// Tons: o console não tem semáforo. `danger`/`warning` são apelidos de
// laranja (atenção/ação) e `success` de petróleo (o método passou) — os
// nomes antigos seguem válidos para não quebrar telas, mas em código novo
// use `accent` e `signal`, que dizem o que a cor significa AQUI.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MetricSize = 'xl' | 'lg' | 'md' | 'sm';
type MetricTone = 'default' | 'muted' | 'accent' | 'signal' | 'danger' | 'warning' | 'success';

const SIZE_CLASSES: Record<MetricSize, string> = {
  xl: 'text-[38px] leading-[1.02] tracking-[-0.02em]',
  lg: 'text-[23px] leading-[1.1] tracking-[-0.01em]',
  md: 'text-[14.5px]',
  sm: 'text-[12.5px]',
};

const TONE_CLASSES: Record<MetricTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  accent: 'text-[hsl(var(--cs-accent))]',
  signal: 'text-[hsl(var(--cs-signal))]',
  danger: 'text-[hsl(var(--cs-accent))]',
  warning: 'text-[hsl(var(--cs-accent))]',
  success: 'text-[hsl(var(--cs-signal))]',
};

interface MetricProps {
  value: ReactNode;
  size?: MetricSize;
  tone?: MetricTone;
  className?: string;
}

export function Metric({ value, size = 'md', tone = 'default', className }: MetricProps) {
  return (
    <span className={cn('font-display tabular-nums font-bold', SIZE_CLASSES[size], TONE_CLASSES[tone], className)}>
      {value}
    </span>
  );
}
