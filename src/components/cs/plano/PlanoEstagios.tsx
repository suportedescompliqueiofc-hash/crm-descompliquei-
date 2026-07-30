// O conteúdo real do plano — estágios com seus passos, na ordem em que o
// banco devolve (usePlanoConteudo). NÃO assume "estágio = semana": o número
// de estágios varia (visto em produção: 5, com títulos descritivos como
// "Estruturar a triagem..."), então o rótulo usado é sempre o
// `estagio_titulo` real, nunca "Semana N" forçado.
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatInt } from '@/lib/format';
import type { PlanoPasso } from '@/hooks/cs';

interface PlanoEstagiosProps {
  passos: PlanoPasso[];
  isLoading: boolean;
  /** total_passos de useAderencia — fonte distinta, usada só para detectar divergência. */
  totalAderencia: number | null;
}

interface EstagioAgrupado {
  estagio_id: string;
  estagio_titulo: string;
  passos: PlanoPasso[];
}

function agruparPorEstagio(passos: PlanoPasso[]): EstagioAgrupado[] {
  const grupos: EstagioAgrupado[] = [];
  const indice = new Map<string, EstagioAgrupado>();

  for (const p of passos) {
    let grupo = indice.get(p.estagio_id);
    if (!grupo) {
      grupo = { estagio_id: p.estagio_id, estagio_titulo: p.estagio_titulo, passos: [] };
      indice.set(p.estagio_id, grupo);
      grupos.push(grupo);
    }
    grupo.passos.push(p);
  }

  return grupos;
}

export function PlanoEstagios({ passos, isLoading, totalAderencia }: PlanoEstagiosProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-[12px] text-muted-foreground">Carregando o plano…</span>
      </div>
    );
  }

  if (passos.length === 0) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Nenhum passo encontrado no conteúdo do plano para este período.
        </p>
        {totalAderencia != null && totalAderencia > 0 && (
          <p className="text-[11px] text-amber-700 mt-2">
            A aderência aponta {formatInt(totalAderencia)} passo(s) neste período, mas o conteúdo do plano não
            retornou nenhum — provável mais de uma jornada mensal publicada no período.
          </p>
        )}
      </div>
    );
  }

  const estagios = agruparPorEstagio(passos);
  const divergente = totalAderencia != null && totalAderencia !== passos.length;

  return (
    <div className="space-y-4">
      {divergente && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/60 px-4 py-3">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-800">
            A contagem de passos diverge entre a aderência ({formatInt(totalAderencia)}) e o conteúdo do plano (
            {formatInt(passos.length)}) — provável mais de uma jornada mensal publicada no período. Os passos
            abaixo são os do conteúdo lido agora.
          </p>
        </div>
      )}

      {estagios.map((estagio) => {
        const concluidos = estagio.passos.filter((p) => p.concluido).length;
        return (
          <div
            key={estagio.estagio_id}
            className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03] flex items-center justify-between gap-3">
              <p className="text-[13px] font-semibold font-display text-foreground">{estagio.estagio_titulo}</p>
              <span className="text-[11px] font-display tabular-nums font-semibold text-muted-foreground shrink-0">
                {formatInt(concluidos)}/{formatInt(estagio.passos.length)}
              </span>
            </div>
            <div className="p-4 space-y-2">
              {estagio.passos.map((p) => (
                <div
                  key={p.passo_id}
                  className={cn(
                    'flex items-start gap-3 rounded-xl border px-4 py-3',
                    p.concluido ? 'border-emerald-200/60 bg-emerald-50/30' : 'border-border/40',
                  )}
                >
                  {p.concluido ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-foreground">
                      {p.passo_titulo}
                      {!p.obrigatorio && (
                        <span className="ml-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          opcional
                        </span>
                      )}
                    </p>
                    {p.passo_descricao && (
                      <p className="text-[12px] text-muted-foreground/70 mt-0.5">{p.passo_descricao}</p>
                    )}
                    {p.concluido && p.concluido_em && (
                      <p className="text-[10px] text-emerald-700/80 font-display tabular-nums mt-1">
                        Concluído em {format(new Date(p.concluido_em), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
