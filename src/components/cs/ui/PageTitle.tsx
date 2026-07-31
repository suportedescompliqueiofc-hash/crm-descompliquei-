// Cabeçalho de página do app de CS — o oposto deliberado do PageHero da
// plataforma do cliente (sem gradiente, sem glow, sem ícone, sem ~300px de
// altura). O app de CS é aberto todo dia de manhã por uma pessoa com pressa;
// o cabeçalho não pode competir com o conteúdo por atenção — ver
// 05-operacoes-e-cs/sistema/design-cs.md, princípio 1.
//
// Use no topo de TODA página do app de CS, sempre — nunca reconstrua um
// título na mão. `description` é uma frase corrida (pode incluir um
// <Metric> embutido para o único número grande da tela — ver princípio 4).
import type { ReactNode } from 'react';

interface PageTitleProps {
  title: string;
  description?: ReactNode;
  /** Controle secundário à direita do título — filtro, toggle. Use com moderação. */
  action?: ReactNode;
}

export function PageTitle({ title, description, action }: PageTitleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2 min-w-0">
        <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">{title}</h1>
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
