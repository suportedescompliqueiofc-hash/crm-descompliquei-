// Tela "Semana" do app de CS — o painel de trabalho diário do João.
// Redesign completo (2026-07-30, veredito do CEO: "Em Semana e Agenda está
// absolutamente tudo igual" — mesmo StatCardGrid, mesmo PageHero escuro da
// plataforma do cliente). Agora: PageTitle discreto, tarefas em frases
// agrupadas por prazo (Atrasadas/Hoje/Esta semana/Depois), e uma seção nova
// que reflete o rito do mês (05-operacoes-e-cs/sistema/ritos/00-o-mes-do-cs.md):
// em que semana do PRÓPRIO ciclo cada cliente está — 1 instala, 2 corrige,
// 3 aprofunda ou escala, 4 fecha e planeja.
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO, startOfWeek, endOfWeek, differenceInCalendarDays } from 'date-fns';
import { formatInt } from '@/lib/format';
import { cn } from '@/lib/utils';
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
import { PageTitle, Section, Metric, EmptyState, LoadingState } from '@/components/cs/ui';
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
  const inicioSemanaStr = format(startOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const fimSemanaStr = format(endOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const abertasTotal = tarefas.filter((t) => !t.concluida).length;
  const atrasadasTotal = tarefas.filter((t) => !t.concluida && t.prazo && t.prazo < hojeStr).length;

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

  const descricao = isLoading ? undefined : (
    <div className="space-y-1 pt-1">
      <Metric size="lg" tone={atrasadasTotal > 0 ? 'default' : 'muted'} value={formatInt(abertasTotal)} />
      <p>
        {abertasTotal === 1 ? 'tarefa aberta' : 'tarefas abertas'}
        {atrasadasTotal > 0 && `, ${formatInt(atrasadasTotal)} ${atrasadasTotal === 1 ? 'atrasada' : 'atrasadas'}`}.
      </p>
    </div>
  );

  return (
    <div className="max-w-[760px] mx-auto pb-16">
      <PageTitle
        title="Semana"
        description={descricao}
        action={
          <button
            type="button"
            onClick={() => abrirNovaTarefa()}
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"
          >
            Nova tarefa
          </button>
        }
      />

      <div className="divide-y divide-border/60">
        <Section title="Ações da semana" description="Atrasadas primeiro, depois hoje, esta semana e o que vem depois.">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <Select value={filtroCliente} onValueChange={setFiltroCliente}>
              <SelectTrigger className="h-8 text-[12px] rounded-lg border-border/60 w-[180px]">
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

          {isLoading ? (
            <LoadingState label="Carregando as tarefas…" />
          ) : listaTotalmenteVazia ? (
            <EmptyState title="Nenhuma tarefa aberta" description="A fila está limpa por enquanto." />
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
            </>
          )}
        </Section>

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
                      <span className="font-medium text-foreground">
                        Semana {semana} — {itens[0].rito.faseLabel}:
                      </span>{' '}
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
