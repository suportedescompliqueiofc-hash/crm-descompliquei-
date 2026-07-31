// Grade mensal da Agenda — visão "tipo Google Calendar" pedida pelo CEO em
// 2026-07-31 ("Senti falta de uma agenda aqui... faz muito sentido a gente
// ter na parte de agenda pra conseguir analisar" a distribuição das
// reuniões no mês). A lista (`PanelRows` de `ReuniaoRow`) já respondia "o
// que vem a seguir"; esta grade responde "como as reuniões se distribuem no
// mês" — as duas convivem lado a lado por um toggle em `Agenda.tsx`, uma não
// substitui a outra (ver ponto 3 do briefing).
//
// Decisões que não são óbvias, documentadas para não se perder na próxima
// edição:
//
// 1. DADO SEM RECORTE DE PERÍODO. `useReunioes()` (chamado em `Agenda.tsx`
//    sem filtros) busca a tabela `cs_reunioes` INTEIRA — sem `de`/`ate`. Ou
//    seja: navegar de mês aqui é 100% client-side, sem refetch e sem
//    "buraco" de dado fora de uma janela pré-carregada. Este componente
//    recebe a lista crua e agrupa por dia com `useMemo` — nenhum hook novo.
//
// 2. ESTADO DO MÊS VIVE EM `Agenda.tsx`, não aqui. Este componente é
//    controlado (`mesReferencia` + callbacks de navegação) para que a tela
//    seja a única dona do "em que mês estou" — se um dia um `Readout` do
//    cabeçalho precisar saber o mês em foco, o estado já mora no lugar
//    certo.
//
// 3. DATA INVÁLIDA NUNCA DERRUBA A TELA. Já aconteceu nesta base (Ficha do
//    Cliente, 2026-07-31 — ver o comentário de `formatMesCurto` em
//    `components/cs/format.ts`) por assumir um formato de data errado. Aqui
//    toda leitura de `data_hora` passa por `Number.isNaN(d.getTime())` antes
//    de agrupar ou formatar: uma reunião com data corrompida é ignorada da
//    grade, nunca derruba a página.
//
// 4. "+N" ABRE UM DIÁLOGO DE DIA (o `Dialog` genérico do shadcn — o mesmo
//    usado por `NovaReuniaoDialog`/`ReuniaoDetalheDialog`, não um primitivo
//    novo do console) que reaproveita `ReuniaoRow`, a mesma linha da visão
//    em lista, em vez de inventar outra representação de reunião. Clicar
//    numa pílula abre `ReuniaoDetalheDialog` direto (o dia nem entra no
//    caminho); clicar num dia SEM nenhuma reunião dispara `onDiaVazio`, que
//    em `Agenda.tsx` apenas abre o `NovaReuniaoDialog` padrão — ele não
//    aceita data inicial hoje, então nada foi inventado aqui (briefing:
//    "se não aceitar, apenas abra-o normalmente").
import { useMemo, useState } from 'react';
import {
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { CSReuniao } from '@/hooks/cs';
import { Panel, PanelHeader, PanelBody, Action, Metric, EmptyState } from '@/components/cs/ui';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ReuniaoRow } from './ReuniaoRow';

// "Iniciais dos dias" (briefing, item 1) — segunda primeiro, é a régua do
// método (a sessão tática é segunda 8h). `nome` só alimenta o `title` do
// cabeçalho, para quem passar o mouse não ficar em dúvida com três "S".
const INICIAIS_DIA: { letra: string; nome: string }[] = [
  { letra: 'S', nome: 'Segunda-feira' },
  { letra: 'T', nome: 'Terça-feira' },
  { letra: 'Q', nome: 'Quarta-feira' },
  { letra: 'Q', nome: 'Quinta-feira' },
  { letra: 'S', nome: 'Sexta-feira' },
  { letra: 'S', nome: 'Sábado' },
  { letra: 'D', nome: 'Domingo' },
];

const MAX_PILULAS_VISIVEIS = 2;

