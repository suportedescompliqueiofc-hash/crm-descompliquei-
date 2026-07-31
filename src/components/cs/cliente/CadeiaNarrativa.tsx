// Bloco 2 da Ficha (arquitetura-app-cs.md, seção B.2) — "A cadeia". Substitui
// por completo CamadaZeroPortao.tsx + CadeiaElos.tsx + SerieHistorica.tsx
// (removidos no redesign anterior): em vez de uma faixa vermelha/verde e uma
// grade de cartões com ponto de cor por camada, os 8 elos viram parágrafos
// corridos (isso já funcionava bem e é mantido).
//
// Redesign 2026-07-31: a Camada 0 deixa de ser só uma frase corrida com os
// itens desligados separados por vírgula (era preciso ler a frase inteira
// para saber QUAL item falta) e vira um checklist real — 7 linhas com
// checkbox (marcado/riscado), a mesma forma mínima que a especificação exige
// para todo estado binário verificável. O texto de julgamento ("o
// diagnóstico comercial não é confiável") continua em prosa — é leitura, não
// um booleano.
//
// O elo-restrição do mês é destacado por PESO de fonte (negrito), nunca por
// cor ou badge. A série histórica vira uma linha de texto compacta (mês/ano
// → valor) só para o elo-restrição, em vez de um gráfico — o objetivo é
// tendência lida em uma linha, não um recharts.
import { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ClienteAdocaoItem, ClienteElo, ClienteSerieMes } from '@/hooks/cs';
import { Section, LoadingState } from '@/components/cs/ui';
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

  return (
    <Section title="A cadeia">
      {adocaoLoading || elosLoading ? (
        <LoadingState label="Carregando os números…" />
      ) : (
        <div className="space-y-4 max-w-[680px]">
          <div>
            <p className="text-sm font-medium text-foreground">Camada 0 — Adoção</p>
            {adocao.length === 0 ? (
              <p className="text-sm text-muted-foreground mt-1">Sem checklist de adoção disponível para este cliente.</p>
            ) : (
              <div className="mt-1.5 space-y-1">
                {adocao.map((item) => (
                  <label key={item.item} className="flex items-start gap-2.5 text-sm">
                    <input
                      type="checkbox"
                      checked={item.ligado}
                      disabled
                      readOnly
                      className="mt-0.5 h-4 w-4 shrink-0 accent-foreground disabled:opacity-100"
                      aria-label={item.item}
                    />
                    <span className="min-w-0">
                      <span className={item.ligado ? 'text-foreground' : 'text-foreground font-medium'}>{item.item}</span>
                      {item.evidencia && (
                        <span className="text-[12px] text-muted-foreground/70"> — {item.evidencia}</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {camada0Passa === false && (
            <p className="text-sm text-foreground leading-relaxed">
              A plataforma ainda não está configurada nem sendo usada de forma confiável por este cliente. Enquanto
              isso não for corrigido, o diagnóstico comercial abaixo não é confiável — os números podem refletir
              falta de uso da plataforma, não o resultado real da clínica.
            </p>
          )}

          {camada0Passa === true && eloRestricao && eloRestricao !== 'Sem dado suficiente para simular' && (
            <div>
              <p className="text-sm text-foreground leading-relaxed">
                Elo-restrição do mês: <span className="font-semibold">{getEloMeta(eloRestricao).label}</span>.
              </p>
              {metodoElo && (
                <p className="text-[13px] text-muted-foreground leading-relaxed mt-1">
                  {metodoElo.oQueE} Causas típicas: {metodoElo.causasTipicas.join('; ')}.
                </p>
              )}
              {materiaisElo.length > 0 && (
                <p className="text-[12px] text-muted-foreground/70 mt-1">
                  Materiais para este elo: {materiaisElo.map((m) => m.nome).join(', ')}.
                </p>
              )}
            </div>
          )}

          {eloRestricao === 'Sem dado suficiente para simular' && camada0Passa === true && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Ainda não há dado suficiente para calcular um elo-restrição.
            </p>
          )}

          {elos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem elos calculados para o mês corrente.</p>
          ) : (
            ORDEM_CAMADA.map((camada) => {
              const elosDaCamada = elos.filter((e) => e.camada === camada);
              if (elosDaCamada.length === 0) return null;
              const meta = CAMADA_META[camada];
              return (
                <p key={camada} className="text-sm text-muted-foreground leading-relaxed">
                  <span className="text-foreground font-medium">
                    Camada {camada} — {meta.label}:
                  </span>{' '}
                  {elosDaCamada.map((elo, i) => {
                    const eloMeta = getEloMeta(elo.elo);
                    const restricao = eloEhRestricao(elo.elo, eloRestricao);
                    return (
                      <span key={elo.elo}>
                        {eloMeta.label}{' '}
                        <span
                          className={
                            restricao
                              ? 'font-display tabular-nums font-bold text-foreground'
                              : 'font-display tabular-nums font-semibold text-foreground'
                          }
                        >
                          {formatEloValor(elo.elo, elo.valor)}
                        </span>
                        {eloMeta.formato === 'pct' && elo.numerador != null && elo.denominador != null && (
                          <span>
                            {' '}
                            ({Math.round(elo.numerador)} de {Math.round(elo.denominador)})
                          </span>
                        )}
                        {!elo.amostra_suficiente && elo.valor != null && ' (amostra pequena)'}
                        {restricao && ' — elo-restrição do mês'}
                        {i < elosDaCamada.length - 1 ? '; ' : '.'}
                      </span>
                    );
                  })}
                </p>
              );
            })
          )}

          {!serieLoading && trendPontos.length >= 2 && (
            <p className="text-[13px] text-muted-foreground/80 leading-relaxed">
              Nos últimos meses:{' '}
              {trendPontos
                .map(
                  (p) =>
                    `${format(parseISO(`${p.mes}-01`), 'MMM/yy', { locale: ptBR })} ${formatEloValor(p.elo, p.valor)}`,
                )
                .join(' · ')}
              .
            </p>
          )}
        </div>
      )}
    </Section>
  );
}
