/**
 * Taxonomia fixa de categorias de "Meus Materiais" — mantida em sincronia manual
 * com o enum da tool `criar_material` em supabase/functions/descompliquei-os/index.ts
 * (runtimes diferentes — Deno edge function vs. Vite frontend — não dá para compartilhar módulo).
 */
export const MATERIAL_CATEGORIAS = [
  { value: "script_atendimento", label: "Script de Atendimento" },
  { value: "estrutura_processo", label: "Estrutura de Processo Comercial" },
  { value: "quebra_objecao", label: "Quebra de Objeção" },
  { value: "oferta", label: "Oferta e Precificação" },
  { value: "followup_reativacao", label: "Follow-up e Reativação" },
  { value: "otimizacao_comercial", label: "Otimização Comercial" },
  { value: "outro", label: "Outro" },
] as const;

export type MaterialCategoria = (typeof MATERIAL_CATEGORIAS)[number]["value"];

export function materialCategoriaLabel(categoria: string | null): string {
  return MATERIAL_CATEGORIAS.find((c) => c.value === categoria)?.label ?? "Sem categoria";
}

/** Cor de faixa da "capa" por categoria — usada no card e no topo do material aberto. */
export const MATERIAL_CATEGORIA_COR: Record<string, string> = {
  script_atendimento: "bg-sky-500",
  estrutura_processo: "bg-violet-500",
  quebra_objecao: "bg-rose-500",
  oferta: "bg-emerald-500",
  followup_reativacao: "bg-amber-500",
  otimizacao_comercial: "bg-indigo-500",
  outro: "bg-slate-400",
};

export function materialCategoriaCor(categoria: string | null): string {
  return MATERIAL_CATEGORIA_COR[categoria ?? "outro"] ?? MATERIAL_CATEGORIA_COR.outro;
}
