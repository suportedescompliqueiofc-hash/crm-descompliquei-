// Clientes há muito tempo sem reunião — "é o tipo de coisa que só aparece se
// alguém olhar, e ninguém olha". Redesign 2026-07-30: sentença, sem ícone
// nem cor; peso de fonte no número de dias no lugar de vermelho/âmbar.
import { formatInt } from '@/lib/format';
import { Section } from '@/components/cs/ui';

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
    <Section title="Há muito tempo sem reunião" description="Clique para agendar uma reunião com o cliente.">
      <div className="divide-y divide-border/40">
        {atrasados.map((c) => (
          <button
            key={c.organization_id}
            type="button"
            onClick={() => onSelecionar(c.organization_id)}
            className="w-full flex items-center justify-between gap-3 py-2.5 text-left hover:bg-muted/30 -mx-2 px-2 rounded-lg transition-colors"
          >
            <span className="text-sm text-foreground">{c.nome}</span>
            <span className="text-[12px] font-display tabular-nums font-semibold text-foreground shrink-0">
              {c.diasSemReuniao === null ? 'Nunca teve reunião' : `${formatInt(c.diasSemReuniao)} dias sem reunião`}
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}
