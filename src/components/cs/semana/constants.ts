// Rótulos de exibição da tela Semana — dono, origem e prioridade de
// `cs_tarefas`. Redesign 2026-07-30: nada de ícone nem de cor por trás
// destes rótulos — texto puro, peso de fonte quando precisa de ênfase.
import type { DonoTarefa, OrigemTarefa } from '@/hooks/cs';

export const DONO_CONFIG: Record<DonoTarefa, { label: string }> = {
  joao: { label: 'João' },
  claude: { label: 'Claude' },
};

export const ORIGEM_LABEL: Record<OrigemTarefa, string> = {
  plano: 'do plano',
  manual: 'manual',
  sistema: 'do sistema',
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
