/**
 * Taxonomia fixa de categoria e prioridade das ações do Plano de Ação (Jornada mensal).
 * Preenchida pelo CS ao publicar o plano (ver 05-operacoes-e-cs/sistema/05-publicar-plano.md).
 */

// Valor salvo no banco continua 'pratica' (categoria IS NULL OR categoria IN ('tarefa','pratica'))
// — só o rótulo exibido mudou de "Prática" para "Orientação".
export const CATEGORIA_LABEL: Record<string, string> = {
  tarefa: "Tarefa",
  pratica: "Orientação",
};

export const CATEGORIA_DESC: Record<string, string> = {
  tarefa: "Ação pontual — faz uma vez (ou repete de forma objetiva) e marca como feita.",
  pratica: "Um jeito novo de conduzir a conversa, vale a semana toda — não é um check único.",
};

export const PRIORIDADE_LABEL: Record<string, string> = {
  critica: "Crítica",
  importante: "Importante",
  manutencao: "Manutenção",
};

export const PRIORIDADE_DESC: Record<string, string> = {
  critica: "Precisa ser aplicada já, sem exceção — é o ponto que mais trava o resultado do mês.",
  importante: "Tem peso real no resultado, mas não é o gargalo principal do mês.",
  manutencao: "Já está funcionando — o trabalho é só manter rodando, sem virar novidade.",
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
