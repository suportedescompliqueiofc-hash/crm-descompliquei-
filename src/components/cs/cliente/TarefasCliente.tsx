// Bloco 4 da Ficha (arquitetura-app-cs.md, seção B.4) — "Tarefas deste
// cliente". Bloco NOVO: a queixa mais direta do CEO ("aqui não tem
// tarefas") tinha gap 100% de interface, não de dado — `cs_tarefas` e
// `useTarefas`/`useConcluirTarefa` já existiam inteiros; faltava aplicar o
// filtro `organizationId` nesta tela e reaproveitar `GrupoTarefas`/
// `TarefaItem` (já usados por Semana.tsx) com escopo de um cliente só.
//
// Redesign 2026-07-31 (rodada "Console"): o bloco vira `<Panel>` com contador
// (`<Chip>`) e ação ("Nova tarefa") no cabeçalho em vez de um link
// sublinhado solto no corpo. `GrupoTarefas`/`TarefaItem` (src/components/cs/
// semana/) ficam FORA do escopo desta rodada (são compartilhados com a tela
// Semana, e a tarefa restringe a edição a `ClienteDetalhe.tsx` + `cliente/`)
// — continuam com a aparência anterior por dentro do painel novo. Reportado
// como pendência de uma rodada futura de conformidade, não escondido.
//
// Fecha o loop com Materiais (bloco 6): quando o João pede um material, a
// tarefa criada para o Claude (`dono='claude'`) aparece aqui também, não só
// na agregação da tela Semana.
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format, parseISO, endOfWeek, differenceInCalendarDays } from 'date-fns';
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
import { useExcluirTarefa, useTarefas } from '@/hooks/cs';
import type { ClienteCarteira, CSTarefa } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, Chip, Action, LoadingState, EmptyState } from '@/components/cs/ui';
import { GrupoTarefas } from '@/components/cs/semana/GrupoTarefas';
import { TarefaFormDialog } from '@/components/cs/semana/TarefaFormDialog';

interface TarefasClienteProps {
  orgId: string;
  clienteNome: string;
  clientes: ClienteCarteira[];
}

export function TarefasCliente({ orgId, clienteNome, clientes }: TarefasClienteProps) {
  const { data: tarefas = [], isLoading } = useTarefas({ organizationId: orgId });
  const excluirTarefa = useExcluirTarefa();

  const [dialogAberto, setDialogAberto] = useState(false);
  const [tarefaEditando, setTarefaEditando] = useState<CSTarefa | null>(null);
  const [tarefaExcluindo, setTarefaExcluindo] = useState<CSTarefa | null>(null);

  // Uma única linha no mapa (este cliente) — GrupoTarefas/TarefaItem exigem o
  // Map só para exibir o nome ao lado da tarefa, redundante aqui (já estamos
  // na ficha dele), mas mantém o componente 100% reaproveitado sem fork.
  const clientesMap = useMemo(() => new Map([[orgId, clienteNome]]), [orgId, clienteNome]);

  const hoje = new Date();
  const hojeStr = format(hoje, 'yyyy-MM-dd');
  const fimSemanaStr = format(endOfWeek(hoje, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const abertas = tarefas.filter((t) => !t.concluida);
  const grupoAtrasadas = abertas.filter((t) => t.prazo && t.prazo < hojeStr);
  const grupoHoje = abertas.filter((t) => t.prazo === hojeStr);
  const grupoSemana = abertas.filter((t) => t.prazo && t.prazo > hojeStr && t.prazo <= fimSemanaStr);
  const grupoDepois = abertas.filter((t) => !t.prazo || t.prazo > fimSemanaStr);

  const dataLabelAtrasada = (t: CSTarefa) => {
    const dias = t.prazo ? differenceInCalendarDays(hoje, parseISO(t.prazo)) : 0;
    return { label: dias <= 1 ? 'atrasada há 1 dia' : `atrasada há ${dias} dias`, destaque: true };
  };
  const dataLabelHoje = () => ({ label: 'hoje' });
  const dataLabelSemana = (t: CSTarefa) => ({ label: t.prazo ? format(parseISO(t.prazo), 'dd/MM') : '—' });
  const dataLabelDepois = (t: CSTarefa) => ({ label: t.prazo ? format(parseISO(t.prazo), 'dd/MM/yy') : 'sem prazo' });

  function abrirNova() {
    setTarefaEditando(null);
    setDialogAberto(true);
  }
  function abrirEdicao(t: CSTarefa) {
    setTarefaEditando(t);
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
    <Panel>
      <PanelHeader
        title="Tarefas deste cliente"
        action={
          <>
            <Chip>{abertas.length}</Chip>
            <Action size="sm" variant="outline" onClick={abrirNova}>
              Nova tarefa
            </Action>
          </>
        }
      />
      <PanelBody>
        {isLoading ? (
          <LoadingState label="Carregando as tarefas…" />
        ) : abertas.length === 0 ? (
          <EmptyState
            title="Nenhuma tarefa aberta para este cliente"
            description="Fila limpa — ou ainda não foi criada nenhuma tarefa aqui."
          />
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
      </PanelBody>

      <TarefaFormDialog
        open={dialogAberto}
        onOpenChange={setDialogAberto}
        tarefa={tarefaEditando}
        clientes={clientes}
        organizationIdInicial={orgId}
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
    </Panel>
  );
}
