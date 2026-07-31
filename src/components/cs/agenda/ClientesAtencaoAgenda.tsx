// Clientes há muito tempo sem reunião — "é o tipo de coisa que só aparece se
// alguém olhar, e ninguém olha". Vira Panel com tone="accent": é o bloco
// desta tela que pede ação AGORA (agendar). O número de dias vira
// <Metric tone="accent"> no trailing de cada linha — todo número do console
// passa por Metric, nunca por peso de fonte cru.
import { formatInt } from '@/lib/format';
import { Panel, PanelHeader, PanelBody, PanelRows, ListRow, Metric } from '@/components/cs/ui';

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
    <Panel tone="accent">
      <PanelHeader title="Sem reunião há muito tempo" hint="clique para agendar" />
      <PanelBody flush>
        <PanelRows>
          {atrasados.map((c) => (
            <ListRow
              key={c.organization_id}
              onClick={() => onSelecionar(c.organization_id)}
              trailing={
                <Metric
                  size="sm"
                  tone="accent"
                  value={c.diasSemReuniao === null ? 'nunca' : `${formatInt(c.diasSemReuniao)}d`}
                />
              }
            >
              <p className="text-[13px] text-foreground">{c.nome}</p>
            </ListRow>
          ))}
        </PanelRows>
      </PanelBody>
    </Panel>
  );
}
