// Clientes da carteira sem plano de ação ativo no mês corrente — sinalizado
// por `aderencia_pct === null`. Redesign 2026-07-30: sentença, não card com
// ícone. É trabalho pendente por si só, mesmo sem tarefa criada pra isso.
import { formatInt, formatPct } from '@/lib/format';
import type { ClienteCarteira } from '@/hooks/cs';
import { Section, EmptyState } from '@/components/cs/ui';

interface ClientesSemPlanoProps {
  clientes: ClienteCarteira[];
  onCriarTarefa: (organizationId: string) => void;
}

export function ClientesSemPlano({ clientes, onCriarTarefa }: ClientesSemPlanoProps) {
  const semPlano = clientes.filter((c) => c.aderencia_pct === null);

  return (
    <Section
      title="Clientes sem plano do mês"
      description="Nenhuma jornada mensal ativa no período — o mês não instalou ainda."
    >
      {semPlano.length === 0 ? (
        <EmptyState title="Toda a carteira tem plano ativo" description="Os clientes PCA já têm o mês corrente instalado." />
      ) : (
        <div className="divide-y divide-border/40">
          {semPlano.map((c) => (
            <div key={c.organization_id} className="flex items-center justify-between gap-3 py-3">
              <p className="text-sm text-foreground">
                {c.nome} — {formatInt(c.dias_de_ciclo)} dias de ciclo, {formatPct(c.pct_contrato, 0)} do contrato.
              </p>
              <button
                type="button"
                onClick={() => onCriarTarefa(c.organization_id)}
                className="shrink-0 text-[12px] font-medium text-foreground underline underline-offset-4 hover:no-underline"
              >
                Criar tarefa
              </button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
