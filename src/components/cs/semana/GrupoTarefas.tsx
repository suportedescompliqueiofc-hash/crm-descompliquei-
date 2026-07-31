// Um grupo de tarefas (Atrasadas/Hoje/Esta semana/Depois) — cada grupo é o
// seu próprio Panel do console: cabeçalho em barra com o total em Chip,
// corpo com as linhas encostadas (PanelRows). `tone="accent"` vive só no
// grupo Atrasadas quando há itens — é o único bloco desta tela que pede
// ação AGORA (o próprio Panel avisa: mais de um fio laranja por tela anula
// o efeito, então nenhum outro grupo usa `destaque`).
import type { CSTarefa } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, PanelRows, Chip } from '@/components/cs/ui';
import { TarefaItem } from './TarefaItem';

interface GrupoTarefasProps {
  titulo: string;
  tarefas: CSTarefa[];
  /** Acende o fio laranja do painel e o Chip do cabeçalho — usado nas atrasadas. */
  destaque?: boolean;
  clientesMap: Map<string, string>;
  dataLabelFor: (tarefa: CSTarefa) => { label: string; destaque?: boolean };
  onEditar: (tarefa: CSTarefa) => void;
  onExcluir: (tarefa: CSTarefa) => void;
  /**
   * Se o grupo estiver vazio, mostra esta mensagem em vez de sumir — usado
   * em "Hoje" para deixar claro que "nenhuma tarefa" é um veredito, não um
   * buraco. Se omitido, o grupo vazio simplesmente não renderiza (nem o
   * Panel aparece — evita painel vazio ocupando a grade de 2 colunas).
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

  const temItens = tarefas.length > 0;
  const acender = !!destaque && temItens;

  return (
    <Panel tone={acender ? 'accent' : 'default'}>
      <PanelHeader title={titulo} action={<Chip tone={acender ? 'accent' : 'neutral'}>{tarefas.length}</Chip>} />
      {temItens ? (
        <PanelBody flush>
          <PanelRows>
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
          </PanelRows>
        </PanelBody>
      ) : (
        <PanelBody>
          <p className="text-[13px] text-muted-foreground/70">{mensagemVazio}</p>
        </PanelBody>
      )}
    </Panel>
  );
}
