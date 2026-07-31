// Bloco 5 da Ficha (arquitetura-app-cs.md, seção B.5, especificação
// completa na seção C) — "Linha do tempo". Une continuidade, reuniões,
// materiais, tarefas concluídas, plano publicado e marcos do CRM num único
// feed cronológico — o segundo item mais citado pelo CEO como ausente ("não
// tem histórico de nada do cliente").
//
// Fonte principal: useTimelineCliente() (RPC cs_cliente_timeline) —
// confirmado ao vivo em 2026-07-31 que o campo `tipo` só distingue os 7
// grupos GROSSOS (continuidade/reuniao/material/tarefa_concluida/
// plano_publicado/cliente_entrou/primeira_venda), não os subtipos de
// continuidade (CONVERSA/DECISÃO/ENTREGA/OBSERVAÇÃO/DIVERGÊNCIA/FECHAMENTO)
// que a seção C do documento lista como linhas próprias — a RPC devolve o
// subtipo só embutido no `titulo` ("Conversa registrada", "Decisão
// registrada"...), nunca como campo próprio. Este componente deriva o
// rótulo de exibição a partir desse texto (ver `rotuloEvento`) para mostrar
// o subtipo de qualquer forma, mas o FILTRO por tipo só opera nos grupos
// reais expostos — o caso de uso principal do filtro (silenciar TAREFA)
// continua 100% coberto.
//
// Marcos do CRM: useClienteMarcos() (RPC cs_cliente_marcos) devolve
// primeira venda, primeiro agendamento, primeira mensagem e saltos/quedas
// relevantes de demanda — testado ao vivo com as 7 orgs PCA, incluindo a
// Dra. Monção (+470% de leads em um mês: 83 → 473, confirmado por SELECT
// direto em `leads`, não é erro de cálculo). O tipo `primeira_venda` que
// essa RPC devolve é DESCARTADO na junção abaixo — `cs_cliente_timeline` já
// cobre esse mesmo marco (fonte `vendas`), e mostrar os dois criaria uma
// linha duplicada na mesma data.
//
// Redesign 2026-07-31 (rodada "Console"): o painel ganha contador (`<Chip>`)
// e ação ("Registrar conversa") no cabeçalho. A mudança que faz a diferença
// visual é a RÉGUA VERTICAL: um fio de 1px corre à esquerda da lista de cada
// mês, com um marcador quadrado de 7px por evento encostado nele — é o que
// faz o bloco parecer instrumento de leitura cronológica em vez de uma lista
// de parágrafos. O marcador é neutro (nem laranja nem petróleo): a linha do
// tempo registra fato, não pede ação nem mede método.
import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useClienteMarcos, useTimelineCliente } from '@/hooks/cs';
import type { TipoEventoTimeline, TipoMarcoCliente } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, Chip, Action, LoadingState, EmptyState } from '@/components/cs/ui';
import { cn } from '@/lib/utils';
import { RegistrarContinuidadeDialog } from './RegistrarContinuidadeDialog';

const LIMITE_INICIAL = 150;
const GRUPOS_VISIVEIS_INICIAL = 2;

/** Subtipos de marco que sobram depois de descartar 'primeira_venda' (já coberto por cs_cliente_timeline). */
type TipoMarcoExtra = Exclude<TipoMarcoCliente, 'primeira_venda'>;
type TipoUnificado = TipoEventoTimeline | TipoMarcoExtra;

interface EventoUnificado {
  data: string;
  tipo: TipoUnificado;
  titulo: string;
  descricao: string | null;
  id: string;
}

const TIPO_TIMELINE_LABEL: Partial<Record<TipoUnificado, string>> = {
  reuniao: 'REUNIÃO',
  material: 'MATERIAL',
  tarefa_concluida: 'TAREFA',
  plano_publicado: 'PLANO',
  cliente_entrou: 'MARCO',
  primeira_venda: 'MARCO',
  primeiro_agendamento: 'MARCO',
  primeira_mensagem: 'MARCO',
  salto_demanda: 'MARCO',
  queda_demanda: 'MARCO',
};

