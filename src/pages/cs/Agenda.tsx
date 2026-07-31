// Rota "/agenda" do app de CS — as reuniões com clientes.
//
// Conceito "Console" (2026-07-31): a lista de reuniões é a atenção principal
// da tela, então ganha a coluna larga (`minmax(0,1fr)`); "Sem reunião há
// muito tempo" — o único bloco que pede ação AGORA — vai para a coluna
// lateral fixa de 340px, sem competir por espaço com a fila de reuniões.
//
// Decisão de leiaute (não trivial, documentada porque diverge do texto do
// briefing): `ProntidaoMensal` NÃO virou um painel próprio na coluna
// lateral. Ela é parametrizada por uma reunião específica
// (organizationId + dataHora daquela reunião mensal) — não existe "a
// prontidão da tela", existe "a prontidão desta reunião". Transformá-la num
// painel solto exigiria inventar qual reunião ela representaria (a próxima?
// todas?) sem que isso viesse dos hooks. Ela continua exatamente onde fazia
// sentido: como segunda linha discreta dentro de `ReuniaoRow`, só quando a
// própria linha é uma mensal ainda agendada.
import { useMemo, useState } from 'react';
import { addMonths, differenceInCalendarDays, endOfWeek, isSameMonth, startOfMonth, startOfWeek, subMonths } from 'date-fns';
import { formatInt } from '@/lib/format';
import { useCarteira, useReunioes } from '@/hooks/cs';
import type { CSReuniao } from '@/hooks/cs';
import {
  PageTitle,
  Panel,
  PanelHeader,
  PanelBody,
  PanelRows,
  Readout,
  Action,
  Chip,
  EmptyState,
  LoadingState,
} from '@/components/cs/ui';
import { ReuniaoRow } from '@/components/cs/agenda/ReuniaoRow';
import { NovaReuniaoDialog } from '@/components/cs/agenda/NovaReuniaoDialog';
import { ReuniaoDetalheDialog } from '@/components/cs/agenda/ReuniaoDetalheDialog';
import { ClientesAtencaoAgenda } from '@/components/cs/agenda/ClientesAtencaoAgenda';
import type { ClienteAtrasoAgenda } from '@/components/cs/agenda/ClientesAtencaoAgenda';
import { CalendarioMes } from '@/components/cs/agenda/CalendarioMes';

const DIAS_ATRASO_ALERTA = 21;

type VisaoAgenda = 'calendario' | 'lista';

export default function Agenda() {
  const { data: carteira = [], isLoading: carteiraLoading } = useCarteira();
  const { data: reunioes = [], isLoading: reunioesLoading } = useReunioes();

  const [novaAberta, setNovaAberta] = useState(false);
  const [defaultOrgId, setDefaultOrgId] = useState<string | null>(null);
  const [selecionada, setSelecionada] = useState<CSReuniao | null>(null);

  // "Calendário" é a visão nova pedida pelo CEO em 2026-07-31 ("faz muito
  // sentido a gente ter... pra conseguir analisar" a distribuição do mês) —
  // vira o padrão da tela. "Lista" continua existindo inteira, só um clique
  // de distância (ver o par de <Action> no PageTitle). O mês em foco é
  // estado local desta tela (não do CalendarioMes), por isso mora aqui.
  const [visao, setVisao] = useState<VisaoAgenda>('calendario');
  const [mesAtual, setMesAtual] = useState<Date>(() => startOfMonth(new Date()));

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

  // `NovaReuniaoDialog` não aceita data inicial hoje (só `defaultOrgId`) —
  // clicar num dia vazio da grade abre o diálogo padrão, sem inventar prop
  // nem lógica nova nele (briefing: "se não aceitar, apenas abra-o
  // normalmente").
  function abrirNovaAPartirDoDia() {
    abrirNova(null);
  }

  return (
    <div className="pb-12">
      <PageTitle
        title="Agenda"
        description="As reuniões marcadas com a carteira — o que vem primeiro, e quem está há muito tempo sem conversa."
        stats={
          !isLoading && (
            <>
              <Readout label="Esta semana" value={formatInt(reunioesDaSemana)} />
              <Readout
                label="Sem reunião"
                value={formatInt(clientesSemReuniao.length)}
                tone={clientesSemReuniao.length > 0 ? 'accent' : 'muted'}
              />
              <Readout label="Realizadas no mês" value={formatInt(realizadasNoMes)} tone="signal" />
            </>
          )
        }
        action={
          <>
            <Action variant={visao === 'calendario' ? 'solid' : 'ghost'} size="sm" onClick={() => setVisao('calendario')}>
              Calendário
            </Action>
            <Action variant={visao === 'lista' ? 'solid' : 'ghost'} size="sm" onClick={() => setVisao('lista')}>
              Lista
            </Action>
            <Action variant="accent" onClick={() => abrirNova(null)}>
              Agendar reunião
            </Action>
          </>
        }
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        <div className="space-y-5">
          {visao === 'calendario' ? (
            isLoading ? (
              <Panel>
                <PanelHeader title="Calendário" />
                <PanelBody>
                  <LoadingState rows={5} label="Carregando o calendário…" />
                </PanelBody>
              </Panel>
            ) : (
              <CalendarioMes
                mesReferencia={mesAtual}
                reunioes={reunioes}
                nomesPorOrg={nomesPorOrg}
                onSelecionarReuniao={setSelecionada}
                onDiaVazio={abrirNovaAPartirDoDia}
                onMesAnterior={() => setMesAtual((m) => subMonths(m, 1))}
                onProximoMes={() => setMesAtual((m) => addMonths(m, 1))}
                onHoje={() => setMesAtual(startOfMonth(new Date()))}
              />
            )
          ) : (
            <>
              <Panel>
                <PanelHeader title="Próximas reuniões" action={!isLoading && <Chip>{proximas.length}</Chip>} />
                <PanelBody flush>
                  {isLoading ? (
                    <div className="px-4 py-4">
                      <LoadingState rows={4} label="Carregando as próximas reuniões…" />
                    </div>
                  ) : proximas.length === 0 ? (
                    <div className="px-4 py-4">
                      <EmptyState title="Nada agendado" description="Assim que houver reuniões marcadas, elas aparecem aqui." />
                    </div>
                  ) : (
                    <PanelRows>
                      {proximas.map((r) => (
                        <ReuniaoRow
                          key={r.id}
                          reuniao={r}
                          clienteNome={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                          onClick={() => setSelecionada(r)}
                        />
                      ))}
                    </PanelRows>
                  )}
                </PanelBody>
              </Panel>

              <Panel>
                <PanelHeader title="Histórico" hint="realizadas e canceladas" />
                <PanelBody flush>
                  {isLoading ? (
                    <div className="px-4 py-4">
                      <LoadingState rows={4} label="Carregando o histórico…" />
                    </div>
                  ) : historico.length === 0 ? (
                    <div className="px-4 py-4">
                      <EmptyState title="Nada por aqui ainda" description="Reuniões realizadas ou canceladas aparecem aqui." />
                    </div>
                  ) : (
                    <PanelRows>
                      {historico.map((r) => (
                        <ReuniaoRow
                          key={r.id}
                          reuniao={r}
                          clienteNome={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                          onClick={() => setSelecionada(r)}
                        />
                      ))}
                    </PanelRows>
                  )}
                </PanelBody>
              </Panel>
            </>
          )}
        </div>

        <div className="space-y-5">
          {!isLoading && <ClientesAtencaoAgenda atrasados={atrasados} onSelecionar={(orgId) => abrirNova(orgId)} />}
        </div>
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
