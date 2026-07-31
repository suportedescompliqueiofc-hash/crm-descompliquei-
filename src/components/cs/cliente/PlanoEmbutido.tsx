// Bloco 3 da Ficha (arquitetura-app-cs.md, seção B.3) — o plano do mês,
// embutido aqui (não em tela separada). Fonte: useAderencia() +
// usePlanoConteudo(). Leitura, não edição de conteúdo: quem marca um passo
// como concluído é o cliente, na própria plataforma — o app de CS só lê (por
// isso os checkboxes do checklist do cliente são reais, mas desabilitados).
//
// Redesign 2026-07-31 sobre a versão anterior (que já tinha aderência/elo/
// critério, mas o passo concluído/não-concluído só se distinguia por cor
// mais clara do texto — falhava o teste "objeto reconhecível sem ler cada
// palavra"). Agora cada passo é uma linha com checkbox real.
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
// (Nota histórica: cheguei a escrever aqui, antes desta rodada, que
// `jornada_passos` não tinha coluna de dono — a coluna passou a existir na
// tabela, mas `cs_plano_conteudo` não a seleciona e, pela invariante acima,
// não precisa selecionar: todo passo aqui já é do cliente por construção.)
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
import { Section, LoadingState } from '@/components/cs/ui';
import { PublicarPlanoDialog } from './PublicarPlanoDialog';

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
  ativa: 'Ativa',
  concluida: 'Concluída',
};

// Suas ações deste plano — a segunda face (dono='joao'), que nunca aparece
// em jornada_passos. Checkbox INTERATIVO de propósito (não desabilitado): é
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
    <div>
      <p className="text-sm font-medium text-foreground">Suas ações deste plano</p>
      {tarefas.length === 0 ? (
        <p className="text-[13px] text-muted-foreground/70 mt-1">
          Nenhuma ação sua neste plano — todos os passos são do cliente.
        </p>
      ) : (
        <div className="mt-1 space-y-1">
          {tarefas.map((t) => (
            <label key={t.id} className="flex items-start gap-2.5 text-[13px]">
              <input
                type="checkbox"
                checked={t.concluida}
                onChange={() => toggle(t.id, t.concluida)}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-foreground cursor-pointer"
                aria-label={t.concluida ? `Reabrir ${t.titulo}` : `Concluir ${t.titulo}`}
              />
              <span className={t.concluida ? 'text-muted-foreground/70 leading-relaxed line-through' : 'text-foreground leading-relaxed'}>
                {t.titulo}
                {t.prazo && !t.concluida && ` — vence ${format(parseISO(t.prazo), 'dd/MM')}`}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
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

  const [dialogPublicarAberto, setDialogPublicarAberto] = useState(false);

  // Sempre null nesta rodada — ver PublicarPlanoDialog.tsx para a decisão
  // completa (não existe hoje tela de composição de plano).
  const planoComposto = useMemo(() => null, []);

  return (
    <Section title={`Plano de ${mesLabel}`}>
      {isLoading ? (
        <LoadingState label="Carregando o plano…" />
      ) : semPlano ? (
        <div className="max-w-[620px] space-y-2">
          <p className="text-sm text-foreground leading-relaxed">
            Sem plano publicado neste mês. O plano nasce no fechamento mensal — em conversa, não nesta tela.
          </p>
          {mostrarAcoesPublicacao && (
            <button
              type="button"
              onClick={() => setDialogPublicarAberto(true)}
              className="text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"
            >
              Publicar plano
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4 max-w-[680px]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-foreground leading-relaxed">
              {jornadaStatus && <span className="font-medium">{STATUS_LABEL[jornadaStatus] ?? jornadaStatus}</span>}
              {jornadaStatus && ' — '}
              {formatPct(aderencia!.pct, 0)} de aderência ao plano deste mês —{' '}
              {formatInt(aderencia!.passos_concluidos)} de {formatInt(aderencia!.total_passos)} passos concluídos.
            </p>
          </div>

          {passos[0]?.jornada_elo_alvo || passos[0]?.jornada_criterio_sucesso ? (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Este mês ataca <span className="text-foreground font-medium">{passos[0]?.jornada_elo_alvo ?? '—'}</span>.
              Critério de sucesso: {passos[0]?.jornada_criterio_sucesso ?? '—'}.
            </p>
          ) : (
            <p className="text-[13px] text-muted-foreground/70 leading-relaxed">
              Este plano foi publicado sem elo declarado e sem critério de sucesso — lacuna real do método, nenhum
              fechamento mensal definiu isso ainda para este cliente.
            </p>
          )}

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
              O que o cliente vê e faz
            </p>
            {agruparPorEstagio(passos).map((estagio) => {
              const concluidos = estagio.passos.filter((p) => p.concluido).length;
              return (
                <div key={estagio.estagio_id} className="mb-3 last:mb-0">
                  <p className="text-sm font-medium text-foreground">
                    {estagio.estagio_titulo}{' '}
                    <span className="text-muted-foreground font-normal font-display tabular-nums">
                      ({formatInt(concluidos)}/{formatInt(estagio.passos.length)})
                    </span>
                  </p>
                  <div className="mt-1 space-y-1">
                    {estagio.passos.map((p) => (
                      <label key={p.passo_id} className="flex items-start gap-2.5 text-[13px]">
                        <input
                          type="checkbox"
                          checked={p.concluido}
                          disabled
                          readOnly
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-foreground disabled:opacity-100"
                          aria-label={p.passo_titulo}
                        />
                        <span
                          className={p.concluido ? 'text-muted-foreground/70 leading-relaxed' : 'text-foreground leading-relaxed'}
                        >
                          {p.passo_titulo}
                          {!p.obrigatorio && ' (opcional)'}
                          {p.concluido &&
                            p.concluido_em &&
                            ` — concluído em ${format(new Date(p.concluido_em), "d 'de' MMM", { locale: ptBR })}`}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {mostrarAcoesPublicacao && jornadaId && (
            <div className="pt-1 border-t border-border/40">
              <div className="pt-3">
                <AcoesDoJoaoNoPlano jornadaId={jornadaId} />
              </div>
            </div>
          )}
        </div>
      )}

      {mostrarLinksArquivo && (
        <div className="flex items-center gap-3 text-sm">
          <Link to={`/plano/${orgId}`} className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
            Ver plano completo
          </Link>
          <span className="text-muted-foreground/40">·</span>
          <Link to={`/plano/${orgId}`} className="font-medium text-foreground underline underline-offset-4 hover:no-underline">
            Ver meses anteriores
          </Link>
        </div>
      )}

      {mostrarAcoesPublicacao && (
        <PublicarPlanoDialog
          open={dialogPublicarAberto}
          onOpenChange={setDialogPublicarAberto}
          planoComposto={planoComposto}
        />
      )}
    </Section>
  );
}
