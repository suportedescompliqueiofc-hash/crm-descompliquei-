import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CSTarefa } from '@/hooks/cs';
import { TarefaItem } from './TarefaItem';

interface GrupoTarefasProps {
  titulo: string;
  tarefas: CSTarefa[];
  /** Destaque visual (atrasadas) — cabeçalho vermelho + ícone de alerta. */
  destaque?: boolean;
  clientesMap: Map<string, string>;
  dataLabelFor: (tarefa: CSTarefa) => { label: string; destaque?: boolean };
  onEditar: (tarefa: CSTarefa) => void;
  onExcluir: (tarefa: CSTarefa) => void;
  /**
   * Se o grupo estiver vazio, mostra esta mensagem em vez de sumir — usado
   * em "Hoje" para deixar claro que "nenhuma tarefa" é um veredito, não um
   * buraco. Se omitido, o grupo vazio simplesmente não renderiza.
   */
  mensagemVazio?: string;
}

export function GrupoTarefas({
  titulo,
  tarefas,
  destaque,
  clientesMap,
  dataLabelFor,
  onEditar,
  onExcluir,
  mensagemVazio,
}: GrupoTarefasProps) {
  if (tarefas.length === 0 && !mensagemVazio) return null;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center gap-1.5 px-4 pt-3 pb-1">
        {destaque && tarefas.length > 0 && <AlertTriangle className="h-3 w-3 text-red-600" />}
        <p
          className={cn(
            'text-[10px] font-bold uppercase tracking-widest',
            destaque && tarefas.length > 0 ? 'text-red-600' : 'text-muted-foreground/50',
          )}
        >
          {titulo}
          {tarefas.length > 0 && ` (${tarefas.length})`}
        </p>
      </div>

      {tarefas.length === 0 ? (
        <p className="px-4 pb-2 text-[12px] text-muted-foreground/50">{mensagemVazio}</p>
      ) : (
        <div className="divide-y divide-border/40">
          {tarefas.map((tarefa) => {
            const { label, destaque: labelDestaque } = dataLabelFor(tarefa);
            return (
              <TarefaItem
                key={tarefa.id}
                tarefa={tarefa}
                clienteNome={tarefa.organization_id ? clientesMap.get(tarefa.organization_id) ?? 'Cliente' : null}
                dataLabel={label}
                dataDestaque={labelDestaque}
                onEditar={() => onEditar(tarefa)}
                onExcluir={() => onExcluir(tarefa)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
