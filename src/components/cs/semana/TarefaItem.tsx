import { CheckCircle2, Circle, RotateCcw, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useConcluirTarefa, useReabrirTarefa } from '@/hooks/cs';
import type { CSTarefa } from '@/hooks/cs';
import { OrigemBadge } from './OrigemBadge';
import { DONO_CONFIG, prioridadeDotColor, prioridadeLabel } from './constants';

interface TarefaItemProps {
  tarefa: CSTarefa;
  /** Nome do cliente (carteira) ou null para tarefa interna. */
  clienteNome: string | null;
  /** Rótulo de data já formatado pelo pai (contexto muda: prazo vs. concluída em). */
  dataLabel: string;
  /** Destaque visual (vermelho) — usado nas atrasadas. */
  dataDestaque?: boolean;
  onEditar: () => void;
  onExcluir: () => void;
}

/**
 * Uma linha de tarefa — concluir é otimista (o hook já cuida disso, o clique
 * não espera round-trip). Ações de editar/excluir aparecem só no hover
 * (padrão "listas editáveis" do design system).
 */
export function TarefaItem({ tarefa, clienteNome, dataLabel, dataDestaque, onEditar, onExcluir }: TarefaItemProps) {
  const concluirTarefa = useConcluirTarefa();
  const reabrirTarefa = useReabrirTarefa();

  function handleToggle() {
    if (tarefa.concluida) {
      reabrirTarefa.mutate(tarefa.id, {
        onError: () => toast.error('Não deu pra reabrir a tarefa.'),
      });
    } else {
      concluirTarefa.mutate(tarefa.id, {
        onError: () => toast.error('Não deu pra concluir a tarefa.'),
      });
    }
  }

  const DonoIcon = DONO_CONFIG[tarefa.dono].icon;

  return (
    <div className="group flex items-start gap-3 px-4 py-3 rounded-xl hover:bg-muted/30 transition-colors">
      <button
        type="button"
        onClick={handleToggle}
        className="mt-0.5 shrink-0 text-muted-foreground/40 hover:text-foreground transition-colors"
        aria-label={tarefa.concluida ? 'Reabrir tarefa' : 'Concluir tarefa'}
      >
        {tarefa.concluida ? (
          <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600" />
        ) : (
          <Circle className="h-[18px] w-[18px]" />
        )}
      </button>

      <span
        className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
        style={{ backgroundColor: prioridadeDotColor(tarefa.prioridade) }}
        title={`Prioridade: ${prioridadeLabel(tarefa.prioridade)}`}
      />

      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={cn(
            'text-sm font-medium leading-snug',
            tarefa.concluida ? 'text-muted-foreground line-through' : 'text-foreground',
          )}
        >
          {tarefa.titulo}
        </p>
        {tarefa.descricao && (
          <p className="text-[12px] text-muted-foreground/60 leading-snug line-clamp-2">{tarefa.descricao}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          <OrigemBadge origem={tarefa.origem} />
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
            {clienteNome ? (
              <>
                <Building2 className="h-3 w-3" />
                {clienteNome}
              </>
            ) : (
              'Tarefa interna'
            )}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <DonoIcon className="h-3 w-3" />
            {DONO_CONFIG[tarefa.dono].label}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 pl-2">
        <span
          className={cn(
            'text-[11px] font-display tabular-nums whitespace-nowrap',
            dataDestaque ? 'font-semibold text-red-600' : 'text-muted-foreground/60',
          )}
        >
          {dataLabel}
        </span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onEditar}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
            aria-label="Editar tarefa"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onExcluir}
            className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50"
            aria-label="Excluir tarefa"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {tarefa.concluida && (
            <button
              type="button"
              onClick={handleToggle}
              className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              aria-label="Reabrir tarefa"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