interface CalendarioMesProps {
  /** Qualquer dia dentro do mês em foco — só o mês/ano de fato importam. */
  mesReferencia: Date;
  /** Lista CRUA de `useReunioes()` — sem filtro de período (ver nota 1 acima). */
  reunioes: CSReuniao[];
  nomesPorOrg: Map<string, string>;
  onSelecionarReuniao: (reuniao: CSReuniao) => void;
  /** Disparado ao clicar num dia sem nenhuma reunião. */
  onDiaVazio: () => void;
  onMesAnterior: () => void;
  onProximoMes: () => void;
  onHoje: () => void;
}

export function CalendarioMes({
  mesReferencia,
  reunioes,
  nomesPorOrg,
  onSelecionarReuniao,
  onDiaVazio,
  onMesAnterior,
  onProximoMes,
  onHoje,
}: CalendarioMesProps) {
  // Dia (chave 'yyyy-MM-dd') expandido no diálogo de "+N" — null = fechado.
  const [diaExpandido, setDiaExpandido] = useState<string | null>(null);

  // A grade mostra o mês inteiro MAIS os dias de fora que completam a
  // primeira/última semana (segunda a domingo) — é o que faz a grade ter
  // sempre 7 colunas cheias em vez de uma semana "quebrada" na borda.
  const dias = useMemo(() => {
    const inicioMes = startOfMonth(mesReferencia);
    const fimMes = endOfMonth(mesReferencia);
    const inicioGrade = startOfWeek(inicioMes, { weekStartsOn: 1 });
    const fimGrade = endOfWeek(fimMes, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: inicioGrade, end: fimGrade });
  }, [mesReferencia]);

  const reunioesPorDia = useMemo(() => {
    const mapa = new Map<string, CSReuniao[]>();
    reunioes.forEach((r) => {
      const d = new Date(r.data_hora);
      if (Number.isNaN(d.getTime())) return; // data corrompida: ignora, não derruba a tela
      const chave = format(d, 'yyyy-MM-dd');
      const lista = mapa.get(chave);
      if (lista) lista.push(r);
      else mapa.set(chave, [r]);
    });
    mapa.forEach((lista) => lista.sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime()));
    return mapa;
  }, [reunioes]);

  // Só conta o que é do mês em foco (os dias de fora da grade não entram na
  // pergunta "este mês está vazio?").
  const totalNoMes = useMemo(() => {
    let n = 0;
    reunioesPorDia.forEach((lista, chave) => {
      const d = new Date(`${chave}T00:00:00`);
      if (isSameMonth(d, mesReferencia)) n += lista.length;
    });
    return n;
  }, [reunioesPorDia, mesReferencia]);

  const listaDoDiaExpandido = diaExpandido ? reunioesPorDia.get(diaExpandido) ?? [] : [];

  return (
    <Panel>
      <PanelHeader
        title="Calendário"
        hint={format(mesReferencia, "MMMM 'de' yyyy", { locale: ptBR })}
        action={
          <>
            <Action variant="ghost" size="sm" onClick={onMesAnterior} aria-label="Mês anterior">
              ‹
            </Action>
            <Action variant="ghost" size="sm" onClick={onHoje}>
              Hoje
            </Action>
            <Action variant="ghost" size="sm" onClick={onProximoMes} aria-label="Próximo mês">
              ›
            </Action>
          </>
        }
      />
      <PanelBody flush>
        {totalNoMes === 0 && (
          <div className="px-4 pt-4">
            <EmptyState
              title="Nenhuma reunião neste mês"
              description="Clique num dia vazio da grade para agendar — assim que houver reuniões marcadas neste mês, elas aparecem aqui."
            />
          </div>
        )}

        <div className="grid grid-cols-7 border-t border-border/70">
          {INICIAIS_DIA.map(({ letra, nome }, i) => (
            <div
              key={`${nome}-${i}`}
              title={nome}
              className="py-1.5 text-center text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground/60 bg-muted/40 border-b border-border/70"
            >
              {letra}
            </div>
          ))}

          {dias.map((dia) => {
            const chave = format(dia, 'yyyy-MM-dd');
            const doMes = isSameMonth(dia, mesReferencia);
            const hoje = isToday(dia);
            const reunioesDoDia = reunioesPorDia.get(chave) ?? [];
            const visiveis = reunioesDoDia.slice(0, MAX_PILULAS_VISIVEIS);
            const restantes = reunioesDoDia.length - visiveis.length;
            const vazio = reunioesDoDia.length === 0;

            return (
              <div
                key={chave}
                role={vazio ? 'button' : undefined}
                tabIndex={vazio ? 0 : undefined}
                onClick={() => vazio && onDiaVazio()}
                onKeyDown={(e) => {
                  if (vazio && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onDiaVazio();
                  }
                }}
                className={cn(
                  'min-h-[104px] p-1.5 border-b border-r border-border/60 flex flex-col gap-1',
                  doMes ? 'bg-card' : 'bg-muted/30',
                  vazio && 'cursor-pointer hover:bg-muted/50 transition-colors',
                )}
              >
                <Metric
                  size="sm"
                  tone={hoje ? 'accent' : 'default'}
                  className={cn('text-[12px]', !doMes && 'text-muted-foreground/45')}
                  value={format(dia, 'd')}
                />

                <div className="space-y-1">
                  {visiveis.map((r) => (
                    <Pilula
                      key={r.id}
                      reuniao={r}
                      nomeCliente={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                      onClick={() => onSelecionarReuniao(r)}
                    />
                  ))}
                  {restantes > 0 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDiaExpandido(chave);
                      }}
                      className="w-full text-left text-[10px] font-semibold text-muted-foreground/70 hover:text-foreground px-1"
                    >
                      +{restantes}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </PanelBody>

      <Dialog open={!!diaExpandido} onOpenChange={(open) => !open && setDiaExpandido(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base">
              {diaExpandido && format(new Date(`${diaExpandido}T00:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
          </DialogHeader>
          <div className="-mx-6 -mb-6 max-h-[60vh] overflow-y-auto divide-y divide-border/70">
            {listaDoDiaExpandido.map((r) => (
              <ReuniaoRow
                key={r.id}
                reuniao={r}
                clienteNome={r.organization_id ? nomesPorOrg.get(r.organization_id) ?? null : null}
                onClick={() => {
                  setDiaExpandido(null);
                  onSelecionarReuniao(r);
                }}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </Panel>
  );
}

/** Pílula baixa e densa de reunião dentro do dia — hora + cliente truncado.
 *  Tom segue a mesma régua do Chip de status em `ReuniaoRow`: petróleo para
 *  agendada (o método em andamento), neutro para realizada/cancelada
 *  (cancelada ganha um risco no texto em vez de outra cor — vermelho aqui
 *  seria semáforo, banido). */
function Pilula({
  reuniao,
  nomeCliente,
  onClick,
}: {
  reuniao: CSReuniao;
  nomeCliente: string | null;
  onClick: () => void;
}) {
  const cancelada = reuniao.status === 'cancelada';
  const agendada = reuniao.status === 'agendada';
  const d = new Date(reuniao.data_hora);
  const horaValida = !Number.isNaN(d.getTime());

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-full flex items-center gap-1 px-1 py-[3px] rounded text-left overflow-hidden',
        agendada ? 'bg-[hsl(var(--cs-signal-soft))]' : 'bg-muted',
      )}
    >
      {horaValida && (
        <Metric
          size="sm"
          tone={agendada ? 'signal' : 'muted'}
          className="text-[10px] shrink-0"
          value={format(d, 'HH:mm')}
        />
      )}
      {/* `min-w-0` é obrigatório aqui: sem ele, um flex item com `truncate`
          (white-space: nowrap) não tem como encolher abaixo do seu próprio
          conteúdo (min-width: auto por padrão em flexbox) — o nome do
          cliente cortava sem reticências no limite do botão em vez de
          truncar de verdade. */}
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-[10.5px] text-foreground/80',
          cancelada && 'line-through text-muted-foreground/70',
        )}
      >
        {reuniao.organization_id ? nomeCliente ?? 'Cliente' : 'Tática'}
      </span>
    </button>
  );
}
