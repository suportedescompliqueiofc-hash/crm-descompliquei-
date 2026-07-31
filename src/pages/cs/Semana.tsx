// Tela "Semana" do app de CS — o painel de trabalho diário do João.
//
// Conceito "Console" (2026-07-31): a versão anterior era um <h1> solto sobre
// `divide-y` (documento). Agora cada grupo de prazo (Atrasadas/Hoje/Esta
// semana/Depois) é o seu próprio Panel, com o total em Chip no cabeçalho —
// GrupoTarefas.tsx faz esse trabalho. Com os 1200px do layout, os quatro
// grupos entram numa grade de 2 colunas (`grid lg:grid-cols-2`) SEM alterar
// a ordem de leitura: como cada <GrupoTarefas/> some quando fica vazio
// (exceto "Hoje", que tem `mensagemVazio`), o CSS Grid (grid-auto-flow: row,
// o padrão) preenche linha a linha na MESMA ordem em que os componentes
// aparecem no JSX — Atrasadas/Hoje na primeira linha, Esta semana/Depois na
// segunda. A prioridade da fila (atrasada > hoje > semana > depois) continua
// sendo lida de cima pra baixo, esquerda pra direita.
//
// tone="accent" (fio laranja) vive só no Panel de "Atrasadas" quando há
// itens — é o único bloco desta tela que pede ação AGORA (mais de um por
// tela anula o efeito, ver Panel.tsx). O rito do mês (em que semana do
// PRÓPRIO ciclo cada cliente está — 05-operacoes-e-cs/sistema/ritos/00-o-mes-do-cs.md)
// e "clientes sem plano" seguem abaixo, em largura cheia.
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, endOfWeek, differenceInCalendarDays } from 'date-fns';
import { formatInt } from '@/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useCarteira, useExcluirTarefa, useTarefas } from '@/hooks/cs';
import type { CSTarefa, DonoTarefa } from '@/hooks/cs';
import { PageTitle, Panel, PanelBody, Readout, Action, EmptyState, LoadingState, Section } from '@/components/cs/ui';
import { TarefaFormDialog } from '@/components/cs/semana/TarefaFormDialog';
import { GrupoTarefas } from '@/components/cs/semana/GrupoTarefas';
import { ClientesSemPlano } from '@/components/cs/semana/ClientesSemPlano';
import { DONO_CONFIG } from '@/components/cs/semana/constants';
import { agruparPorSemanaDoRito } from '@/components/cs/semana/ritoDoMes';
import { getSemanaDoMes } from '@/content/cs';

type FiltroDono = 'todos' | DonoTarefa;
const TODOS_CLIENTES = '__todos__';
const SEM_CLIENTE = '__sem_cliente__';

