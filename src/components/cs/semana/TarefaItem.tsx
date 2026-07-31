// Uma linha de tarefa — vive dentro do painel do grupo (GrupoTarefas), como
// ListRow do console. O checkbox continua sendo controle real de formulário
// (não ícone): fica com `accent-color` em petróleo, porque concluir uma
// tarefa é o MÉTODO avançando, não uma ação pendente (isso já é o `flagged`
// laranja da linha atrasada). `dataDestaque` (vindo do rótulo de prazo
// calculado pela tela) é o único sinal de atraso — sem texto vermelho, sem
// ícone de alerta: laranja no <Metric> do prazo e o fio na borda esquerda.
import { toast } from 'sonner';
import { useConcluirTarefa, useReabrirTarefa } from '@/hooks/cs';
import type { CSTarefa } from '@/hooks/cs';
import { ListRow, Metric, Chip, Action } from '@/components/cs/ui';
import { DONO_CONFIG, ORIGEM_LABEL, prioridadeLabel } from './constants';

interface TarefaItemProps {
  tarefa: CSTarefa;
  /** Nome do cliente (carteira) ou null para tarefa interna. */
  clienteNome: string | null;
  /** Rótulo de data já formatado pelo pai (contexto muda: prazo vs. concluída em). */
  dataLabel: string;
  /** Destaque visual (tom accent + fio) — usado nas atrasadas. */
  dataDestaque?: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}

export function TarefaItem({ tarefa, clienteNome, dataLabel, dataDestaque, onEditar, onExcluir }: TarefaItemProps) {
  const concluirTarefa = useConcluirTarefa();
  const reabrirTarefa = useReabrirTarefa();

  function handleToggle() {
    if (tarefa.concluida) {
      reabrirTarefa.mutate(tarefa.id, { onError: () => toast.error('Não deu pra reabrir a tarefa.') });
    } else {
      concluirTarefa.mutate(tarefa.id, { onError: () => toast.error('Não deu pra concluir a tarefa.') });
    }
  }

  const detalhes = [DONO_CONFIG[tarefa.dono].label, ORIGEM_LABEL[tarefa.origem] ?? tarefa.origem];
  if (tarefa.prioridade > 0) detalhes.push(prioridadeLabel(tarefa.prioridade).toLowerCase());

  return (
    <ListRow
      className="group"
      flagged={!!dataDestaque}
      mark={
        <input
          type="checkbox"
          checked={tarefa.concluida}
          onChange={handleToggle}
          className="mt-[3px] h-[15px] w-[15px] shrink-0 accent-[hsl(var(--cs-signal))] cursor-pointer"
          aria-label={tarefa.concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
        />
      }
      trailing={
        <div className="flex flex-col items-end gap-1.5">
          <Metric size="sm" tone={dataDestaque ? 'accent' : 'muted'} value={dataLabel} />
          <Chip tone="neutral">{clienteNome ?? 'Interna'}</Chip>
        </div>
      }
    >
      <p className={tarefa.concluida ? 'text-[13px] text-muted-foreground line-through' : 'text-[13px] text-foreground'}>
        {tarefa.titulo}
      </p>
      {tarefa.descricao && (
        <p className="text-[12px] text-muted-foreground/70 leading-snug mt-0.5">{tarefa.descricao}</p>
      )}
      <div className="flex items-center gap-3 mt-1">
        <p className="text-[11px] text-muted-foreground/60">{detalhes.join(' · ')}</p>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Action variant="ghost" size="sm" className="h-5 px-1.5 text-[10.5px]" onClick={onEditar}>
            Editar
          </Action>
          <Action
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10.5px] text-destructive hover:text-destructive hover:bg-destructive/[0.06]"
            onClick={onExcluir}
          >
            Excluir
          </Action>
        </div>
      </div>
    </ListRow>
  );
}
