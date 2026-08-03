// Bloco 3 da Ficha (arquitetura-app-cs.md, seção B.3) — o plano do mês,
// embutido aqui (não em tela separada). Fonte: useAderencia() +
// usePlanoConteudo(). Leitura, não edição de conteúdo: quem marca um passo
// como concluído é o cliente, na própria plataforma — o app de CS só lê (por
// isso os checkboxes do checklist do cliente são reais, mas desabilitados).
//
// Redesign 2026-07-31 (rodada "Console"): o painel ganha cabeçalho em barra
// com o status de publicação como `<Chip>`, a aderência vira `<Rail>` +
// texto (em vez de só texto), e cada passo é uma linha `<ListRow>` dentro de
// `<PanelRows>` com um marcador de conclusão próprio (`PassoMark`, abaixo) —
// petróleo quando concluído (o método confirmou), contorno neutro quando
// pendente. NUNCA laranja aqui: concluir um passo do CLIENTE não é uma ação
// do João. "Publicar plano" era um link sublinhado — agora é a ÚNICA
// `<Action variant="accent">` desta ficha inteira (a regra do primitivo é no
// máximo uma por tela, e esta é a ação mais importante do bloco mais
// importante).
//
// DUAS FACES DO PLANO (acréscimo de 2026-07-31, decisão do Executor de Dados
// sobre `cs_publicar_jornada`): um plano publicado grava em DOIS lugares
// diferentes, dependendo do dono de cada passo —
// - dono='cliente' → vira linha em `jornada_passos`, a MESMA tabela que a
//   tela Jornada da PLATAFORMA REAL do cliente lê (fora do app de CS). É o
//   que `usePlanoConteudo`/`cs_plano_conteudo` devolve — por isso, por
//   invariante da própria função de publicação, TODO passo que aparece no
//   checklist abaixo já É do cliente; não existe (nem pode existir, pela
//   regra de isolamento que também rege o resto do app de CS) passo de dono
//   João misturado aqui.
// - dono='joao' → NUNCA vira `jornada_passos` (evitar expor a lista interna
//   do João ao cliente de verdade) — vira uma linha em `cs_tarefas`
//   (dono='joao', origem='plano', jornada_id preenchido). Por isso a segunda
//   face do plano ("Suas ações deste plano", abaixo) busca por
//   `useTarefas({ jornadaId, dono: 'joao' })` — não por nenhuma coluna nova
//   em `jornada_passos`.
//
// PUBLICAR PLANO: ver `PublicarPlanoDialog.tsx` para a decisão completa —
// resumo: `cs_publicar_jornada` recebe o plano INTEIRO como parâmetro (não
// lê um rascunho do banco), então "compor" e "publicar" são o mesmo ato;
// construir a tela de composição (que não existe hoje) é escopo novo e maior
// do que esta rodada pediu — reportado como proposta, não construído.
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useConcluirTarefa, useReabrirTarefa, useTarefas } from '@/hooks/cs';
import type { Aderencia, PlanoPasso } from '@/hooks/cs';
import { formatInt, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Panel, PanelHeader, PanelBody, PanelBand, PanelRows, ListRow, Chip, Action, Rail, LoadingState, EmptyState } from '@/components/cs/ui';
import { PublicarPlanoDialog } from './PublicarPlanoDialog';
import { PromoverPlanoDialog } from './PromoverPlanoDialog';

interface EstagioAgrupado {
  estagio_id: string;
  estagio_titulo: string;
  passos: PlanoPasso[];
}

function agruparPorEstagio(passos: PlanoPasso[]): EstagioAgrupado[] {
  const grupos: EstagioAgrupado[] = [];
  const indice = new Map<string, EstagioAgrupado>();
  for (const p of passos) {
    let grupo = indice.get(p.estagio_id);
    if (!grupo) {
      grupo = { estagio_id: p.estagio_id, estagio_titulo: p.estagio_titulo, passos: [] };
      indice.set(p.estagio_id, grupo);
      grupos.push(grupo);
    }
    grupo.passos.push(p);
  }
  return grupos;
}

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  concluida: 'Concluída',
};

/**
 * Marcador de conclusão de passo — a mesma linguagem visual do `<Checkline>`
 * (quadrado 13px), embutido na calha do `<ListRow>`. Petróleo quando
 * concluído (o método está de pé), contorno neutro quando pendente — nunca
 * laranja: laranja é reservado a "isto exige uma ação do João".
 */
function PassoMark({ concluido }: { concluido: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'h-[13px] w-[13px] rounded-[3px] border shrink-0 flex items-center justify-center',
        concluido ? 'bg-[hsl(var(--cs-signal))] border-[hsl(var(--cs-signal))]' : 'border-border bg-muted',
      )}
    >
      {concluido && (
        <svg viewBox="0 0 10 10" className="h-[9px] w-[9px] text-white" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M1.5 5.2 4 7.6 8.6 2.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  );
}

