// O plano do mês, embutido na Ficha — pedido explícito da tarefa ("o plano
// do mês embutido aqui, não em tela separada"). Fonte: useAderencia() +
// usePlanoConteudo(). Leitura, não edição: quem marca um passo como
// concluído é o cliente, na própria plataforma — o app de CS só lê.
//
// `jornada_elo_alvo`/`jornada_criterio_sucesso` (o "porquê" do plano — qual
// elo ele ataca e o número que define sucesso) vêm em toda linha de
// `passos` (mesma jornada). Hoje são `null` em todos os planos mensais
// reais — nenhum fechamento mensal declarou isso ainda no sistema novo.
// Tratado como lacuna real do método, com texto explícito — nunca omitido
// em silêncio nem inventado.
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface PlanoEmbutidoProps {
  aderencia: Aderencia | undefined;
  passos: PlanoPasso[];
  isLoading: boolean;
  mesLabel: string;
}

export function PlanoEmbutido({ aderencia, passos, isLoading, mesLabel }: PlanoEmbutidoProps) {
  const semPlano = !isLoading && (!aderencia || aderencia.total_passos === 0);

  return (
    <Section title={`Plano de ${mesLabel}`}>
      {isLoading ? (
        <LoadingState label="Carregando o plano…" />
      ) : semPlano ? (
        <p className="text-sm text-muted-foreground leading-relaxed max-w-[620px]">
          Sem plano publicado neste mês. O plano nasce no fechamento mensal.
        </p>
      ) : (
        <div className="space-y-4 max-w-[680px]">
          <p className="text-sm text-foreground leading-relaxed">
            {formatPct(aderencia!.pct, 0)} de aderência ao plano deste mês — {formatInt(aderencia!.passos_concluidos)}{' '}
            de {formatInt(aderencia!.total_passos)} passos concluídos.
          </p>

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
                <div className="mt-1 space-y-0.5">
                  {estagio.passos.map((p) => (
                    <p
                      key={p.passo_id}
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
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}
