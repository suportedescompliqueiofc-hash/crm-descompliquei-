// O relógio do contrato — percentual dos 180 dias do PCA consumido e quantos
// dias restam (ver 05-operacoes-e-cs/sistema/01-a-cadeia.md, "aritmética do
// ciclo": 180 dias = 6 planos mensais).
import { Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatInt, formatPct } from '@/lib/format';

const DIAS_CICLO_PCA = 180;

interface RelogioContratoProps {
  diasDeCiclo: number | null | undefined;
  pctContrato: number | null | undefined;
  isLoading: boolean;
}

export function RelogioContrato({ diasDeCiclo, pctContrato, isLoading }: RelogioContratoProps) {
  const diasRestantes = diasDeCiclo != null ? Math.max(DIAS_CICLO_PCA - diasDeCiclo, 0) : null;
  const pct = pctContrato != null ? Math.min(Math.max(pctContrato, 0), 100) : null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">RELÓGIO DO CONTRATO</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Ciclo de {formatInt(DIAS_CICLO_PCA)} dias do PCA</p>
          </div>
        </div>
      </div>

      <div className="p-5 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : diasDeCiclo == null || pct == null ? (
          <p className="text-sm text-muted-foreground text-center py-10">Sem data de cadastro para calcular o ciclo.</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[28px] leading-none font-bold font-display tabular-nums text-foreground">
                  {formatInt(diasDeCiclo)}
                  <span className="text-[15px] text-muted-foreground/50 font-normal"> / {formatInt(DIAS_CICLO_PCA)} dias</span>
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">consumidos do ciclo</p>
              </div>
              <div className="text-right">
                <p
                  className={cn(
                    'text-[20px] leading-none font-bold font-display tabular-nums',
                    pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-amber-600' : 'text-foreground',
                  )}
                >
                  {formatPct(pct, 0)}
                </p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">do contrato</p>
              </div>
            </div>

            <div className="h-2.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={cn('h-full rounded-full', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500')}
                style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%` }}
              />
            </div>

            <p className="text-[12px] text-muted-foreground">
              <span className="font-display tabular-nums font-semibold text-foreground">{formatInt(diasRestantes ?? 0)}</span> dias
              restantes até o fim do ciclo de 180 dias.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