// Suas ações deste plano — a segunda face (dono='joao'), que nunca aparece
// em jornada_passos. Marcador INTERATIVO de propósito (não desabilitado): é
// a mesma cs_tarefas do bloco 4, então marcar/desmarcar aqui é exatamente a
// mesma ação — só a leitura é reaproveitada num contexto diferente.
function AcoesDoJoaoNoPlano({ jornadaId }: { jornadaId: string }) {
  const { data: tarefas = [], isLoading } = useTarefas({ jornadaId, dono: 'joao' });
  const concluir = useConcluirTarefa();
  const reabrir = useReabrirTarefa();

  function toggle(id: string, concluida: boolean) {
    if (concluida) {
      reabrir.mutate(id, { onError: () => toast.error('Não deu pra reabrir a tarefa.') });
    } else {
      concluir.mutate(id, { onError: () => toast.error('Não deu pra concluir a tarefa.') });
    }
  }

  if (isLoading) return <LoadingState label="Carregando suas ações do plano…" />;

  return (
    <PanelBand label="Suas ações deste plano">
      {tarefas.length === 0 ? (
        <p className="text-[13px] text-muted-foreground/70">Nenhuma ação sua neste plano — todos os passos são do cliente.</p>
      ) : (
        <PanelRows className="-mx-4">
          {tarefas.map((t) => (
            <ListRow
              key={t.id}
              mark={
                <button
                  type="button"
                  onClick={() => toggle(t.id, t.concluida)}
                  aria-label={t.concluida ? `Reabrir ${t.titulo}` : `Concluir ${t.titulo}`}
                  className="cursor-pointer"
                >
                  <PassoMark concluido={t.concluida} />
                </button>
              }
            >
              <p
                className={
                  t.concluida
                    ? 'text-[13px] text-muted-foreground/70 leading-relaxed line-through'
                    : 'text-[13px] text-foreground leading-relaxed'
                }
              >
                {t.titulo}
                {t.prazo && !t.concluida && ` — vence ${format(parseISO(t.prazo), 'dd/MM')}`}
              </p>
            </ListRow>
          ))}
        </PanelRows>
      )}
    </PanelBand>
  );
}

interface PlanoEmbutidoProps {
  orgId: string;
  aderencia: Aderencia | undefined;
  passos: PlanoPasso[];
  isLoading: boolean;
  mesLabel: string;
  /** false na própria tela /plano — os links "ver plano completo/meses
   * anteriores" não fazem sentido apontando pra tela onde já se está. */
  mostrarLinksArquivo?: boolean;
  /** false na tela /plano (arquivo histórico, leitura) — publicar e "suas
   * ações" são ações do mês corrente, não do arquivo de meses fechados. */
  mostrarAcoesPublicacao?: boolean;
}

