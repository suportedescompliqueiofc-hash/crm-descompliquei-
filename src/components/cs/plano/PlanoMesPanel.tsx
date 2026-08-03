// Painel do plano do mês selecionado, na tela /plano (arquivo histórico).
// Novo em 2026-07-31: antes, esta tela delegava a renderização inteira para
// <PlanoEmbutido>, o mesmo componente que a Ficha do Cliente usa para o mês
// CORRENTE (com "suas ações do João" e o diálogo de publicar). Aqui é
// arquivo de leitura — sempre com `mostrarAcoesPublicacao=false` — então
// este painel próprio evita herdar comportamento de edição que esta tela
// nunca usa, e compõe os primitivos exatamente como o conceito pede:
// <Panel> único por mês, aderência em <Rail> + <Metric>, passos em
// <PanelRows> de <ListRow> com marcador de conclusão. `PlanoEmbutido`
// permanece fora do escopo desta rodada (é peça compartilhada com a Ficha,
// outra tela) — não foi tocado.
import { cn } from '@/lib/utils';
import { formatInt, formatPct } from '@/lib/format';
import { Panel, PanelHeader, PanelBody, PanelBand, PanelRows, ListRow, Chip, Metric, Rail, LoadingState } from '@/components/cs/ui';
import type { Aderencia, PlanoPasso } from '@/hooks/cs';

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

/** Marcador de conclusão do passo — caixa real, não ícone Lucide. Petróleo
 * quando concluído (é leitura de método, não pedido de ação). */
function MarcadorPasso({ concluido }: { concluido: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'mt-[2px] h-[13px] w-[13px] rounded-[3px] border shrink-0 flex items-center justify-center',
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

const STATUS_LABEL: Record<string, string> = {
  rascunho: 'Rascunho',
  ativa: 'Ativa',
  concluida: 'Concluída',
};

interface PlanoMesPanelProps {
  mesLabel: string;
  aderencia: Aderencia | undefined;
  passos: PlanoPasso[];
  isLoading: boolean;
}

export function PlanoMesPanel({ mesLabel, aderencia, passos, isLoading }: PlanoMesPanelProps) {
  const jornadaStatus = passos[0]?.jornada_status;
  const eloAlvo = passos[0]?.jornada_elo_alvo;
  const criterio = passos[0]?.jornada_criterio_sucesso;
  const estagios = agruparPorEstagio(passos);

  return (
    <Panel>
      <PanelHeader
        title="PLANO"
        hint={mesLabel}
        action={
          jornadaStatus && (
            <Chip tone={jornadaStatus === 'rascunho' ? 'outline' : 'neutral'}>
              {STATUS_LABEL[jornadaStatus] ?? jornadaStatus}
            </Chip>
          )
        }
      />
      <PanelBody flush={!isLoading}>
        {isLoading ? (
          <div className="px-4 py-4">
            <LoadingState rows={5} label="Carregando o plano…" />
          </div>
        ) : (
          <>
            {/* Aderência — Rail + Metric, nunca semáforo: petróleo porque é
                leitura do método (o plano andou ou não), não pedido de ação. */}
            <PanelBand>
              <div className="flex items-baseline gap-3">
                <Metric size="lg" tone="signal" value={formatPct(aderencia?.pct ?? 0, 0)} />
                <span className="text-[12.5px] text-muted-foreground">
                  {formatInt(aderencia?.passos_concluidos ?? 0)} de {formatInt(aderencia?.total_passos ?? 0)} passos
                  concluídos
                </span>
              </div>
              <Rail value={(aderencia?.pct ?? 0) / 100} tone="signal" className="mt-2" />

              {eloAlvo || criterio ? (
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-3">
                  Este mês ataca <Chip tone="signal">{eloAlvo ?? '—'}</Chip>
                  {criterio && <> — critério de sucesso: {criterio}.</>}
                </p>
              ) : (
                <p className="text-[13px] text-muted-foreground/70 leading-relaxed mt-3">
                  Este plano foi publicado sem elo declarado e sem critério de sucesso — lacuna real do método,
                  nenhum fechamento mensal definiu isso ainda para este cliente.
                </p>
              )}
            </PanelBand>

            {estagios.map((estagio) => (
              <PanelBand
                key={estagio.estagio_id}
                label={`${estagio.estagio_titulo} — ${formatInt(estagio.passos.filter((p) => p.concluido).length)}/${formatInt(estagio.passos.length)}`}
              >
                <PanelRows className="-mx-4">
                  {estagio.passos.map((p) => (
                    <ListRow key={p.passo_id} mark={<MarcadorPasso concluido={p.concluido} />}>
                      <p className={cn('text-[13px] leading-relaxed', p.concluido ? 'text-muted-foreground' : 'text-foreground')}>
                        {p.passo_titulo}
                        {!p.obrigatorio && ' (opcional)'}
                      </p>
                    </ListRow>
                  ))}
                </PanelRows>
              </PanelBand>
            ))}
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
