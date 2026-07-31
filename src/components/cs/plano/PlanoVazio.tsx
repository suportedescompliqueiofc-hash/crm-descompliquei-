// Estado para quando o cliente NÃO tem plano publicado no mês selecionado.
// Redesign 2026-07-30: texto puro, sem ícone em caixa âmbar.
// Redesign 2026-07-31: vira <EmptyState> — o vazio precisa da mesma textura
// hachurada do resto do console (ver EmptyState.tsx), não mais um parágrafo
// solto sobre o canvas dentro do painel do mês.
import { EmptyState } from '@/components/cs/ui';

export function PlanoVazio({ mesLabel }: { mesLabel: string }) {
  return (
    <EmptyState
      title={`Sem plano publicado em ${mesLabel}`}
      description="Nenhuma jornada mensal foi encontrada para este cliente neste período — o plano do mês nasce no fechamento mensal."
    />
  );
}