function rotuloEvento(e: EventoUnificado): string {
  if (e.tipo === 'continuidade') {
    const m = /^(.*?)\s+registrada$/i.exec(e.titulo);
    return (m ? m[1] : e.titulo).toUpperCase();
  }
  return TIPO_TIMELINE_LABEL[e.tipo] ?? e.tipo.toUpperCase();
}

const GRUPOS_FILTRO: { label: string; tipos: TipoUnificado[] }[] = [
  { label: 'Continuidade', tipos: ['continuidade'] },
  { label: 'Reunião', tipos: ['reuniao'] },
  { label: 'Material', tipos: ['material'] },
  { label: 'Tarefa', tipos: ['tarefa_concluida'] },
  { label: 'Plano', tipos: ['plano_publicado'] },
  {
    label: 'Marco',
    tipos: ['cliente_entrou', 'primeira_venda', 'primeiro_agendamento', 'primeira_mensagem', 'salto_demanda', 'queda_demanda'],
  },
];

function capitalizar(s: string): string {
  return s.length > 0 ? s[0].toUpperCase() + s.slice(1) : s;
}

/** Chip de filtro tipo pílula — ativo em tom neutro, inativo esmaecido e riscado. */
function FiltroChip({ ativo, label, onClick }: { ativo: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center h-[22px] px-2.5 rounded-full border text-[11px] font-medium transition-colors',
        ativo ? 'border-border text-foreground bg-card' : 'border-border/50 text-muted-foreground/45 line-through',
      )}
    >
      {label}
    </button>
  );
}

interface TimelineClienteProps {
  orgId: string;
}

