// Clientes há muito tempo sem reunião — "é o tipo de coisa que só aparece se
// alguém olhar, e ninguém olha" (instrução da tarefa). Calculado no Agenda.tsx
// a partir de useReunioes() (última reunião REALIZADA por cliente) + useCarteira().
import { AlertTriangle, UserX } from 'lucide-react';
import { formatInt } from '@/lib/format';
import { cn } from '@/lib/utils';

export interface ClienteAtrasoAgenda {
  organization_id: string;
  nome: string;
  /** null = nunca teve reunião marcada como realizada. */
  diasSemReuniao: number | null;
}

interface ClientesAtencaoAgendaProps {
  atrasados: ClienteAtrasoAgenda[];
  onSelecionar: (orgId: string) => void;
}

export function ClientesAtencaoAgenda({ atrasados, onSelecionar }: ClientesAtencaoAgendaProps) {
  if (atrasados.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-amber-50">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              HÁ MUITO TEMPO SEM REUNIÃO
            </p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">
              Clique para agendar uma reunião com o cliente
            </p>
          </div>
        </div>
      </div>
      <div className="p-4 space-y-2">
        {atrasados.map((c) => (
          <button
            key={c.organization_id}
            type="button"
            onClick={() => onSelecionar(c.organization_id)}
            className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-border/40 hover:bg-muted/30 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-[13px] font-medium text-foreground">
              <UserX className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
              {c.nome}
            </span>
            <span
              className={cn(
                'text-[11px] font-display tabular-nums font-semibold shrink-0',
                c.diasSemReuniao === null || c.diasSemReuniao > 30 ? 'text-red-600' : 'text-amber-600',
              )}
            >
              {c.diasSemReuniao === null ? 'Nunca teve reunião' : `${formatInt(c.diasSemReuniao)} dias sem reunião`}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
