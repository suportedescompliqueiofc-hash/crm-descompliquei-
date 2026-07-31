// Valor numérico do app de CS — todo número/valor/data/percentual exibido
// passa por aqui. Mantém a única regra que fica da plataforma: `font-display
// tabular-nums` sempre JUNTOS na mesma tag (nunca isolados — cai num bug
// latente do CSS base que joga o número para JetBrains Mono). Formate o
// valor ANTES de passar (`formatBRL`/`formatInt`/`formatPct` de `@/lib/format`;
// "sem dado" é sempre '—').
//
// `size="lg"` é o número grande da tela — no MÁXIMO um por tela (princípio
// 4). `size="md"` é o valor padrão de linha de lista/seção. `size="sm"` é
// para contextos apertados (célula estreita, texto inline).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MetricSize = 'lg' | 'md' | 'sm';
type MetricTone = 'default' | 'muted' | 'danger' | 'warning' | 'success';

const SIZE_CLASSES: Record<MetricSize, string> = {
  lg: 'text-[40px] leading-[1.05]',
  md: 'text-base',
  sm: 'text-sm',
};

const TONE_CLASSES: Record<MetricTone, string> = {
  default: 'text-foreground',
  muted: 'text-muted-foreground',
  danger: 'text-red-600',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
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
