/**
 * Taxonomia fixa de categoria e prioridade das ações do Plano de Ação (Jornada mensal).
 * Preenchida pelo CS ao publicar o plano (ver 05-operacoes-e-cs/sistema/05-publicar-plano.md).
 */

export const CATEGORIA_LABEL: Record<string, string> = {
  tarefa: "Tarefa",
  pratica: "Prática",
};

export const PRIORIDADE_LABEL: Record<string, string> = {
  critica: "Crítica",
  importante: "Importante",
  manutencao: "Manutenção",
};

// Trio padrão do design system: background pastel + texto escuro + dot de cor.
export const PRIORIDADE_BADGE: Record<string, string> = {
  critica: "bg-rose-50 text-rose-700 border-rose-200",
  importante: "bg-amber-50 text-amber-700 border-amber-200",
  manutencao: "bg-slate-50 text-slate-600 border-slate-200",
};

export const PRIORIDADE_DOT: Record<string, string> = {
  critica: "bg-rose-500",
  importante: "bg-amber-500",
  manutencao: "bg-slate-400",
};

export function categoriaLabel(categoria: string | null | undefined): string | null {
  return categoria ? CATEGORIA_LABEL[categoria] ?? null : null;
}

export function prioridadeLabel(prioridade: string | null | undefined): string | null {
  return prioridade ? PRIORIDADE_LABEL[prioridade] ?? null : null;
}
