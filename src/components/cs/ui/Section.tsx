// Seção de conteúdo do app de CS — substitui o card com header em pill
// (ícone + overline + shadow) da plataforma do cliente. Hierarquia vem de
// tipografia e espaço, nunca de caixa — ver design-cs.md, princípio 3.
//
// Empilhe seções dentro de um container com `divide-y divide-border/60` (a
// própria Carteira.tsx faz isso) para que o filete apareça só ENTRE seções,
// nunca ao redor de cada uma — "no máximo um filete", não uma moldura.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  /** Overline curto, maiúsculo — omita se a seção não precisar de rótulo (ex.: única seção da tela). */
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, description, children, className }: SectionProps) {
  return (
    <section className={cn('py-8 first:pt-0 space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-0.5">
          {title && (
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/60">{title}</h2>
          )}
          {description && <p className="text-xs text-muted-foreground/50">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}
