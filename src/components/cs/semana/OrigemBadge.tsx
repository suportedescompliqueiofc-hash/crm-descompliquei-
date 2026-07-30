import { cn } from '@/lib/utils';
import type { OrigemTarefa } from '@/hooks/cs';
import { ORIGEM_CONFIG } from './constants';

/**
 * Badge de origem da tarefa — distingue de relance uma tarefa que veio do
 * plano de ação do cliente (`plano`) de uma criada na mão (`manual`) ou
 * gerada pelo sistema (`sistema`). Padrão "trio" do design system: fundo
 * pastel + texto escuro + borda combinando.
 */
export function OrigemBadge({ origem, className }: { origem: OrigemTarefa; className?: string }) {
  const cfg = ORIGEM_CONFIG[origem] ?? ORIGEM_CONFIG.manual;
  const Icon = cfg.icon;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border shrink-0',
        cfg.className,
        className,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {cfg.label}
    </span>
  );
}