export default function Semana() {
  const navigate = useNavigate();
  const { data: tarefas = [], isLoading: isLoadingTarefas } = useTarefas();
  const { data: clientes = [], isLoading: isLoadingClientes } = useCarteira();
  const excluirTarefa = useExcluirTarefa();
  const isLoading = isLoadingTarefas || isLoadingClientes;

  const [filtroCliente, setFiltroCliente] = useState<string>(TODOS_CLIENTES);
  const [filtroDono, setFiltroDono] = useState<FiltroDono>('todos');

  const [dialogAberto, setDialogAberto] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<CSTarefa | null>(null);
  const [orgIdParaNovaTarefa, setOrgIdParaNovaTarefa] = useState<string | null>(null);
  const [tarefaExcluindo, setTarefaExcluindo] = useState<CSTarefa | null>(null);

  const clientesMap = useMemo(() => new Map(clientes.map((c) => [c.organization_id, c.nome])), [clientes]);

  const hoje = new Date();
  const hojeStr = format(hoje, 'yyyy-MM-dd');
  const fimSemanaStr = format(endOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Estatísticas do cabeçalho: sempre da carteira INTEIRA (não do filtro
  // abaixo) — é "o estado do mundo"; o filtro só recorta a fila visível.
  const abertasTotal = tarefas.filter((t) => !t.concluida).length;
  const atrasadasTotal = tarefas.filter((t) => !t.concluida && t.prazo && t.prazo < hojeStr).length;
  const hojeTotal = tarefas.filter((t) => !t.concluida && t.prazo === hojeStr).length;
  const semanaTotal = tarefas.filter(
    (t) => !t.concluida && t.prazo && t.prazo > hojeStr && t.prazo <= fimSemanaStr,
  ).length;

  const tarefasFiltradas = useMemo(
    () =>
      tarefas.filter((t) => {
        if (filtroCliente === SEM_CLIENTE && t.organization_id) return false;
        if (filtroCliente !== TODOS_CLIENTES && filtroCliente !== SEM_CLIENTE && t.organization_id !== filtroCliente)
          return false;
        if (filtroDono !== 'todos' && t.dono !== filtroDono) return false;
        return true;
      }),
    [tarefas, filtroCliente, filtroDono],
  );

  const abertas = tarefasFiltradas.filter((t) => !t.concluida);
  const grupoAtrasadas = abertas.filter((t) => t.prazo && t.prazo < hojeStr);
  const grupoHoje = abertas.filter((t) => t.prazo === hojeStr);
  const grupoSemana = abertas.filter((t) => t.prazo && t.prazo > hojeStr && t.prazo <= fimSemanaStr);
  const grupoDepois = abertas.filter((t) => !t.prazo || t.prazo > fimSemanaStr);

  const listaTotalmenteVazia = !isLoading && abertas.length === 0;

  const dataLabelAtrasada = (t: CSTarefa) => {
    const dias = t.prazo ? differenceInCalendarDays(hoje, parseISO(t.prazo)) : 0;
    return { label: dias <= 1 ? 'atrasada há 1 dia' : `atrasada há ${dias} dias`, destaque: true };
  };
  const dataLabelHoje = () => ({ label: 'hoje' });
  const dataLabelSemana = (t: CSTarefa) => ({ label: t.prazo ? format(parseISO(t.prazo), 'dd/MM') : '—' });
  const dataLabelDepois = (t: CSTarefa) => ({ label: t.prazo ? format(parseISO(t.prazo), 'dd/MM/yy') : 'sem prazo' });

  function abrirNovaTarefa(organizationId: string | null = null) {
    setTarefaEditando(null);
    setOrgIdParaNovaTarefa(organizationId);
    setDialogAberto(true);
  }
  function abrirEdicao(t: CSTarefa) {
    setTarefaEditando(t);
    setOrgIdParaNovaTarefa(null);
    setDialogAberto(true);
  }
  async function confirmarExclusao() {
    if (!tarefaExcluindo) return;
    try {
      await excluirTarefa.mutateAsync(tarefaExcluindo.id);
      toast.success('Tarefa excluída.');
    } catch (err: any) {
      toast.error(err?.message ?? 'Não deu pra excluir a tarefa.');
    } finally {
      setTarefaExcluindo(null);
    }
  }

  const gruposRito = useMemo(() => agruparPorSemanaDoRito(clientes), [clientes]);

  return (
    <div className="pb-12">
      <PageTitle
        title="Semana"
        description={`${formatInt(abertasTotal)} ${abertasTotal === 1 ? 'tarefa aberta' : 'tarefas abertas'} na fila — atrasadas primeiro, depois hoje, esta semana e o que vem depois.`}
        stats={
          !isLoading && (
            <>
              <Readout
                label="Atrasadas"
                value={formatInt(atrasadasTotal)}
                tone={atrasadasTotal > 0 ? 'accent' : 'muted'}
              />
              <Readout label="Para hoje" value={formatInt(hojeTotal)} />
              <Readout label="Esta semana" value={formatInt(semanaTotal)} />
            </>
          )
        }
        action={
          <Action variant="accent" onClick={() => abrirNovaTarefa()}>
            Nova tarefa
          </Action>
        }
      />

      <Panel className="mb-5">
        <PanelBody className="flex flex-wrap items-center gap-2.5">
          <Select value={filtroCliente} onValueChange={setFiltroCliente}>
            <SelectTrigger className="h-8 text-[12px] rounded-lg border-border/60 w-[190px]">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS_CLIENTES}>Todos os clientes</SelectItem>
              <SelectItem value={SEM_CLIENTE}>Tarefas internas</SelectItem>
              {clientes.map((c) => (
                <SelectItem key={c.organization_id} value={c.organization_id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex bg-muted/50 rounded-lg p-1 gap-0.5 w-fit">
            {(['todos', 'joao', 'claude'] as FiltroDono[]).map((d) => (
              <Action key={d} variant={filtroDono === d ? 'solid' : 'ghost'} size="sm" onClick={() => setFiltroDono(d)}>
                {d === 'todos' ? 'Todos' : DONO_CONFIG[d].label}
              </Action>
            ))}
          </div>
        </PanelBody>
      </Panel>

      {isLoading ? (
        <Panel>
          <PanelBody>
            <LoadingState rows={6} label="Carregando as tarefas…" />
          </PanelBody>
        </Panel>
      ) : listaTotalmenteVazia ? (
        <Panel>
          <PanelBody>
            <EmptyState title="Nenhuma tarefa aberta" description="A fila está limpa por enquanto." />
          </PanelBody>
        </Panel>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5 items-start">
          <GrupoTarefas
            titulo="Atrasadas"
            tarefas={grupoAtrasadas}
            destaque
            clientesMap={clientesMap}
            dataLabelFor={dataLabelAtrasada}
            onEditar={abrirEdicao}
            onExcluir={setTarefaExcluindo}
          />
          <GrupoTarefas
            titulo="Hoje"
            tarefas={grupoHoje}
            clientesMap={clientesMap}
            dataLabelFor={dataLabelHoje}
            onEditar={abrirEdicao}
            onExcluir={setTarefaExcluindo}
            mensagemVazio="Nada para hoje. Dia sem ação é o rito funcionando, não falhando."
          />
          <GrupoTarefas
            titulo="Esta semana"
            tarefas={grupoSemana}
            clientesMap={clientesMap}
            dataLabelFor={dataLabelSemana}
            onEditar={abrirEdicao}
            onExcluir={setTarefaExcluindo}
          />
          <GrupoTarefas
            titulo="Depois"
            tarefas={grupoDepois}
            clientesMap={clientesMap}
            dataLabelFor={dataLabelDepois}
            onEditar={abrirEdicao}
            onExcluir={setTarefaExcluindo}
          />
        </div>
      )}

      <div className="mt-5 space-y-5">
        <ClientesSemPlano clientes={clientes} onCriarTarefa={(orgId) => abrirNovaTarefa(orgId)} />

        <Section
          title="Onde a carteira está no mês"
          description="Cada cliente tem o próprio ciclo — semana 1 instala, 2 corrige, 3 aprofunda ou escala, 4 fecha e planeja."
        >
          {isLoading ? (
            <LoadingState />
          ) : (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((semana) => {
                const itens = gruposRito.get(semana) ?? [];
                if (itens.length === 0) return null;
                const objetivo = getSemanaDoMes(semana as 1 | 2 | 3 | 4)?.objetivo;
                return (
                  <div key={semana}>
                    <p className="text-sm leading-relaxed">
                      <button
                        type="button"
                        onClick={() =>
                          navigate(`/metodo?secao=ritos&busca=${encodeURIComponent(`Semana ${semana}`)}`)
                        }
                        className="font-medium text-foreground underline underline-offset-4 hover:no-underline"
                      >
                        Semana {semana} — {itens[0].rito.faseLabel}
                      </button>
                      <span className="text-foreground">:</span>{' '}
                      <span className="text-muted-foreground">{itens.map((i) => i.cliente.nome).join(', ')}.</span>
                    </p>
                    {objetivo && <p className="text-[12px] text-muted-foreground/60 mt-0.5">{objetivo}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Section>
      </div>

      <TarefaFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        tarefa={tarefaEditando}
        clientes={clientes}
        organizationIdInicial={orgIdParaNovaTarefa}
      />

      <AlertDialog open={!!tarefaExcluindo} onOpenChange={(open) => !open && setTarefaExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display">Excluir tarefa</AlertDialogTitle>
            <AlertDialogDescription>
              {tarefaExcluindo && (
                <>
                  Excluir "{tarefaExcluindo.titulo}"? Não dá pra desfazer — se for engano, é melhor reabrir depois do
                  que excluir.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-9 rounded-lg text-[11px] font-medium border-border/60">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarExclusao}
              className="h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
