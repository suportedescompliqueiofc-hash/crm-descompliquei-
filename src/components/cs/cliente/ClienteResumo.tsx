// Bloco 1 da Ficha (arquitetura-app-cs.md, seção B.1) — cabeçalho: quem é o
// cliente, o relógio do contrato (a única barra de progresso admitida em
// toda a especificação — representa um recurso literalmente irreversível, o
// tempo de contrato) e o elo-restrição em destaque. Responde em menos de
// dois segundos a "esse cliente está bem ou mal, e por quê" — a pergunta que
// abre o rito diário (ritos/00-o-mes-do-cs.md, passo 1).
//
// Redesign 2026-07-31 sobre a versão anterior (que só respondia "cliente
// desde X, Y% do contrato" — metade da pergunta, sem o motivo de risco nem a
// hipótese do elo, exatamente o que o CEO cobrou: "clico e não vejo nada").
//
// Fonte do elo-restrição: `cliente.elo_restricao` (useCarteira — o mesmo
// valor que a Cadeia, bloco 2, usa) — não `contexto.elo_restricao` (que é o
// valor DECLARADO no último fechamento mensal e pode ficar defasado entre
// fechamentos). O `contexto.elo_restricao_status` só empresta a marcação
// "(hipótese)": ela qualifica se o elo já foi confirmado por um /cs-mes ou
// ainda é a leitura ao vivo da carteira.
import type { ClienteCarteira, ClienteContexto } from '@/hooks/cs';
import { formatInt, formatPct } from '@/lib/format';
import { formatDataBR } from '../format';
import { getEloInfo } from '../eloMeta';
import { construirSituacao } from '../carteira/narrativa';

interface ClienteResumoProps {
  cliente: ClienteCarteira | undefined;
  contexto: ClienteContexto | null | undefined;
  isLoading: boolean;
}

const DIAS_CICLO_PCA = 180;

export function ClienteResumo({ cliente, contexto, isLoading }: ClienteResumoProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground/50 animate-pulse">Carregando…</p>
      </div>
    );
  }

  if (!cliente) {
    return (
      <div className="space-y-2">
        <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">Cliente não encontrado</h1>
        <p className="text-sm text-muted-foreground">Este cliente não está na carteira PCA.</p>
      </div>
    );
  }

  const pctBarra = Math.min(Math.max(cliente.pct_contrato ?? 0, 0), 100);
  const diasRestantes = Math.max(DIAS_CICLO_PCA - cliente.dias_de_ciclo, 0);
  const { label: eloLabel } = getEloInfo(cliente.elo_restricao);
  const semDadoDeElo = cliente.elo_restricao === 'Sem dado suficiente para simular' || eloLabel === '—';
  const eloEhHipotese = contexto?.elo_restricao_status === 'hipotese';
  const emRisco = cliente.nivel_risco === 'atencao' || cliente.nivel_risco === 'critico';
  const motivo = emRisco ? construirSituacao(cliente).acao : null;

  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">{cliente.nome}</h1>

      <div className="max-w-[520px] space-y-1.5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cliente desde {formatDataBR(cliente.cliente_desde)} —{' '}
          <span className="font-display tabular-nums">{formatInt(cliente.dias_de_ciclo)}</span> de{' '}
          <span className="font-display tabular-nums">{formatInt(DIAS_CICLO_PCA)}</span> dias do contrato (
          <span className="font-display tabular-nums">{formatPct(pctBarra, 0)}</span>), {formatInt(diasRestantes)}{' '}
          {diasRestantes === 1 ? 'dia restante' : 'dias restantes'}.
        </p>
        <div className="h-1 w-full rounded-full bg-muted/50 overflow-hidden" role="presentation">
          <div className="h-full rounded-full bg-foreground/70" style={{ width: `${pctBarra}%` }} />
        </div>
      </div>

      <p className="text-sm text-foreground leading-relaxed">
        Elo-restrição:{' '}
        {semDadoDeElo ? (
          <span className="text-muted-foreground">ainda sem dado suficiente para calcular.</span>
        ) : (
          <>
            <span className="font-semibold">{eloLabel}</span>
            {eloEhHipotese && <span className="text-muted-foreground"> (hipótese, a confirmar)</span>}.
          </>
        )}
      </p>

      {motivo && <p className="text-sm text-muted-foreground leading-relaxed max-w-[620px]">{motivo}</p>}
    </div>
  );
}
