// Aderência ao plano corrente — total de passos, concluídos, percentual e a
// quebra por semana (useAderencia). Mede se o plano do mês foi de fato
// executado, antes de qualquer decisão de trocar de elo (02-diagnostico.md,
// passo 6: "nunca trocar de elo por falta de resultado sem antes olhar aderência").
import { ListChecks, Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { formatInt, formatPct } from '@/lib/format';
import type { Aderencia } from '@/hooks/cs';

interface AderenciaPlanoProps {
  aderencia: Aderencia | undefined;
  isLoading: boolean;
}

export function AderenciaPlano({ aderencia, isLoading }: AderenciaPlanoProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">ADERÊNCIA AO PLANO</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Passos concluídos do plano do mês corrente</p>
          </div>
        </div>
      </div>

      <div className="p-4 flex-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !aderencia || aderencia.total_passos === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-xl bg-muted/40 mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Sem plano publicado neste mês</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Assim que o plano do mês for publicado, a aderência aparece aqui.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <StatCardGrid cols={3} bare>
              <StatCard label="Total de passos" value={formatInt(aderencia.total_passos)} />
              <StatCard label="Concluídos" value={formatInt(aderencia.passos_concluidos)} />
              <StatCard
                label="Aderência"
                value={formatPct(aderencia.pct)}
                dotColor={aderencia.pct >= 70 ? '#059669' : aderencia.pct >= 40 ? '#f59e0b' : '#dc2626'}
              />
            </StatCardGrid>

            {aderencia.por_semana.length > 0 && (
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-2.5">Por semana</p>
                <div className="space-y-2.5">
                  {aderencia.por_semana.map((semana) => (
                    <div key={semana.semana}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-foreground">Semana {semana.semana}</span>
                        <span className="text-[11px] text-muted-foreground/60 font-display tabular-nums">
                          {formatInt(semana.passos_concluidos)} de {formatInt(semana.total_passos)} · {formatPct(semana.pct)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full',
                            semana.pct >= 70 ? 'bg-emerald-500' : semana.pct >= 40 ? 'bg-amber-500' : 'bg-red-500',
                          )}
                          style={{ width: `${Math.max(Math.min(semana.pct, 100), semana.pct > 0 ? 3 : 0)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
