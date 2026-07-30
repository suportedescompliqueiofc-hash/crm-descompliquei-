// A cadeia, por camada — os 8 elos (Camadas 1-3; a Camada 0 é o portão, mostrado
// à parte em CamadaZeroPortao). Agrupados por natureza do trabalho, não por ordem
// de funil (ver 05-operacoes-e-cs/sistema/01-a-cadeia.md). O elo-restrição do mês
// é destacado; elos com amostra insuficiente nunca aparecem como taxa confiável.
import { AlertTriangle, Layers, Loader2, Crosshair, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClienteElo } from '@/hooks/cs';
import { CAMADA_META, CAMADA_COR, ORDEM_CAMADA, eloEhRestricao, formatEloValor, getEloMeta } from '../eloMeta';

interface CadeiaElosProps {
  elos: ClienteElo[];
  isLoading: boolean;
  eloRestricao: string | null;
  /** Quando a Camada 0 não passou, reforça aqui que os números abaixo não são confiáveis. */
  camada0Passa: boolean | null;
}

export function CadeiaElos({ elos, isLoading, eloRestricao, camada0Passa }: CadeiaElosProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted">
            <Layers className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">A CADEIA — 8 ELOS EM 4 CAMADAS</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Valor do mês corrente, agrupado por natureza do trabalho</p>
          </div>
        </div>
      </div>

      {camada0Passa === false && (
        <div className="px-5 py-3 bg-red-50/70 border-b border-red-200/60 flex items-center gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-[11px] text-red-700 font-medium">
            Camada 0 não passou — os valores abaixo podem refletir falta de uso da plataforma, não o resultado real da clínica.
          </p>
        </div>
      )}

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : elos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-xl bg-muted/40 mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Sem elos calculados para o mês corrente</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Assim que houver dado no CRM deste cliente, os elos aparecem aqui.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {ORDEM_CAMADA.map((camada) => {
              const elosDaCamada = elos.filter((e) => e.camada === camada);
              if (elosDaCamada.length === 0) return null;
              const meta = CAMADA_META[camada];
              return (
                <div key={camada}>
                  <div className="flex items-baseline gap-2 mb-2.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
                      Camada {camada} · {meta.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground/40">{meta.descricao}</p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {elosDaCamada.map((elo) => {
                      const eloMeta = getEloMeta(elo.elo);
                      const restricao = eloEhRestricao(elo.elo, eloRestricao);
                      return (
                        <div
                          key={elo.elo}
                          className={cn(
                            'relative rounded-2xl border px-4 py-4',
                            restricao
                              ? 'border-[#E85D24]/50 bg-[#E85D24]/[0.04] ring-1 ring-[#E85D24]/20'
                              : 'border-border/60 bg-card',
                          )}
                        >
                          {restricao && (
                            <span className="absolute -top-2.5 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E85D24] text-white text-[9px] font-bold uppercase tracking-widest shadow-sm">
                              <Crosshair className="h-2.5 w-2.5" /> Elo-restrição
                            </span>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground truncate">
                              {eloMeta.label}
                            </p>
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: CAMADA_COR[camada] }}
                            />
                          </div>
                          <p className="text-[26px] leading-none font-bold font-display tabular-nums text-foreground mt-2">
                            {formatEloValor(elo.elo, elo.valor)}
                          </p>
                          <div className="flex items-center justify-between mt-2 gap-2">
                            <span className="text-[10px] text-muted-foreground/50">
                              {elo.numerador != null && elo.denominador != null
                                ? `${elo.numerador} de ${elo.denominador}`
                                : 'sem base de cálculo'}
                            </span>
                            {!elo.amostra_suficiente && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-amber-200/60 bg-amber-50 text-amber-700 text-[9px] font-bold uppercase tracking-widest">
                                <AlertTriangle className="h-2.5 w-2.5" /> Amostra pequena
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
