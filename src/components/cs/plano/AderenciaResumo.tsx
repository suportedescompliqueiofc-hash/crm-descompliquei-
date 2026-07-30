// A aderência em destaque — o número que decide a conversa do mês
// (05-operacoes-e-cs/sistema/ritos/04-reuniao-mensal.md, bloco 3). Total de
// passos, concluídos, percentual, e a quebra por semana, via useAderencia().
import { CheckCircle2, ListChecks, Percent } from 'lucide-react';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { formatInt, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Aderencia } from '@/hooks/cs';

interface AderenciaResumoProps {
  aderencia: Aderencia | undefined;
  isLoading: boolean;
}

export function AderenciaResumo({ aderencia, isLoading }: AderenciaResumoProps) {
  const porSemana = aderencia?.por_semana ?? [];

  return (
    <div className="space-y-4">
      <StatCardGrid cols={3}>
        <StatCard
          label="Passos do plano"
          value={isLoading ? '—' : formatInt(aderencia?.total_passos ?? 0)}
          icon={ListChecks}
        />
        <StatCard
          label="Concluídos"
          value={isLoading ? '—' : formatInt(aderencia?.passos_concluidos ?? 0)}
          icon={CheckCircle2}
        />
        <StatCard
          label="Aderência"
          value={isLoading ? '—' : formatPct(aderencia?.pct ?? 0)}
          icon={Percent}
        />
      </StatCardGrid>

      {!isLoading && porSemana.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {porSemana.map((s) => (
            <div
              key={s.semana}
              className="rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 space-y-2"
            >
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                Semana {s.semana}
              </p>
              <p className="text-[20px] font-bold font-display tabular-nums text-foreground">
                {formatPct(s.pct)}
              </p>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full',
                    s.pct >= 70 ? 'bg-emerald-500' : s.pct >= 30 ? 'bg-amber-500' : 'bg-red-500',
                  )}
                  style={{ width: `${Math.min(100, s.pct)}%` }}
                />
              </div>
              <p className="text-[11px] text-muted-foreground/60 font-display tabular-nums">
                {formatInt(s.passos_concluidos)} de {formatInt(s.total_passos)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
