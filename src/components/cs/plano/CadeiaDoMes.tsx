// Elo trabalhado no mês + critério de sucesso, e a leitura da cadeia de elos
// do período (useClienteElos). Os TÍTULOS DAS AÇÕES já vêm de usePlanoConteudo
// (ver PlanoEstagios.tsx) — o gap que resta aqui é mais estreito: nem
// `jornadas` nem `jornada_estagios`/`jornada_passos` têm coluna para o elo
// declarado do plano nem para o critério de sucesso numérico (confirmado
// pelo maestro — decisão de schema pendente do CEO). "Elo em foco" abaixo é a
// leitura heurística de useCarteira() (elo_restricao), válida só para o mês
// corrente — não é necessariamente o elo que foi publicado no plano daquele
// mês histórico.
import { Info, Link2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClienteElo } from '@/hooks/cs';
import { formatEloValor } from '../eloMeta';

interface CadeiaDoMesProps {
  elos: ClienteElo[];
  isLoading: boolean;
  eloEmFoco: string | null;
  /** Só o mês corrente tem leitura de elo_restricao confiável (useCarteira). */
  mostrarEloEmFoco: boolean;
}

export function CadeiaDoMes({ elos, isLoading, eloEmFoco, mostrarEloEmFoco }: CadeiaDoMesProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted">
            <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              ELO DO MÊS E CRITÉRIO DE SUCESSO
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Leitura da cadeia de elos no período selecionado
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">Elo em foco</p>
            <p className="text-sm font-semibold font-display text-foreground mt-1">
              {mostrarEloEmFoco ? (eloEmFoco ?? '—') : '—'}
            </p>
            {!mostrarEloEmFoco && (
              <p className="text-[10px] text-muted-foreground/50 mt-1">Leitura disponível só para o mês em curso</p>
            )}
          </div>
          <div className="flex-1 rounded-xl border border-border/60 bg-muted/20 px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              Critério de sucesso
            </p>
            <p className="text-sm font-semibold font-display text-foreground mt-1">—</p>
            <p className="text-[10px] text-muted-foreground/50 mt-1">
              Texto do plano ainda não é exposto por nenhum hook de CS
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <span className="text-[12px] text-muted-foreground">Carregando cadeia de elos…</span>
          </div>
        ) : elos.length === 0 ? (
          <p className="text-[12px] text-muted-foreground/60 text-center py-6">Sem dado de elos para este período.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {elos.map((e) => (
              <div key={e.elo} className="rounded-xl border border-border/40 px-3 py-2.5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 truncate">
                  {e.elo}
                </p>
                <p
                  className={cn(
                    'text-[15px] font-bold font-display tabular-nums mt-0.5',
                    e.valor == null ? 'text-muted-foreground/40' : 'text-foreground',
                  )}
                >
                  {formatEloValor(e.elo, e.valor)}
                </p>
                {e.valor != null && !e.amostra_suficiente && (
                  <p className="text-[9px] text-amber-600 mt-0.5 flex items-center gap-0.5">
                    <Info className="h-2.5 w-2.5" /> amostra baixa
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
