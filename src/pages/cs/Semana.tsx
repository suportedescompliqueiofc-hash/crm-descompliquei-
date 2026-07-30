// Tela "Semana" do app de CS — o painel de trabalho diário do João.
// Responde "o que eu faço hoje": tarefas agrupadas por prazo, criação sem
// fricção, conclusão otimista, e a seção de clientes sem plano do mês (que
// é trabalho pendente por si só, mesmo sem virar tarefa).
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  Inbox,
  Loader2,
  Plus,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, endOfWeek, differenceInCalendarDays } from 'date-fns';
import { PageHero } from '@/components/PageHero';
import { StatCard, StatCardGrid } from '@/components/StatCard';
import { formatInt } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
import { TarefaFormDialog } from '@/components/cs/semana/TarefaFormDialog';
import { GrupoTarefas } from '@/components/cs/semana/GrupoTarefas';
import { TarefaItem } from '@/components/cs/semana/TarefaItem';
import { ClientesSemPlano } from '@/components/cs/semana/ClientesSemPlano';
import { DONO_CONFIG } from '@/components/cs/semana/constants';

type FiltroDono = 'todos' | DonoTarefa;
const TODOS_CLIENTES = '__todos__';
const SEM_CLIENTE = '__sem_cliente__';

export default function Semana() {
  const { data: tarefas = [], isLoading: isLoadingTarefas } = useTarefas();
  const { data: clientes = [], isLoading: isLoadingClientes } = useCarteira();
  const excluirTarefa = useExcluirTarefa();
  const isLoading = isLoadingTarefas || isLoadingClientes;

  // ── Filtros de visualização (não afetam o resumo do topo — esse é sempre a carteira inteira) ──
  const [filtroCliente, setFiltroCliente] = useState<string>(TODOS_CLIENTES);
  const [filtroDono, setFiltroDono] = useState<FiltroDono>('todos');
  const [mostrarConcluidas, setMostrarConcluidas] = useState(false);

  // ── Modais ──
  const [dialogAberto, setDialogAberto] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<CSTarefa | null>(null);
  const [orgIdParaNovaTarefa, setOrgIdParaNovaTarefa] = useState<string | null>(null);
  const [tarefaExcluindo, setTarefaExcluindo] = useState<CSTarefa | null>(null);

  const clientesMap = useMemo(() => new Map(clientes.map((c) => [c.organization_id, c.nome])), [clientes]);

  // ── Datas de referência (semana corrida, segunda a domingo) ──
  const hoje = new Date();
  const hojeStr = format(hoje, 'yyyy-MM-dd');
  const inicioSemanaStr = format(startOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const fimSemanaStr = format(endOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // ── Resumo do topo — SEMPRE a carteira inteira, independente dos filtros de visualização abaixo ──
  const abertasTotal = tarefas.filter((t) => !t.concluida).length;
  const atrasadasTotal = tarefas.filter((t) => !t.concluida && t.prazo && t.prazo < hojeStr).length;
  const concluidasSemanaTotal = tarefas.filter(
    (t) => t.concluida && t.concluida_em && format(parseISO(t.concluida_em), 'yyyy-MM-dd') >= inicioSemanaStr,
  ).length;
  const clientesComTarefaAberta = new Set(
    tarefas.filter((t) => !t.concluida && t.organization_id).map((t) => t.organization_id as string),
  );
  const clientesSemTarefaTotal = clientes.filter((c) => !clientesComTarefaAberta.has(c.organization_id)).length;

  // ── Filtro de visualização aplicado à lista de trabalho ──
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
  const concluidasRecentes = tarefasFiltradas
    .filter((t) => t.concluida && t.concluida_em && format(parseISO(t.concluida_em), 'yyyy-MM-dd') >= inicioSemanaStr)
    .sort((a, b) => (b.concluida_em ?? '').localeCompare(a.concluida_em ?? ''));

  const grupoAtrasadas = abertas.filter((t) => t.prazo && t.prazo < hojeStr);
  const grupoHoje = abertas.filter((t) => t.prazo === hojeStr);
  const grupoSemana = abertas.filter((t) => t.prazo && t.prazo > hojeStr && t.prazo <= fimSemanaStr);
  const grupoDepois = abertas.filter((t) => !t.prazo || t.prazo > fimSemanaStr);

  const listaTotalmenteVazia = !isLoading && abertas.length === 0 && concluidasRecentes.length === 0;

  // ── Rótulos de data por grupo ──
  const dataLabelAtrasada = (t: CSTarefa) => {
    const dias = t.prazo ? differenceInCalendarDays(hoje, parseISO(t.prazo)) : 0;
    return { label: dias <= 1 ? 'atrasada há 1 dia' : `atrasada há ${dias} dias`, destaque: true };
  };
  const dataLabelHoje = () => ({ label: 'hoje' });
  const dataLabelSemana = (t: CSTarefa) => ({ label: t.prazo ? format(parseISO(t.prazo), 'dd/MM') : '—' });
  const dataLabelDepois = (t: CSTarefa) => ({ label: t.prazo ? format(parseISO(t.prazo), 'dd/MM/yy') : 'sem prazo' });
  const dataLabelConcluida = (t: CSTarefa) => ({
    label: t.concluida_em ? `concluída em ${format(parseISO(t.concluida_em), 'dd/MM')}` : 'concluída',
  });

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

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-semana-header"
        icon={CalendarClock}
        title="Semana"
        subtitle="O que é do João essa semana — a fila de ações e os alertas que o dado revela."
        right={
          <button
            type="button"
            data-tutorial="cs-semana-nova-tarefa"
            onClick={() => abrirNovaTarefa()}
            className="h-9 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 border border-white/15 text-white px-5 gap-1.5 inline-flex items-center shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Nova tarefa
          </button>
        }
      />

      <StatCardGrid cols={4}>
        <StatCard label="Abertas" value={isLoading ? '—' : formatInt(abertasTotal)} icon={CalendarClock} />
        <StatCard
          label="Atrasadas"
          value={
            isLoading ? (
              '—'
            ) : (
              <span className={atrasadasTotal > 0 ? 'text-red-600' : undefined}>{formatInt(atrasadasTotal)}</span>
            )
          }
          icon={AlertTriangle}
        />
        <StatCard
          label="Concluídas na semana"
          value={isLoading ? '—' : formatInt(concluidasSemanaTotal)}
          icon={CalendarClock}
        />
        <StatCard
          label="Clientes sem tarefa"
          value={
            isLoading ? (
              '—'
            ) : (
              <span className={clientesSemTarefaTotal > 0 ? 'text-amber-600' : undefined}>
                {formatInt(clientesSemTarefaTotal)}
              </span>
            )
          }
          icon={Users}
        />
      </StatCardGrid>

      {/* ─── Ações da semana ─── */}
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03] flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-muted">
              <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">AÇÕES DA SEMANA</p>
              <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                Atrasadas primeiro, depois hoje, esta semana e o que vem depois
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="h-8 text-[11px] rounded-lg border-border/60 w-[180px]">
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

            <div className="flex bg-muted/40 rounded-xl p-1 gap-0.5 w-fit">
              {(['todos', 'joao', 'claude'] as FiltroDono[]).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFiltroDono(d)}
                  className={cn(
                    'px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all',
                    filtroDono === d
                      ? 'bg-foreground text-background shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {d === 'todos' ? 'Todos' : DONO_CONFIG[d].label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : listaTotalmenteVazia ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="p-3 rounded-xl bg-muted/40 mb-3">
                <Inbox className="h-6 w-6 text-muted-foreground/40" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma tarefa por aqui</p>
              <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                Nada pendente, nada concluído nesta semana ainda — a fila está limpa.
              </p>
            </div>
          ) : (
            <>
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

              {concluidasRecentes.length > 0 && (
                <Collapsible open={mostrarConcluidas} onOpenChange={setMostrarConcluidas} className="mt-1">
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="w-full flex items-center gap-1.5 px-4 pt-3 pb-1 text-left"
                    >
                      <ChevronDown className={cn('h-3 w-3 text-muted-foreground/50 transition-transform', mostrarConcluidas && 'rotate-180')} />
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                        Concluídas na semana ({concluidasRecentes.length})
                      </p>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="divide-y divide-border/40">
                      {concluidasRecentes.map((tarefa) => (
                        <TarefaItem
                          key={tarefa.id}
                          tarefa={tarefa}
                          clienteNome={
                            tarefa.organization_id ? clientesMap.get(tarefa.organization_id) ?? 'Cliente' : null
                          }
                          dataLabel={dataLabelConcluida(tarefa).label}
                          onEditar={() => abrirEdicao(tarefa)}
                          onExcluir={() => setTarefaExcluindo(tarefa)}
                        />
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </>
          )}
        </div>
      </div>

      {/* ─── Clientes sem plano do mês ─── */}
      <ClientesSemPlano clientes={clientes} onCriarTarefa={(orgId) => abrirNovaTarefa(orgId)} />

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
              className="h-9 rounded-lg text-xs font-semibold bg-red-600 text-white hover:bg-red-600/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
