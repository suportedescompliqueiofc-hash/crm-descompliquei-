// Bloco 2 da Ficha (arquitetura-app-cs.md, seção B.2) — "A cadeia". Substitui
// por completo CamadaZeroPortao.tsx + CadeiaElos.tsx + SerieHistorica.tsx
// (removidos no redesign anterior): em vez de uma faixa vermelha/verde e uma
// grade de cartões com ponto de cor por camada, os 8 elos viram linhas de
// dado dentro de um único painel.
//
// Redesign 2026-07-31 (rodada "Console"): este bloco é a identidade do
// MÉTODO — por isso é o único painel da ficha com `tone="signal"` (o fio
// petróleo no topo). A Camada 0 deixa de ser uma frase corrida com os itens
// desligados separados por vírgula e vira um checklist REAL — `<Checkline>`
// por item, com a evidência de banco (`agendamentos.status` etc.) em
// `<Evidence>` mono em vez de texto cinza solto. Os 8 elos, quando há dado,
// viram linhas densas com `<KeyValue>` (rótulo — fio pontilhado — valor em
// `<Metric>`) e um `<Rail>` para os elos percentuais — petróleo para os elos
// normais, laranja só para o elo-restrição do mês (é o único ponto da tela
// onde "isto exige ação" e "isto é o método" precisam coexistir na mesma
// linha, e o laranja vence porque é o que dispara a ação real do dia).
//
// O elo-restrição do mês continua destacado por PESO de fonte além da cor —
// nunca só por cor. A série histórica permanece uma linha de texto compacta
// (mês/ano → valor), não um gráfico: o objetivo é tendência lida em uma
// linha, não um recharts.
import { useMemo } from 'react';
import { formatMesCurto } from '../format';
import type { ClienteAdocaoItem, ClienteElo, ClienteSerieMes } from '@/hooks/cs';
import {
  Panel,
  PanelHeader,
  PanelBody,
  PanelBand,
  Checkline,
  KeyValue,
  Rail,
  Metric,
  Evidence,
  LoadingState,
  EmptyState,
} from '@/components/cs/ui';
import { CAMADA_META, ORDEM_CAMADA, eloEhRestricao, formatEloValor, getEloIdPorLabel, getEloMeta } from '../eloMeta';
import { getElo, getMateriaisPorGrupo } from '@/content/cs';

interface CadeiaNarrativaProps {
  adocao: ClienteAdocaoItem[];
  adocaoLoading: boolean;
  elos: ClienteElo[];
  elosLoading: boolean;
  serie: ClienteSerieMes[];
  serieLoading: boolean;
  eloRestricao: string | null;
  camada0Passa: boolean | null;
}

