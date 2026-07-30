import { FileWarning, Plus, CheckCircle2 } from 'lucide-react';
import { formatInt, formatPct } from '@/lib/format';
import type { ClienteCarteira } from '@/hooks/cs';

interface ClientesSemPlanoProps {
  clientes: ClienteCarteira[];
  onCriarTarefa: (organizationId: string) => void;
}

/**
 * Clientes da carteira sem plano de ação ativo no mês corrente — sinalizado
 * por `aderencia_pct === null` (a RPC `cs_aderencia` volta null quando não
 * há jornada mensal ativa/concluída no período, ver
 * `cs_funcoes_novo_modelo.sql`). Isso é trabalho pendente por si só — não
 * apareceria em nenhuma lista de tarefas porque ninguém criou a tarefa
 * "montar o plano" ainda.
 */
export function ClientesSemPlano({ clientes, onCriarTarefa }: ClientesSemPlanoProps) {
  const semPlano = clientes.filter((c) => c.aderencia_pct === null);

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted">
            <FileWarning className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              CLIENTES SEM PLANO DO MÊS
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Nenhuma jornada mensal ativa no período — o mês não instalou ainda.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {semPlano.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="p-3 rounded-xl bg-muted/40 mb-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600/70" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Toda a carteira tem plano ativo</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              Os 7 clientes PCA já têm o mês corrente instalado.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {semPlano.map((c) => (
              <div key={c.organization_id} className="group flex items-center justify-between gap-3 px-1 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{c.nome}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">
                    <span className="font-display tabular-nums">{formatInt(c.dias_de_ciclo)}</span> dias de ciclo ·{' '}
                    <span className="font-display tabular-nums">{formatPct(c.pct_contrato, 0)}</span> do contrato
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onCriarTarefa(c.organization_id)}
                  className="shrink-0 h-8 rounded-lg text-[11px] font-medium border border-border/60 gap-1.5 px-3 inline-flex items-center text-muted-foreground hover:text-foreground hover:bg-muted/50 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Criar tarefa
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
