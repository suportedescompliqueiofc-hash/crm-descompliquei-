// Bloco 3 da Ficha (arquitetura-app-cs.md, seção B.3) — o plano do mês,
// embutido aqui (não em tela separada). Fonte: useAderencia() +
// usePlanoConteudo(). Leitura, não edição de conteúdo: quem marca um passo
// como concluído é o cliente, na própria plataforma — o app de CS só lê (por
// isso os checkboxes são reais, mas desabilitados).
//
// Redesign 2026-07-31 sobre a versão anterior (que já tinha aderência/elo/
// critério, mas o passo concluído/não-concluído só se distinguia por cor
// mais clara do texto — falhava o teste "objeto reconhecível sem ler cada
// palavra"). Agora cada passo é uma linha com checkbox real.
//
// Status de publicação: `passos[0]?.jornada_status` vem de `cs_plano_conteudo`,
// que SÓ retorna linhas de jornadas com status IN ('ativa','concluida') —
// confirmado ao vivo em 2026-07-31 (pg_get_functiondef da função). Ou seja,
// hoje NÃO existe forma de ver o conteúdo de um plano em `rascunho` por
// nenhum hook exposto — "sem plano" e "plano em rascunho, ainda invisível ao
// cliente" são indistinguíveis com o dado disponível. Documentado como
// discordância/gap no relatório do agente — ver também gap F.3 da
// especificação (RPC de publicação ainda não existe).
//
// Dono por passo: a especificação pede (seção B.3) mas `jornada_passos` NÃO
// tem coluna de dono hoje — CONFIRMADO ao vivo em 2026-07-31
// (information_schema.columns de jornada_passos: sem campo `dono`/`Cliente`/
// `João`, só `concluido_por uuid`). É o gap F.2 da especificação, ainda
// aberto. Declarado em texto, nunca inventado.
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Aderencia, PlanoPasso } from '@/hooks/cs';
import { formatInt, formatPct } from '@/lib/format';
import { Section, LoadingState } from '@/components/cs/ui';

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
  rascunho: 'Rascunho — o cliente ainda não vê nada disso',
  ativa: 'Ativa',
  concluida: 'Concluída',
};

interface PlanoEmbutidoProps {
  orgId: string;
  aderencia: Aderencia | undefined;
  passos: PlanoPasso[];
  isLoading: boolean;
  mesLabel: string;
  /** false na própria tela /plano — os links "ver plano completo/meses
   * anteriores" não fazem sentido apontando pra tela onde já se está. */
  mostrarLinksArquivo?: boolean;
}

export function PlanoEmbutido({
  orgId,
  aderencia,
  passos,
  isLoading,
  mesLabel,
  mostrarLinksArquivo = true,
}: PlanoEmbutidoProps) {
  const semPlano = !isLoading && (!aderencia || aderencia.total_passos === 0) && passos.length === 0;
  const jornadaStatus = passos[0]?.jornada_status;
  const isRascunho = jornadaStatus === 'rascunho';

  function handlePublicar() {
    // PONTO DE INTEGRAÇÃO — "publicar plano": aguardando `usePublicarJornada`
    // (hook em construção por outro agente do squad, sobre a RPC
    // `cs_publicar_jornada`, gap F.3 da especificação). Quando o hook
    // existir, trocar este toast por `publicarJornada.mutateAsync(jornadaId)`
    // + invalidação de `cs-plano-conteudo`/`cs-aderencia`/`cs-timeline`.
    toast.info('Publicar plano ainda não está disponível aqui — a ação está sendo integrada.');
  }

  return (
    <Section title={`Plano de ${mesLabel}`}>
      {isLoading ? (
        <LoadingState label="Carregando o plano…" />
      ) : semPlano ? (
        <div className="max-w-[620px] space-y-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Sem plano publicado neste mês. O plano nasce no fechamento mensal (/cs-mes).
          </p>
          <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
            Se já existe um plano em rascunho para este cliente, ele ainda não aparece aqui — hoje não há como ler o
            conteúdo de um rascunho por esta tela (lacuna real, ver relatório do agente).
          </p>
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
            {isRascunho && (
              <button
                type="button"
                onClick={handlePublicar}
                className="shrink-0 text-sm font-medium text-foreground underline underline-offset-4 hover:no-underline"
              >
                Publicar plano
              </button>
            )}
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

          {agruparPorEstagio(passos).map((estagio) => {
            const concluidos = estagio.passos.filter((p) => p.concluido).length;
            return (
              <div key={estagio.estagio_id}>
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

          <p className="text-[12px] text-muted-foreground/50 leading-relaxed">
            Dono de cada passo ainda não chega ao banco — `jornada_passos` não tem essa coluna hoje (lacuna real,
            gap aberto).
          </p>
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
    </Section>
  );
}