export function TimelineCliente({ orgId }: TimelineClienteProps) {
  const [limite, setLimite] = useState(LIMITE_INICIAL);
  const [gruposVisiveis, setGruposVisiveis] = useState(GRUPOS_VISIVEIS_INICIAL);
  const [tiposExcluidos, setTiposExcluidos] = useState<Set<TipoUnificado>>(new Set());
  const [dialogAberto, setDialogAberto] = useState(false);

  const { data: eventos = [], isLoading: timelineLoading } = useTimelineCliente(orgId, { limite });
  const { data: marcos = [], isLoading: marcosLoading } = useClienteMarcos(orgId);
  const isLoading = timelineLoading || marcosLoading;

  // Junta os dois feeds (mesma forma) e reordena por data real — não por
  // comparação de string, que erraria entre um `data` DATE ("2026-07-08") e
  // um `data` timestamptz ("2026-07-08T13:29:46+00"): o primeiro é prefixo
  // do segundo e sempre "perderia" a comparação lexicográfica, mesmo quando
  // deveria vir depois no mesmo dia.
  const eventosUnificados = useMemo((): EventoUnificado[] => {
    const daTimeline: EventoUnificado[] = eventos.map((e) => ({
      data: e.data,
      tipo: e.tipo,
      titulo: e.titulo,
      descricao: e.descricao,
      id: `${e.origem}-${e.registro_origem_id}`,
    }));
    const dosMarcos: EventoUnificado[] = marcos
      .filter((m) => m.tipo !== 'primeira_venda')
      .map((m) => ({
        data: m.data,
        tipo: m.tipo as TipoMarcoExtra,
        titulo: m.titulo,
        descricao: m.descricao,
        id: `marco-${m.tipo}-${m.data}`,
      }));
    return [...daTimeline, ...dosMarcos].sort((a, b) => parseISO(b.data).getTime() - parseISO(a.data).getTime());
  }, [eventos, marcos]);

  const eventosFiltrados = useMemo(
    () => eventosUnificados.filter((e) => !tiposExcluidos.has(e.tipo)),
    [eventosUnificados, tiposExcluidos],
  );

  const gruposPorMes = useMemo(() => {
    const indice = new Map<string, { mesLabel: string; eventos: EventoUnificado[] }>();
    for (const e of eventosFiltrados) {
      const d = parseISO(e.data);
      const chave = format(d, 'yyyy-MM');
      let grupo = indice.get(chave);
      if (!grupo) {
        grupo = { mesLabel: capitalizar(format(d, "MMMM 'de' yyyy", { locale: ptBR })), eventos: [] };
        indice.set(chave, grupo);
      }
      grupo.eventos.push(e);
    }
    // Map preserva a ordem de inserção — eventosFiltrados já vem ordenado
    // (mais recente primeiro), então os grupos nascem na ordem certa.
    return Array.from(indice.entries()).map(([chave, g]) => ({ chave, ...g }));
  }, [eventosFiltrados]);

  const gruposParaMostrar = gruposPorMes.slice(0, gruposVisiveis);
  const haMaisGruposLocais = gruposPorMes.length > gruposVisiveis;
  // A paginação (`limite`) só existe no lado de cs_cliente_timeline —
  // cs_cliente_marcos não pagina (devolve tudo sempre) — por isso o teto de
  // "pode ter mais no banco" olha só a contagem crua da timeline.
  const podeTerMaisNoBanco = eventos.length === limite;
  const mostrarCarregarMais = haMaisGruposLocais || (!haMaisGruposLocais && podeTerMaisNoBanco);

  function alternarGrupoFiltro(tipos: TipoUnificado[]) {
    setTiposExcluidos((atual) => {
      const algumAtivo = tipos.some((t) => !atual.has(t));
      const novo = new Set(atual);
      if (algumAtivo) {
        tipos.forEach((t) => novo.add(t));
      } else {
        tipos.forEach((t) => novo.delete(t));
      }
      return novo;
    });
  }

  function carregarMais() {
    if (haMaisGruposLocais) {
      setGruposVisiveis((n) => n + 1);
    } else {
      setLimite((n) => n + LIMITE_INICIAL);
      setGruposVisiveis((n) => n + 1);
    }
  }

  return (
    <Panel>
      <PanelHeader
        title="Linha do tempo"
        hint="Mais recente primeiro"
        action={
          <>
            <Chip>{eventosFiltrados.length}</Chip>
            <Action size="sm" variant="outline" onClick={() => setDialogAberto(true)}>
              Registrar conversa
            </Action>
          </>
        }
      />
      <PanelBody>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {GRUPOS_FILTRO.map((g) => {
            const ativo = g.tipos.some((t) => !tiposExcluidos.has(t));
            return <FiltroChip key={g.label} ativo={ativo} label={g.label} onClick={() => alternarGrupoFiltro(g.tipos)} />;
          })}
        </div>

        {isLoading ? (
          <LoadingState label="Carregando a linha do tempo…" />
        ) : eventosUnificados.length === 0 ? (
          <EmptyState
            title="Nenhum evento registrado ainda"
            description="Continuidade, reuniões, materiais, tarefas concluídas, planos publicados e marcos do CRM aparecem aqui a partir de agora."
          />
        ) : eventosFiltrados.length === 0 ? (
          <EmptyState title="Nenhum evento com os filtros atuais" description="Ative algum tipo acima para ver o histórico." />
        ) : (
          <>
            {gruposParaMostrar.map((grupo) => (
              <div key={grupo.chave} className="mb-5 last:mb-0">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5">
                  {grupo.mesLabel}
                </p>
                {/* Régua vertical: fio de 1px + marcador quadrado de 7px por
                    evento — é isso que faz a lista ler como instrumento de
                    leitura cronológica, não uma pilha de parágrafos soltos. */}
                <div className="relative">
                  <div className="absolute left-[3px] top-1 bottom-1 w-px bg-border" aria-hidden />
                  {grupo.eventos.map((e) => (
                    <div key={e.id} className="relative pl-5 py-2.5">
                      <span
                        aria-hidden
                        className="absolute left-0 top-[14px] h-[7px] w-[7px] rounded-[2px] bg-muted-foreground/40"
                      />
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-[84px] pt-0.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                          {rotuloEvento(e)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground leading-relaxed">{e.titulo}</p>
                          {e.descricao && (
                            <p className="text-[13px] text-muted-foreground leading-relaxed mt-0.5">{e.descricao}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-[11px] font-display tabular-nums text-muted-foreground/60 whitespace-nowrap pt-0.5">
                          {format(parseISO(e.data), 'dd/MM')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {mostrarCarregarMais && (
              <Action size="sm" variant="outline" onClick={carregarMais} className="mt-1">
                Carregar mês anterior
              </Action>
            )}
          </>
        )}
      </PanelBody>

      <RegistrarContinuidadeDialog open={dialogAberto} onOpenChange={setDialogAberto} organizationId={orgId} />
    </Panel>
  );
}
