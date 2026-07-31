// Estado de carregamento do console — barras fantasma, não spinner nem
// texto pulsante.
//
// Motivo: o esqueleto preserva a ALTURA e o ritmo do bloco que vai chegar.
// Com texto pulsante centralizado, cada painel encolhe e o layout inteiro
// pula quando o dado carrega — o que faz a tela parecer instável. Aqui nada
// se move. Mantida a regra de zero símbolo decorativo (sem spinner).
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  /** Quantas linhas fantasma. Aproxime da altura real do bloco. */
  rows?: number;
  /** Texto para leitor de tela — não é exibido. */
  label?: string;
  className?: string;
}

export function LoadingState({ rows = 3, label = 'Carregando…', className }: LoadingStateProps) {
  return (
    <div className={cn('space-y-2.5 py-1', className)} role="status" aria-busy="true">
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="h-2.5 rounded bg-muted flex-1" style={{ maxWidth: `${88 - i * 13}%` }} />
          <div className="h-2.5 w-10 rounded bg-muted/70" />
        </div>
      ))}
    </div>
  );
}