export function PlanoEmbutido({
  orgId,
  aderencia,
  passos,
  isLoading,
  mesLabel,
  mostrarLinksArquivo = true,
  mostrarAcoesPublicacao = true,
}: PlanoEmbutidoProps) {
  const semPlano = !isLoading && (!aderencia || aderencia.total_passos === 0) && passos.length === 0;
  const jornadaStatus = passos[0]?.jornada_status;
  const jornadaId = passos[0]?.jornada_id;
  const jornadaTitulo = passos[0]?.jornada_titulo ?? '';
  const isRascunho = jornadaStatus === 'rascunho';

  const [dialogPublicarAberto, setDialogPublicarAberto] = useState(false);
  const [dialogPromoverAberto, setDialogPromoverAberto] = useState(false);

  // Sempre null nesta rodada — ver PublicarPlanoDialog.tsx para a decisão
  // completa (não existe hoje tela de composição de plano).
  const planoComposto = useMemo(() => null, []);

  const estagiosAgrupados = useMemo(() => agruparPorEstagio(passos), [passos]);

  return (
    <Panel>
      <PanelHeader
        title="Plano do mês"
        hint={mesLabel}
        action={
          jornadaStatus ? (
            <Chip tone={isRascunho ? 'outline' : 'neutral'}>{STATUS_LABEL[jornadaStatus] ?? jornadaStatus}</Chip>
          ) : undefined
        }
      />
      <PanelBody flush={!isLoading && !semPlano}>
        {isLoading ? (
          <LoadingState label="Carregando o plano…" />
        ) : semPlano ? (
          <EmptyState
            title="Sem plano publicado neste mês"
            description="O plano nasce no fechamento mensal — em conversa, não nesta tela."
            action={
              mostrarAcoesPublicacao ? (
                <Action variant="accent" onClick={() => setDialogPublicarAberto(true)}>
                  Publicar plano
                </Action>
              ) : undefined
            }
          />
        ) : (
          <>
            {isRascunho ? (
              <PanelBand>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-foreground leading-relaxed max-w-[520px]">
                    Rascunho — o cliente ainda não vê nada disto. Publique quando o conteúdo estiver pronto.
                  </p>
                  <Action variant="accent" onClick={() => setDialogPromoverAberto(true)}>
                    Publicar plano
                  </Action>
                </div>
              </PanelBand>
            ) : (
              <PanelBand>
                <p className="text-sm text-foreground leading-relaxed">
                  {formatPct(aderencia!.pct, 0)} de aderência ao plano deste mês — {formatInt(aderencia!.passos_concluidos)} de{' '}
                  {formatInt(aderencia!.total_passos)} passos concluídos.
                </p>
                <Rail value={(aderencia!.pct ?? 0) / 100} tone="signal" className="mt-2" />

                {passos[0]?.jornada_elo_alvo || passos[0]?.jornada_criterio_sucesso ? (
                  <p className="text-sm text-muted-foreground leading-relaxed mt-2 max-w-[640px]">
                    Este mês ataca <span className="text-foreground font-medium">{passos[0]?.jornada_elo_alvo ?? '—'}</span>.
                    Critério de sucesso: {passos[0]?.jornada_criterio_sucesso ?? '—'}.
                  </p>
                ) : (
                  <p className="text-[13px] text-muted-foreground/70 leading-relaxed mt-2 max-w-[640px]">
                    Este plano foi publicado sem elo declarado e sem critério de sucesso — lacuna real do método, nenhum
                    fechamento mensal definiu isso ainda para este cliente.
                  </p>
                )}
              </PanelBand>
            )}

            <PanelBand label={isRascunho ? 'Rascunho — o cliente ainda não vê nada disto' : 'O que o cliente vê e faz'}>
              <div className="space-y-3">
                {estagiosAgrupados.map((estagio) => {
                  const concluidos = estagio.passos.filter((p) => p.concluido).length;
                  return (
                    <div key={estagio.estagio_id}>
                      <p className="text-[12.5px] font-medium text-foreground mb-1">
                        {estagio.estagio_titulo}{' '}
                        <span className="text-muted-foreground font-normal font-display tabular-nums">
                          ({formatInt(concluidos)}/{formatInt(estagio.passos.length)})
                        </span>
                      </p>
                      <PanelRows className="-mx-4">
                        {estagio.passos.map((p) => (
                          <ListRow key={p.passo_id} mark={<PassoMark concluido={p.concluido} />}>
                            <p
                              className={
                                p.concluido
                                  ? 'text-[13px] text-muted-foreground/70 leading-relaxed'
                                  : 'text-[13px] text-foreground leading-relaxed'
                              }
                            >
                              {p.passo_titulo}
                              {!p.obrigatorio && ' (opcional)'}
                              {p.concluido &&
                                p.concluido_em &&
                                ` — concluído em ${format(new Date(p.concluido_em), "d 'de' MMM", { locale: ptBR })}`}
                            </p>
                          </ListRow>
                        ))}
                      </PanelRows>
                    </div>
                  );
                })}
              </div>
            </PanelBand>

            {mostrarAcoesPublicacao && !isRascunho && jornadaId && <AcoesDoJoaoNoPlano jornadaId={jornadaId} />}
          </>
        )}
      </PanelBody>

      {mostrarLinksArquivo && (
        <PanelBand className="flex items-center gap-2">
          <Link
            to={`/plano/${orgId}`}
            className="inline-flex items-center h-7 px-2.5 rounded-md text-[11.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            Ver plano completo
          </Link>
          <Link
            to={`/plano/${orgId}`}
            className="inline-flex items-center h-7 px-2.5 rounded-md text-[11.5px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          >
            Ver meses anteriores
          </Link>
        </PanelBand>
      )}

      {mostrarAcoesPublicacao && (
        <PublicarPlanoDialog
          open={dialogPublicarAberto}
          onOpenChange={setDialogPublicarAberto}
          planoComposto={planoComposto}
        />
      )}

      {mostrarAcoesPublicacao && isRascunho && jornadaId && (
        <PromoverPlanoDialog
          open={dialogPromoverAberto}
          onOpenChange={setDialogPromoverAberto}
          jornadaId={jornadaId}
          organizationId={orgId}
          titulo={jornadaTitulo}
          totalEstagios={estagiosAgrupados.length}
          totalPassos={passos.length}
        />
      )}
    </Panel>
  );
}
