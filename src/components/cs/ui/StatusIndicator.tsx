// Indicador de estado do app de CS — substitui o "badge trio" (fundo pastel
// + borda + ícone Lucide embutido) da plataforma do cliente por um ponto de
// cor + texto. Cor é exceção (princípio 5): o ponto carrega o significado,
// nunca um ícone — ver design-cs.md.
//
// `tone` usa o MESMO vocabulário de `cs_carteira.nivel_risco` que já existe
// no banco (critico/atencao/saudavel/referencia) — não crie um mapeamento
// novo em cada tela, importe este.
import { cn } from '@/lib/utils';

export type StatusTone = 'critico' | 'atencao' | 'saudavel' | 'referencia' | 'neutro';

const DOT_TONE: Record<StatusTone, string> = {
  critico: 'bg-red-500',
  atencao: 'bg-amber-500',
  saudavel: 'bg-emerald-500',
  referencia: 'bg-blue-500',
  neutro: 'bg-muted-foreground/40',
};

const TEXT_TONE: Record<StatusTone, string> = {
  critico: 'text-red-700 dark:text-red-400',
  atencao: 'text-amber-700 dark:text-amber-400',
  saudavel: 'text-emerald-700 dark:text-emerald-400',
  referencia: 'text-blue-700 dark:text-blue-400',
  neutro: 'text-muted-foreground',
};

interface StatusIndicatorProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

export function StatusIndicator({ tone, label, className }: StatusIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[13px] font-medium', TEXT_TONE[tone], className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', DOT_TONE[tone])} />
      {label}
    </span>
  );
}
