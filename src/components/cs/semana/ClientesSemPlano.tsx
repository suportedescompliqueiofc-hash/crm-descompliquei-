// Clientes da carteira sem plano de ação ativo no mês corrente — sinalizado
// por `aderencia_pct === null`. Vira um Panel de linhas: cada cliente é uma
// ListRow com a ação "Criar tarefa" no trailing — é trabalho pendente por si
// só, mesmo sem tarefa criada pra isso, então ganha painel próprio em vez de
// viver dentro do painel de tarefas.
import { formatInt, formatPct } from '@/lib/format';
import type { ClienteCarteira } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, PanelRows, ListRow, Action, EmptyState } from '@/components/cs/ui';

interface ClientesSemPlanoProps {
  clientes: ClienteCarteira[];
  onCriarTarefa: (organizationId: string) => void;
}

export function ClientesSemPlano({ clientes, onCriarTarefa }: ClientesSemPlanoProps) {
  const semPlano = clientes.filter((c) => c.aderencia_pct === null);

  return (
    <Panel>
      <PanelHeader title="Clientes sem plano do mês" hint="nenhuma jornada mensal ativa no período" />
      {semPlano.length === 0 ? (
        <PanelBody>
          <EmptyState
            title="Toda a carteira tem plano ativo"
            description="Os clientes PCA já têm o mês corrente instalado."
          />
        </PanelBody>
      ) : (
        <PanelBody flush>
          <PanelRows>
            {semPlano.map((c) => (
              <ListRow
                key={c.organization_id}
                trailing={
                  <Action variant="outline" size="sm" onClick={() => onCriarTarefa(c.organization_id)}>
                    Criar tarefa
                  </Action>
                }
              >
                <p className="text-[13px] text-foreground">
                  {c.nome} — {formatInt(c.dias_de_ciclo)} dias de ciclo, {formatPct(c.pct_contrato, 0)} do contrato.
                </p>
              </ListRow>
            ))}
          </PanelRows>
        </PanelBody>
      )}
    </Panel>
  );
}
