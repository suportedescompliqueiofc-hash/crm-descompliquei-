// Estado vazio do console — texto, sem ícone em caixa (a plataforma do
// cliente usa `p-3 rounded-xl bg-muted/40` + ícone Lucide; aqui isso é
// exatamente o símbolo decorativo que o CEO mandou tirar).
//
// Histórico curto: cheguei a pôr uma hachura diagonal no fundo, com o
// argumento de que ela dizia "este espaço existe e está reservado". O CEO
// tirou em 2026-07-31 ("essas marcaçõezinhas na cinza não fizeram sentido") —
// e estava certo: o fio tracejado JÁ diz que o espaço é um lugar vazio, e a
// hachura só somava ruído a um bloco cuja função é não chamar atenção. O
// vazio é o estado menos importante da tela; ele informa e sai do caminho.
//
// Duas linhas bastam: o que está vazio, e o que fazer a respeito. `action`
// é para quando o vazio tem uma saída óbvia (criar tarefa, publicar plano).
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('rounded-lg border border-dashed border-border px-4 py-7 text-center', className)}>
      <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-[11.5px] text-muted-foreground/60 mt-1 max-w-[52ch] mx-auto leading-snug">{description}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
