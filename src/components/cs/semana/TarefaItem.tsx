// Uma linha de tarefa — redesign 2026-07-30: checkbox nativo (não é ícone
// decorativo, é controle de formulário) no lugar de CheckCircle2/Circle;
// ponto de prioridade colorido virou rótulo de texto só quando não é
// "Normal"; badge de origem/dono/cliente viram texto corrido; ações de
// editar/excluir/reabrir viram links de texto no hover, sem ícone.
import { toast } from 'sonner';
import { useConcluirTarefa, useReabrirTarefa } from '@/hooks/cs';
import type { CSTarefa } from '@/hooks/cs';
import { DONO_CONFIG, ORIGEM_LABEL, prioridadeLabel } from './constants';

interface TarefaItemProps {
  tarefa: CSTarefa;
  /** Nome do cliente (carteira) ou null para tarefa interna. */
  clienteNome: string | null;
  /** Rótulo de data já formatado pelo pai (contexto muda: prazo vs. concluída em). */
  dataLabel: string;
  /** Destaque visual (peso de fonte) — usado nas atrasadas. */
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

  const detalhes = [
    clienteNome ?? 'tarefa interna',
    DONO_CONFIG[tarefa.dono].label,
    ORIGEM_LABEL[tarefa.origem] ?? tarefa.origem,
  ];
  if (tarefa.prioridade > 0) detalhes.push(prioridadeLabel(tarefa.prioridade).toLowerCase());

  return (
    <div className="group flex items-start gap-3 py-3">
      <input
        type="checkbox"
        checked={tarefa.concluida}
        onChange={handleToggle}
        className="mt-1 h-4 w-4 shrink-0 accent-foreground cursor-pointer"
        aria-label={tarefa.concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
      />

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className={tarefa.concluida ? 'text-sm text-muted-foreground line-through' : 'text-sm text-foreground'}>
          {tarefa.titulo}
        </p>
        {tarefa.descricao && (
          <p className="text-[12px] text-muted-foreground/70 leading-snug">{tarefa.descricao}</p>
        )}
        <p className="text-[11px] text-muted-foreground/60">{detalhes.join(' · ')}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-2">
        <span
          className={
            dataDestaque
              ? 'text-[11px] font-display tabular-nums font-semibold text-foreground whitespace-nowrap'
              : 'text-[11px] font-display tabular-nums text-muted-foreground/60 whitespace-nowrap'
          }
        >
          {dataLabel}
        </span>
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button type="button" onClick={onEditar} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2">
            editar
          </button>
          <button type="button" onClick={onExcluir} className="text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2">
            excluir
          </button>
        </div>
      </div>
    </div>
  );
}
