// Um grupo de tarefas (Atrasadas/Hoje/Esta semana/Depois) — redesign
// 2026-07-30: o destaque de "Atrasadas" era ícone + texto vermelho; agora é
// só peso de fonte (negrito), a urgência real já vem da ordem dos grupos.
import type { CSTarefa } from '@/hooks/cs';
import { TarefaItem } from './TarefaItem';

interface GrupoTarefasProps {
  titulo: string;
  tarefas: CSTarefa[];
  /** Destaque de peso de fonte — usado nas atrasadas. */
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
    <div>
      <p
        className={
          destaque && tarefas.length > 0
            ? 'text-[11px] font-bold uppercase tracking-widest text-foreground pt-4 pb-1'
            : 'text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 pt-4 pb-1'
        }
      >
        {titulo}
        {tarefas.length > 0 && ` (${tarefas.length})`}
      </p>

      {tarefas.length === 0 ? (
        <p className="pb-2 text-[13px] text-muted-foreground/60">{mensagemVazio}</p>
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
