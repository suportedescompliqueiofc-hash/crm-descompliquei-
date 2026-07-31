// Indicador de estado do console.
//
// O `tone` continua usando o vocabulário de `cs_carteira.nivel_risco`
// (critico/atencao/saudavel/referencia) porque é o que vem do banco — mas a
// TRADUÇÃO visual mudou e é o ponto inteiro deste arquivo: não existe mais
// semáforo. O CEO reprovou vermelho/âmbar/verde nominalmente em 2026-07-30
// ("crítico, atenção, saudável... essas cores me incomodam") — ver
// 05-operacoes-e-cs/sistema/design-cs.md.
//
// A escala nova tem duas posições, não quatro:
//   • laranja  → exige ação (critico, atencao)
//   • petróleo → o método está de pé (saudavel, referencia)
//   • neutro   → sem medição
// Perde-se granularidade de cor de propósito: a ordem da fila e a FRASE já
// carregam a gravidade; a cor só responde "preciso agir?".
//
// E continua valendo: as palavras crítico/atenção/saudável NUNCA aparecem na
// interface. O `label` que chega aqui é sempre uma frase traduzida.
import { cn } from '@/lib/utils';

export type StatusTone = 'critico' | 'atencao' | 'saudavel' | 'referencia' | 'neutro';

const MARK_TONE: Record<StatusTone, string> = {
  critico: 'bg-[hsl(var(--cs-accent))]',
  atencao: 'bg-[hsl(var(--cs-accent))]/45',
  saudavel: 'bg-[hsl(var(--cs-signal))]',
  referencia: 'bg-[hsl(var(--cs-signal))]/45',
  neutro: 'bg-muted-foreground/30',
};

const TEXT_TONE: Record<StatusTone, string> = {
  critico: 'text-[hsl(var(--cs-accent))]',
  atencao: 'text-foreground/80',
  saudavel: 'text-[hsl(var(--cs-signal))]',
  referencia: 'text-foreground/80',
  neutro: 'text-muted-foreground',
};

interface StatusIndicatorProps {
  tone: StatusTone;
  label: string;
  className?: string;
}

export function StatusIndicator({ tone, label, className }: StatusIndicatorProps) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[12.5px] font-medium', TEXT_TONE[tone], className)}>
      <span className={cn('h-[7px] w-[7px] rounded-[2px] shrink-0', MARK_TONE[tone])} />
      {label}
    </span>
  );
}

/** Só o marcador, para a calha do ListRow. */
export function StatusMark({ tone, className }: { tone: StatusTone; className?: string }) {
  return <span className={cn('block h-[7px] w-[7px] rounded-[2px] mt-1.5', MARK_TONE[tone], className)} />;
}
