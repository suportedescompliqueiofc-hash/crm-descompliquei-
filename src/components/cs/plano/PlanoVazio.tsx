// Estado para quando o cliente NÃO tem plano publicado no mês selecionado —
// informação importante e acionável, não uma tela vazia genérica. Detectado
// via useAderencia() retornando total_passos = 0 (cs_aderencia sempre retorna
// zeros/[] quando não há jornada mensal ativa/concluída no período — nunca erro).
import { CalendarX2 } from 'lucide-react';

export function PlanoVazio({ mesLabel }: { mesLabel: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className="p-3 rounded-xl bg-amber-50 mb-3">
          <CalendarX2 className="h-6 w-6 text-amber-600" />
        </div>
        <p className="text-sm font-semibold text-foreground">Sem plano de ação publicado em {mesLabel}</p>
        <p className="text-[12px] text-muted-foreground/70 mt-1 max-w-md">
          Nenhuma jornada mensal foi encontrada para este cliente neste período. Sem plano, não há o que medir de
          aderência — o plano do mês nasce no fechamento mensal (skill /cs-mes).
        </p>
      </div>
    </div>
  );
}
