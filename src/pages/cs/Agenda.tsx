// Rota "/agenda" do app de CS — as reuniões com clientes, organizadas: o que
// não existia em lugar nenhum antes (ver comentário original do placeholder).
//
// Fonte de dado — SOMENTE hooks de src/hooks/cs/: useCarteira() (nomes dos
// clientes PCA, para o seletor e para cruzar quem está sem reunião) e
// useReunioes() (tabela interna cs_reunioes — leitura livre já é permitida
// pelo contrato, é o próprio dado do CS, não dado de cliente). Todas as
// mutações (agendar/remarcar/cancelar/marcar realizada/notas) via os hooks
// já existentes em useCsReunioes.ts.
import { useMemo, useState } from 'react';
import { CalendarDays, CalendarPlus, Inbox, Loader2 } from 'lucide-react';
import { differenceInCalendarDays, endOfWeek, isSameMonth, startOfWeek } from 'date-fns';
import { PageHero } from '@/components/PageHero';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { formatInt } from '@/lib/format';
import { useCarteira, useReunioes } from '@/hooks/cs';
import type { CSReuniao } from '@/hooks/cs';
import { ReuniaoRow } from '@/components/cs/agenda/ReuniaoRow';
import { NovaReuniaoDialog } from '@/components/cs/agenda/NovaReuniaoDialog';
import { ReuniaoDetalheDialog } from '@/components/cs/agenda/ReuniaoDetalheDialog';
import { ClientesAtencaoAgenda } from '@/components/cs/agenda/ClientesAtencaoAgenda';
import type { ClienteAtrasoAgenda } from '@/components/cs/agenda/ClientesAtencaoAgenda';

// Limiar a partir do qual um cliente sem reunião "realizada" recente entra no
// destaque de atenção. Calibração inicial, ajustável.
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

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-agenda-header"
        icon={CalendarDays}
        title="Agenda"
        subtitle="As reuniões com os clientes PCA — individuais e a sessão tática em grupo, toda segunda-feira às 8h."
        right={
          <Button
            onClick={() => abrirNova(null)}
            className="h-9 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-white px-5 gap-1.5"
          >
            <CalendarPlus className="h-3.5 w-3.5" /> Agendar reunião
          </Button>
        }
      />

      <StatCardGrid cols={3}>
        <StatCard label="Reuniões da semana" value={isLoading ? '—' : formatInt(reunioesDaSemana)} icon={CalendarDays} />
        <StatCard
          label="Clientes sem reunião marcada"
          value={isLoading ? '—' : formatInt(clientesSemReuniao.length)}
          icon={Inbox}
        />
        <StatCard label="Realizadas no mês" value={isLoading ? '—' : formatInt(realizadasNoMes)} icon={CalendarDays} />
      </StatCardGrid>

      {!isLoading && <ClientesAtencaoAgenda atrasados={atrasados} onSelecionar={(orgId) => abrirNova(orgId)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-muted">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">PRÓXIMAS REUNIÕES</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Ordenadas por data</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : proximas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="p-3 rounded-xl bg-muted/40 mb-3">
                  <Inbox className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nada agendado</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                  Assim que houver reuniões marcadas, elas aparecem aqui.
                </p>
              </div>
            ) : (
              proximas.map((r) => (
                <ReuniaoRow
                  key={r.id}
                  reuniao={r}
                  clienteNome={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                  onClick={() => setSelecionada(r)}
                />
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-muted">
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">HISTÓRICO</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">Realizadas e canceladas</p>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-2 max-h-[520px] overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : historico.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="p-3 rounded-xl bg-muted/40 mb-3">
                  <Inbox className="h-6 w-6 text-muted-foreground/40" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">Nada por aqui ainda</p>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                  Reuniões realizadas ou canceladas aparecem aqui.
                </p>
              </div>
            ) : (
              historico.map((r) => (
                <ReuniaoRow
                  key={r.id}
                  reuniao={r}
                  clienteNome={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                  onClick={() => setSelecionada(r)}
                />
              ))
            )}
          </div>
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
