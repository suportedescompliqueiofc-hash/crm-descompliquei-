// Estado vazio do console — texto, sem ícone em caixa (a plataforma do
// cliente usa `p-3 rounded-xl bg-muted/40` + ícone Lucide; aqui isso é
// exatamente o símbolo decorativo que o CEO mandou tirar).
//
// O que mudou em 2026-07-31: o vazio agora tem TEXTURA — fundo hachurado
// leve e altura menor. Um vazio branco liso dentro de um painel branco é
// indistinguível de "quebrou"; a hachura diz "este espaço existe e está
// reservado", que é a informação certa.
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
    <div
      className={cn('rounded-lg border border-dashed border-border px-4 py-8 text-center', className)}
      // Hachura via style: o modificador de opacidade do Tailwind (`/40`) não
      // se aplica a `background-image` arbitrário — em classe, isso viraria
      // uma regra inválida e silenciosa.
      style={{
        backgroundImage:
          'repeating-linear-gradient(135deg, hsl(var(--muted)) 0px, hsl(var(--muted)) 5px, transparent 5px, transparent 11px)',
      }}
    >
      <p className="text-[13px] font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-[11.5px] text-muted-foreground/60 mt-1 max-w-[52ch] mx-auto leading-snug">{description}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
