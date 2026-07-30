// Constantes de exibição da tela Semana — rótulos, cores e ícones para os
// enums de `cs_tarefas` (dono, origem, prioridade). Fonte única para manter
// os badges consistentes entre TarefaItem, TarefaFormDialog e filtros.
import { Bot, User, ClipboardList, PenLine, Cog, type LucideIcon } from 'lucide-react';
import type { DonoTarefa, OrigemTarefa } from '@/hooks/cs';

export const DONO_CONFIG: Record<DonoTarefa, { label: string; icon: LucideIcon }> = {
  joao: { label: 'João', icon: User },
  claude: { label: 'Claude', icon: Bot },
};

export const ORIGEM_CONFIG: Record<OrigemTarefa, { label: string; icon: LucideIcon; className: string }> = {
  plano: {
    label: 'Plano',
    icon: ClipboardList,
    className: 'bg-blue-50 text-blue-700 border-blue-200/60',
  },
  manual: {
    label: 'Manual',
    icon: PenLine,
    className: 'bg-muted/50 text-muted-foreground border-border/40',
  },
  sistema: {
    label: 'Sistema',
    icon: Cog,
    className: 'bg-violet-50 text-violet-700 border-violet-200/60',
  },
};

/** 3 níveis de prioridade para o formulário — o campo no banco é numérico livre. */
export const PRIORIDADE_OPTIONS = [
  { value: 0, label: 'Normal' },
  { value: 1, label: 'Alta' },
  { value: 2, label: 'Urgente' },
] as const;

export function prioridadeLabel(prioridade: number): string {
  if (prioridade >= 2) return 'Urgente';
  if (prioridade === 1) return 'Alta';
  return 'Normal';
}

export function prioridadeDotColor(prioridade: number): string {
  if (prioridade >= 2) return '#dc2626'; // vermelho — urgente
  if (prioridade === 1) return '#d97706'; // âmbar — alta
  return '#94a3b8'; // cinza — normal
}
