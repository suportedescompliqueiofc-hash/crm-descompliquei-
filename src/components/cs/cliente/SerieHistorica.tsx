// A série histórica — evolução mês a mês do elo escolhido, desde o cadastro do
// cliente (não uma janela curta: 02-diagnostico.md passo 2 — "a cadeia é
// tendência, não foto"). O eixo do tempo é sempre contínuo: todo mês entre o
// cadastro e o mês corrente aparece no eixo, mesmo sem dado (vira um vazio na
// linha) — nunca compactado para só os meses com valor.
import { useMemo, useState } from 'react';
import { eachMonthOfInterval, format, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { TrendingUp, Loader2, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ClienteSerieMes } from '@/hooks/cs';
import { CAMADA_COR, formatEloValor, getEloMeta } from './eloMeta';

interface SerieHistoricaProps {
  serie: ClienteSerieMes[];
  isLoading: boolean;
  clienteDesde: string | null | undefined;
  /** Elo selecionado por padrão ao abrir a tela — em geral, o elo-restrição. */
  eloInicial?: string | null;
}

export function SerieHistorica({ serie, isLoading, clienteDesde, eloInicial }: SerieHistoricaProps) {
  const elosDisponiveis = useMemo(() => {
    const camadaPorElo = new Map<string, number>();
    serie.forEach((s) => camadaPorElo.set(s.elo, s.camada));
    return Array.from(camadaPorElo.entries())
      .sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))
      .map(([elo, camada]) => ({ elo, camada }));
  }, [serie]);

  const [eloSelecionado, setEloSelecionado] = useState<string | null>(null);
  const eloAtivo =
    eloSelecionado && elosDisponiveis.some((e) => e.elo === eloSelecionado)
      ? eloSelecionado
      : (eloInicial && elosDisponiveis.some((e) => e.elo === eloInicial) ? eloInicial : elosDisponiveis[0]?.elo) ?? null;

  const camadaDoEloAtivo = elosDisponiveis.find((e) => e.elo === eloAtivo)?.camada ?? 2;

  const chartData = useMemo(() => {
    if (!eloAtivo) return [];
    const pontos = serie.filter((s) => s.elo === eloAtivo);
    if (pontos.length === 0) return [];

    const mapPorMes = new Map(pontos.map((p) => [p.mes, p]));
    const mesesOrdenados = pontos.map((p) => p.mes).sort();
    const inicio = clienteDesde ? startOfMonth(parseISO(clienteDesde)) : parseISO(`${mesesOrdenados[0]}-01`);
    const fim = startOfMonth(new Date());
    const intervalo = inicio <= fim ? eachMonthOfInterval({ start: inicio, end: fim }) : [fim];

    return intervalo.map((data) => {
      const chave = format(data, 'yyyy-MM');
      const ponto = mapPorMes.get(chave);
      return {
        mes: chave,
        valor: ponto?.valor ?? null,
        amostra_suficiente: ponto?.amostra_suficiente ?? true,
      };
    });
  }, [serie, eloAtivo, clienteDesde]);

  const eloMeta = eloAtivo ? getEloMeta(eloAtivo) : null;
  const corLinha = CAMADA_COR[camadaDoEloAtivo] ?? '#8b5cf6';

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <div className="px-5 py-4 border-b border-border/40 bg-muted/[0.03]">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-muted">
            <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">SÉRIE HISTÓRICA</p>
            <p className="text-[10px] text-muted-foreground/50 mt-0.5">Evolução mês a mês desde o cadastro do cliente</p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : elosDisponiveis.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="p-3 rounded-xl bg-muted/40 mb-3">
              <Inbox className="h-6 w-6 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">Sem série histórica para este cliente</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">Assim que houver meses com dado, a evolução aparece aqui.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {elosDisponiveis.map(({ elo }) => {
                const meta = getEloMeta(elo);
                const ativo = elo === eloAtivo;
                return (
                  <button
                    key={elo}
                    onClick={() => setEloSelecionado(elo)}
                    className={cn(
                      'px-3 py-1.5 text-[11px] font-medium rounded-lg transition-all',
                      ativo ? 'bg-foreground text-background shadow-sm' : 'bg-muted/40 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {meta.label}
                  </button>
                );
              })}
            </div>

            {chartData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-sm font-medium text-muted-foreground">Sem meses com dado suficiente para este elo</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="mes"
                      tickFormatter={(m: string) => format(parseISO(`${m}-01`), 'MMM/yy', { locale: ptBR })}
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      tickFormatter={(v: number) => (eloMeta ? formatEloValor(eloAtivo!, v) : String(v))}
                    />
                    <Tooltip
                      formatter={(v: number | null) => [v == null ? '—' : formatEloValor(eloAtivo!, v), eloMeta?.label ?? '']}
                      labelFormatter={(m: string) => format(parseISO(`${m}-01`), "MMMM 'de' yyyy", { locale: ptBR })}
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: '1px solid hsl(var(--border))' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="valor"
                      stroke={corLinha}
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: corLinha, strokeWidth: 0 }}
                      activeDot={{ r: 5 }}
                      connectNulls={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <p className="text-[10px] text-muted-foreground/40 mt-3">
              Meses sem ponto na linha = sem dado suficiente registrado naquele mês — o eixo não pula meses.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
