// Estado para quando o cliente NÃO tem plano publicado no mês selecionado.
// Redesign 2026-07-30: texto puro, sem ícone em caixa âmbar.
export function PlanoVazio({ mesLabel }: { mesLabel: string }) {
  return (
    <p className="text-sm text-muted-foreground leading-relaxed max-w-[620px]">
      Sem plano de ação publicado em {mesLabel}. Nenhuma jornada mensal foi encontrada para este cliente neste
      período — o plano do mês nasce no fechamento mensal.
    </p>
  );
}
