// Rota "/agenda" do app de CS — as reuniões com clientes, em frases.
// Redesign completo (2026-07-30, veredito do CEO: "Em Semana e Agenda está
// absolutamente tudo igual" — mesmo StatCardGrid e PageHero de antes). Agora:
// PageTitle discreto, listas de linha (ListRow), sem badge colorido de
// tipo/status. A nota da reunião pode virar entrada de continuidade do
// cliente — ver ReuniaoDetalheDialog.tsx.
import { useMemo, useState } from 'react';
import { differenceInCalendarDays, endOfWeek, isSameMonth, startOfWeek } from 'date-fns';
import { formatInt } from '@/lib/format';
import { useCarteira, useReunioes } from '@/hooks/cs';
import type { CSReuniao } from '@/hooks/cs';
import { PageTitle, Section, Metric, EmptyState, LoadingState } from '@/components/cs/ui';
import { ReuniaoRow } from '@/components/cs/agenda/ReuniaoRow';
import { NovaReuniaoDialog } from '@/components/cs/agenda/NovaReuniaoDialog';
import { ReuniaoDetalheDialog } from '@/components/cs/agenda/ReuniaoDetalheDialog';
import { ClientesAtencaoAgenda } from '@/components/cs/agenda/ClientesAtencaoAgenda';
import type { ClienteAtrasoAgenda } from '@/components/cs/agenda/ClientesAtencaoAgenda';

const DIAS_ATRASO_ALERTA = 21;

export default function Agenda() {
  const { data: carteira = [], isLoading: carteiraLoading } = useCarteira();
  const { data: reunioes = [], isLoading: reunioesLoading } = useReunioes();

  const [novaAberta, setNovaAberta] = useState(false);
  const [defaultOrgId, setDefaultOrgId] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<CSReuniao | null>(null);

  const isLoading = carteiraLoading || reunioesLoading;
  const agora = new Date();

  const nomesPorOrg = useMemo(() => {
    const m = new Map<string, string>();
    carteira.forEach((c) => m.set(c.organization_id, c.nome));
    return m;
  }, [carteira]);

  const proximas = useMemo(
    () =>
      reunioes
        .filter((r) => r.status === 'agendada' && new Date(r.data_hora) >= agora)
        .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()),
    [reunioes],
  );

  const historico = useMemo(
    () =>
      reunioes
        .filter((r) => r.status !== 'agendada' || new Date(r.data_hora) < agora)
        .sort((a, b) => new Date(b.data_hora).getTime() - new Date(a.data_hora).getTime()),
    [reunioes],
  );

  const reunioesDaSemana = useMemo(() => {
    const inicio = startOfWeek(agora, { weekStartsOn: 1 });
    const fim = endOfWeek(agora, { weekStartsOn: 1 });
    return reunioes.filter((r) => {
      const d = new Date(r.data_hora);
      return d >= inicio && d <= fim && r.status !== 'cancelada';
    }).length;
  }, [reunioes]);

  const realizadasNoMes = useMemo(
    () => reunioes.filter((r) => r.status === 'realizada' && isSameMonth(new Date(r.data_hora), agora)).length,
    [reunioes],
  );

  const clientesComReuniaoFutura = useMemo(
    () => new Set(proximas.filter((r) => r.organization_id).map((r) => r.organization_id as string)),
    [proximas],
  );

  const clientesSemReuniao = useMemo(
    () => carteira.filter((c) => !clientesComReuniaoFutura.has(c.organization_id)),
    [carteira, clientesComReuniaoFutura],
  );

  const atrasados: ClienteAtrasoAgenda[] = useMemo(() => {
    const ultimaRealizadaPorOrg = new Map<string, Date>();
    reunioes.forEach((r) => {
      if (r.status === 'realizada' && r.organization_id) {
        const d = new Date(r.data_hora);
        const atual = ultimaRealizadaPorOrg.get(r.organization_id);
        if (!atual || d > atual) ultimaRealizadaPorOrg.set(r.organization_id, d);
      }
    });

    return carteira
      .map((c) => {
        const ultima = ultimaRealizadaPorOrg.get(c.organization_id);
        const dias = ultima ? differenceInCalendarDays(agora, ultima) : null;
        return { organization_id: c.organization_id, nome: c.nome, diasSemReuniao: dias };
      })
      .filter((c) => c.diasSemReuniao === null || c.diasSemReuniao > DIAS_ATRASO_ALERTA)
      .sort((a, b) => {
        if (a.diasSemReuniao === null) return -1;
        if (b.diasSemReuniao === null) return 1;
        return b.diasSemReuniao - a.diasSemReuniao;
      })
      .slice(0, 6);
  }, [carteira, reunioes]);

  function abrirNova(orgId: string | null = null) {
    setDefaultOrgId(orgId);
    setNovaAberta(true);
  }

  const descricao = isLoading ? undefined : (
    <div className="space-y-1 pt-1">
      <Metric size="lg" tone="muted" value={formatInt(reunioesDaSemana)} />
      <p>
        {reunioesDaSemana === 1 ? 'reunião esta semana' : 'reuniões esta semana'} · {formatInt(clientesSemReuniao.length)}{' '}
        sem reunião marcada · {formatInt(realizadasNoMes)} realizadas no mês.
      </p>
    </div>
  );

  return (
    <div className="max-w-[760px] mx-auto pb-16">
      <PageTitle
        title="Agenda"
        description={descricao}
        action={
          <button
            type="button"
            onClick={() => abrirNova(null)}
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            Agendar reunião
          </button>
        }
      />

      <div className="divide-y divide-border/60">
        {!isLoading && <ClientesAtencaoAgenda atrasados={atrasados} onSelecionar={(orgId) => abrirNova(orgId)} />}

        <Section title="Próximas reuniões">
          {isLoading ? (
            <LoadingState />
          ) : proximas.length === 0 ? (
            <EmptyState title="Nada agendado" description="Assim que houver reuniões marcadas, elas aparecem aqui." />
          ) : (
            <div className="divide-y divide-border/50">
              {proximas.map((r) => (
                <ReuniaoRow
                  key={r.id}
                  reuniao={r}
                  clienteNome={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                  onClick={() => setSelecionada(r)}
                />
              ))}
            </div>
          )}
        </Section>

        <Section title="Histórico" description="Realizadas e canceladas.">
          {isLoading ? (
            <LoadingState />
          ) : historico.length === 0 ? (
            <EmptyState title="Nada por aqui ainda" description="Reuniões realizadas ou canceladas aparecem aqui." />
          ) : (
            <div className="divide-y divide-border/50">
              {historico.map((r) => (
                <ReuniaoRow
                  key={r.id}
                  reuniao={r}
                  clienteNome={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                  onClick={() => setSelecionada(r)}
                />
              ))}
            </div>
          )}
        </Section>
      </div>

      <NovaReuniaoDialog open={novaAberta} onOpenChange={setNovaAberta} clientes={carteira} defaultOrgId={defaultOrgId} />

      <ReuniaoDetalheDialog
        reuniao={selecionada}
        clienteNome={selecionada?.organization_id ? nomesPorOrg.get(selecionada.organization_id) ?? null : null}
        onOpenChange={(open) => !open && setSelecionada(null)}
      />
    </div>
  );
}
