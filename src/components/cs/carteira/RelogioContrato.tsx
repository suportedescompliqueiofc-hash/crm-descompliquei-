import { formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { corRelogioContrato } from './utils';

/**
 * Relógio do contrato: percentual dos 180 dias do ciclo PCA já consumido.
 * É o sinal de urgência mais forte da régua de risco — quanto mais avançado,
 * mais quente a cor da barra (ver 05-operacoes-e-cs/sistema/ritos/01-regua-de-risco.md).
 */
export function RelogioContrato({ pctContrato }: { pctContrato: number }) {
  const pct = Number.isFinite(pctContrato) ? pctContrato : 0;
  const clamped = Math.min(100, Math.max(0, pct));

  return (
    <div className="space-y-1 max-w-[220px]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground/50">Relógio do contrato</span>
        <span className="text-[10px] font-display tabular-nums font-semibold text-foreground/70">
          {formatPct(pct, 0)}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', corRelogioContrato(pct))}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