export function CadeiaNarrativa({
  adocao,
  adocaoLoading,
  elos,
  elosLoading,
  serie,
  serieLoading,
  eloRestricao,
  camada0Passa,
}: CadeiaNarrativaProps) {
  // O método (src/content/cs) explica o que o elo-restrição significa e o
  // catálogo de materiais previsto para ele — resolve o problema descrito
  // pelo CEO: ler "elo: Ticket" sem ter como saber o que fazer com isso.
  const eloIdRestricao = getEloIdPorLabel(eloRestricao);
  const metodoElo = eloIdRestricao ? getElo(eloIdRestricao) : undefined;
  const materiaisElo = eloIdRestricao ? getMateriaisPorGrupo(eloIdRestricao) : [];

  const trendPontos = useMemo(() => {
    if (!eloRestricao || eloRestricao === 'Adoção (Camada 0)' || eloRestricao === 'Sem dado suficiente para simular') {
      return [];
    }
    return serie
      .filter((s) => eloEhRestricao(s.elo, eloRestricao) && s.valor != null)
      .sort((a, b) => a.mes.localeCompare(b.mes))
      .slice(-6);
  }, [serie, eloRestricao]);

  const carregando = adocaoLoading || elosLoading;

  return (
    <Panel tone="signal">
      <PanelHeader title="A cadeia" hint="Camada 0 até Recompra — o método completo" />
      <PanelBody flush={!carregando}>
        {carregando ? (
          <LoadingState label="Carregando os números…" />
        ) : (
          <>
            <PanelBand label="Camada 0 — Adoção">
              {adocao.length === 0 ? (
                <EmptyState
                  title="Sem checklist de adoção disponível"
                  description="Este cliente ainda não tem itens de adoção calculados."
                />
              ) : (
                <div>
                  {adocao.map((item) => (
                    <Checkline
                      key={item.item}
                      checked={item.ligado}
                      label={item.item}
                      evidence={item.evidencia ? <Evidence>{item.evidencia}</Evidence> : undefined}
                    />
                  ))}
                </div>
              )}

              {camada0Passa === false && (
                <p className="text-sm text-foreground leading-relaxed mt-3 max-w-[640px]">
                  A plataforma ainda não está configurada nem sendo usada de forma confiável por este cliente. Enquanto
                  isso não for corrigido, o diagnóstico comercial abaixo não é confiável — os números podem refletir
                  falta de uso da plataforma, não o resultado real da clínica.
                </p>
              )}
            </PanelBand>

            {camada0Passa === true && eloRestricao && eloRestricao !== 'Sem dado suficiente para simular' && (
              <PanelBand label="Elo-restrição do mês">
                <p className="text-sm text-foreground leading-relaxed">
                  <span className="font-semibold">{getEloMeta(eloRestricao).label}</span> é o que está travando este
                  cliente agora.
                </p>
                {metodoElo && (
                  <p className="text-[13px] text-muted-foreground leading-relaxed mt-1 max-w-[640px]">
                    {metodoElo.oQueE} Causas típicas: {metodoElo.causasTipicas.join('; ')}.
                  </p>
                )}
                {materiaisElo.length > 0 && (
                  <p className="text-[12px] text-muted-foreground/70 mt-1">
                    Materiais para este elo: {materiaisElo.map((m) => m.nome).join(', ')}.
                  </p>
                )}
              </PanelBand>
            )}

            {eloRestricao === 'Sem dado suficiente para simular' && camada0Passa === true && (
              <PanelBand>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Ainda não há dado suficiente para calcular um elo-restrição.
                </p>
              </PanelBand>
            )}

            <PanelBand label="Os 8 elos">
              {elos.length === 0 ? (
                <EmptyState title="Sem elos calculados" description="Nenhum elo calculado para o mês corrente." />
              ) : (
                <div className="space-y-4">
                  {ORDEM_CAMADA.map((camada) => {
                    const elosDaCamada = elos.filter((e) => e.camada === camada);
                    if (elosDaCamada.length === 0) return null;
                    const meta = CAMADA_META[camada];
                    return (
                      <div key={camada}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/55 mb-1">
                          Camada {camada} — {meta.label}
                        </p>
                        <div>
                          {elosDaCamada.map((elo) => {
                            const eloMeta = getEloMeta(elo.elo);
                            const restricao = eloEhRestricao(elo.elo, eloRestricao);
                            const pctValor =
                              eloMeta.formato === 'pct' && elo.valor != null
                                ? Math.max(0, Math.min(1, elo.valor / 100))
                                : null;
                            return (
                              <div key={elo.elo} className="py-1">
                                <KeyValue
                                  label={
                                    restricao ? (
                                      <span className="font-semibold text-foreground">{eloMeta.label}</span>
                                    ) : (
                                      eloMeta.label
                                    )
                                  }
                                  value={
                                    <span className="inline-flex items-baseline gap-1.5">
                                      <Metric
                                        size="sm"
                                        tone={restricao ? 'accent' : 'default'}
                                        value={formatEloValor(elo.elo, elo.valor)}
                                      />
                                      {eloMeta.formato === 'pct' && elo.numerador != null && elo.denominador != null && (
                                        <span className="text-[11px] text-muted-foreground/70">
                                          ({Math.round(elo.numerador)}/{Math.round(elo.denominador)})
                                        </span>
                                      )}
                                    </span>
                                  }
                                />
                                {!elo.amostra_suficiente && elo.valor != null && (
                                  <p className="text-[11px] text-muted-foreground/60 -mt-1">amostra pequena</p>
                                )}
                                {pctValor != null && (
                                  <Rail value={pctValor} tone={restricao ? 'accent' : 'signal'} className="mt-0.5" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!serieLoading && trendPontos.length >= 2 && (
                <p className="text-[12px] text-muted-foreground/75 leading-relaxed mt-3">
                  Nos últimos meses:{' '}
                  {trendPontos
                    // `p.mes` vem do banco como DATE ('2026-07-01'), não como
                    // 'YYYY-MM' — concatenar '-01' aqui gerava data inválida e
                    // derrubava a ficha inteira. Ver formatMesCurto em ../format.
                    .map((p) => `${formatMesCurto(p.mes)} ${formatEloValor(p.elo, p.valor)}`)
                    .join(' · ')}
                  .
                </p>
              )}
            </PanelBand>
          </>
        )}
      </PanelBody>
    </Panel>
  );
}
