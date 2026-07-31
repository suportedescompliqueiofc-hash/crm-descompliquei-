// Bloco 1 da Ficha (arquitetura-app-cs.md, seção B.1) — cabeçalho: quem é o
// cliente, o relógio do contrato (a única barra de progresso admitida em
// toda a especificação — representa um recurso literalmente irreversível, o
// tempo de contrato) e o elo-restrição em destaque. Responde em menos de
// dois segundos a "esse cliente está bem ou mal, e por quê" — a pergunta que
// abre o rito diário (ritos/00-o-mes-do-cs.md, passo 1).
//
// Redesign 2026-07-31 (rodada "Console"): antes este bloco desenhava seu
// próprio <h1> solto no branco — exatamente o "documento com título em cima"
// que o CEO reprovou. Agora ele é a primeira coisa que a tela mostra e usa o
// primitivo `PageTitle` (a segunda camada de cromo do console): eyebrow
// "CLIENTE", o nome como título, a frase do contrato como descrição e até
// três `<Readout>` à direita (dias restantes, % do contrato, aderência do
// mês — quando há aderência calculada). O relógio do contrato desce para um
// `<Rail>` logo abaixo do título (mesma semântica de antes: só tempo, nunca
// risco) e o elo-restrição vira `<Chip tone="signal">` — petróleo porque é
// vocabulário do MÉTODO, nunca laranja (isso seria fingir semáforo de risco).
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
import { PageTitle, Readout, Rail, Chip, LoadingState, EmptyState } from '@/components/cs/ui';

interface ClienteResumoProps {
  cliente: ClienteCarteira | undefined;
  contexto: ClienteContexto | null | undefined;
  isLoading: boolean;
}

const DIAS_CICLO_PCA = 180;

export function ClienteResumo({ cliente, contexto, isLoading }: ClienteResumoProps) {
  if (isLoading) {
    return <LoadingState rows={3} label="Carregando o cliente…" />;
  }

  if (!cliente) {
    return <EmptyState title="Cliente não encontrado" description="Este cliente não está na carteira PCA." />;
  }

  const pctBarra = Math.min(Math.max(cliente.pct_contrato ?? 0, 0), 100);
  const diasRestantes = Math.max(DIAS_CICLO_PCA - cliente.dias_de_ciclo, 0);
  const { label: eloLabel } = getEloInfo(cliente.elo_restricao);
  const semDadoDeElo = cliente.elo_restricao === 'Sem dado suficiente para simular' || eloLabel === '—';
  const eloEhHipotese = contexto?.elo_restricao_status === 'hipotese';
  const emRisco = cliente.nivel_risco === 'atencao' || cliente.nivel_risco === 'critico';
  const motivo = emRisco ? construirSituacao(cliente).acao : null;

  return (
    <div>
      <PageTitle
        // A ficha é a única tela profunda do console (chega-se a ela pela
        // Carteira, pela Semana ou pela Agenda) e a barra de topo só conhece
        // as quatro rotas raiz — sem trilha, a única saída era o botão do
        // navegador. Ver PageTitle.tsx para o porquê de trilha e não "voltar".
        trilha={[{ label: 'Carteira', to: '/' }, { label: cliente.nome }]}
        eyebrow="CLIENTE"
        title={cliente.nome}
        description={`Cliente desde ${formatDataBR(cliente.cliente_desde)} — ${formatInt(cliente.dias_de_ciclo)} de ${formatInt(DIAS_CICLO_PCA)} dias do contrato.`}
        stats={
          <>
            <Readout label="Dias restantes" value={formatInt(diasRestantes)} />
            <Readout label="Contrato" value={formatPct(pctBarra, 0)} />
            {cliente.aderencia_pct != null && (
              <Readout label="Aderência do mês" value={formatPct(cliente.aderencia_pct, 0)} />
            )}
          </>
        }
      />

      {/* Relógio do contrato: único trilho fora de contexto de painel na
          ficha — de propósito, porque não é uma métrica de negócio, é tempo
          decorrido, o único caso em que uma barra "de risco" continua certa. */}
      <Rail value={pctBarra / 100} tone="ink" className="mb-4" />

      <div className="flex flex-wrap items-center gap-2.5 mb-2">
        {semDadoDeElo ? (
          <span className="text-[13px] text-muted-foreground">Elo-restrição: ainda sem dado suficiente para calcular.</span>
        ) : (
          <>
            <Chip tone="signal">{eloLabel}</Chip>
            {eloEhHipotese && <Chip tone="neutral">Hipótese, a confirmar</Chip>}
          </>
        )}
      </div>

      {motivo && <p className="text-sm text-muted-foreground leading-relaxed max-w-[620px]">{motivo}</p>}
    </div>
  );
}
