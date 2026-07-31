// Chip e Evidência — os dois rótulos pequenos do console.
//
// CHIP substitui o "badge trio" da plataforma do cliente (fundo pastel +
// borda + ícone Lucide dentro). Aqui é retângulo baixo, canto pequeno, sem
// ícone nenhum. As três cores têm cargo fixo e não se misturam:
//   • neutral → estado sem carga (contagem, categoria, rótulo de tipo)
//   • accent  → laranja: pede ação, está atrasado, é o elo-restrição
//   • signal  → petróleo: é vocabulário do MÉTODO (elo, camada, rito)
// Não existe chip verde nem vermelho de status — reprovado pelo CEO
// (2026-07-30). Vermelho no console é erro técnico, e vive no ErrorState.
//
// EVIDÊNCIA é o outro extremo: a origem do dado no banco
// (`agendamentos.status`, `metas.ativo = true`). Vai em mono, minúscula,
// esmaecida. É o único lugar do app onde `font-mono` é permitido — porque
// ali o texto É um identificador de banco, não um número de interface. Ela
// carrega a diferença entre "o sistema afirma" e "o sistema mostra de onde
// tirou", que é o que faz o João confiar na tela.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ChipTone = 'neutral' | 'accent' | 'signal' | 'outline';

const CHIP_TONE: Record<ChipTone, string> = {
  neutral: 'bg-muted text-muted-foreground',
  accent: 'bg-[hsl(var(--cs-accent-soft))] text-[hsl(var(--cs-accent))] border border-[hsl(var(--cs-accent-line))]',
  signal: 'bg-[hsl(var(--cs-signal-soft))] text-[hsl(var(--cs-signal))]',
  outline: 'border border-border text-muted-foreground bg-card',
};

interface ChipProps {
  children: ReactNode;
  tone?: ChipTone;
  className?: string;
}

export function Chip({ children, tone = 'neutral', className }: ChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center h-[19px] px-1.5 rounded-[5px] text-[10.5px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap',
        CHIP_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * Origem do dado no banco. Só para identificador técnico real — nunca para
 * texto corrido "parecer técnico".
 */
export function Evidence({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <code
      className={cn(
        'font-mono text-[10.5px] leading-[1.5] text-muted-foreground/65 bg-muted/60 rounded px-1 py-px break-all',
        className,
      )}
    >
      {children}
    </code>
  );
}
