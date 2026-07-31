// Cartão de cliente da Carteira — substitui `CarteiraRow.tsx` (linha densa em
// lista) por um cartão com presença visual própria, pedido direto do CEO em
// 2026-07-31: "um card do cliente um pouco mais bonitinho". A base de dado e
// de sentido é EXATAMENTE a mesma da linha anterior (mesmos campos de
// `ClienteCarteira`, mesmas frases de `narrativa.ts`, mesma navegação) — só a
// moldura muda, de `ListRow` (calha + filete) para `Panel` (painel próprio,
// canto, sombra curta).
//
// Exceção deliberada à regra "painel nunca dentro de painel" (ver cabeçalho
// de `ui/Panel.tsx`): aqui o pedido explícito é dar RELEVO a cada cliente
// dentro da fila — é o próprio conceito de "cartão". O painel externo "Fila
// de atendimento" continua existindo (cabeçalho, contador), só o corpo dele
// deixou de ser uma pilha de linhas para virar uma grade de cartões.
//
// O cartão inteiro é clicável (não um botão dentro dele): a interatividade
// (role, tabIndex, Enter/Espaço, foco de teclado) vive num `div` que ENVOLVE
// o `<Panel>` — `Panel` não expõe `onClick` no seu contrato e editá-lo está
// fora do escopo desta tarefa. O hover/foco usa o padrão `group` do Tailwind
// para pintar o painel interno a partir do estado do envoltório.
import type { KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ClienteCarteira } from '@/hooks/cs';
import { formatInt, formatPct } from '@/lib/format';
import { cn } from '@/lib/utils';
import { Panel, Metric, Chip, Rail } from '@/components/cs/ui';
import { getEloInfo } from '../eloMeta';
import { construirSituacao, construirSinal } from './narrativa';

// Duração do ciclo PCA em dias — mesma constante usada em
// `cliente/ClienteResumo.tsx` para o relógio do contrato na Ficha. Não há um
// lugar comum para importar (o valor não está em `ClienteCarteira`, é regra
// de negócio do método), então repete aqui de propósito.
const DIAS_CICLO_PCA = 180;

interface ClienteCardProps {
  cliente: ClienteCarteira;
  /** Posição do cliente na lista renderizada (0-based) — vira o número da fila. */
  index: number;
  /** Tarefas abertas com prazo vencido deste cliente — calculado em Carteira.tsx a partir de `useTarefas()`. */
  tarefasAtrasadas?: number;
}

export function ClienteCard({ cliente, index, tarefasAtrasadas = 0 }: ClienteCardProps) {
  const navigate = useNavigate();
  const { frase, acao } = construirSituacao(cliente);
  const sinal = construirSinal(cliente, tarefasAtrasadas);

  // Mesma tradução comportamental da linha anterior: a palavra "crítico"
  // nunca aparece, só o efeito dela (fio laranja no topo do cartão).
  const exigeAcaoAgora = cliente.nivel_risco === 'critico';

  // Chip de elo-restrição — só aparece quando há um elo real eleito (os
  // valores especiais da RPC já viram frase própria em narrativa.ts).
  const eloChip =
    cliente.camada_0_ok && cliente.elo_restricao && cliente.elo_restricao !== 'Sem dado suficiente para simular'
      ? getEloInfo(cliente.elo_restricao).label
      : null;

  const pctContrato = Math.min(Math.max(cliente.pct_contrato ?? 0, 0), 100);
  const diasRestantes = Math.max(DIAS_CICLO_PCA - cliente.dias_de_ciclo, 0);

  const abrirCliente = () => navigate(`/cliente/${cliente.organization_id}`);
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      abrirCliente();
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={abrirCliente}
      onKeyDown={handleKeyDown}
      className="group h-full cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cs-accent))]/40"
    >
      <Panel tone={exigeAcaoAgora ? 'accent' : 'default'} className="h-full transition-colors group-hover:bg-muted/30">
        <div className="flex h-full flex-col gap-3 p-4">
          {/* Ordem de leitura, de cima para baixo: posição + nome, elo,
              relógio do contrato, situação/ação, números de apoio. */}
          <div className="flex items-start gap-2.5">
            <span
              className={cn(
                'font-display tabular-nums text-[11px] font-bold leading-5 pt-[1px]',
                exigeAcaoAgora ? 'text-[hsl(var(--cs-accent))]' : 'text-muted-foreground/45',
              )}
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <p className="text-[15px] font-semibold font-display text-foreground truncate">{cliente.nome}</p>
              {eloChip && eloChip !== '—' && <Chip tone="signal">{eloChip}</Chip>}
            </div>
          </div>

          <div>
            <Rail value={pctContrato / 100} tone="ink" />
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              {formatInt(diasRestantes)} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'} de contrato ·{' '}
              {formatPct(pctContrato, 0)} consumido
            </p>
          </div>

          <div className="min-w-0">
            <p className="text-[12.5px] leading-snug text-muted-foreground">{frase}</p>
            <p className="mt-0.5 text-[12.5px] font-medium text-foreground">{acao}</p>
            {sinal && <p className="mt-0.5 text-[11.5px] text-muted-foreground/65">{sinal}</p>}
          </div>

          <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/70 pt-2.5">
            <div className="flex flex-col gap-0.5">
              <Metric
                size="sm"
                tone={cliente.aderencia_pct == null ? 'muted' : cliente.aderencia_pct < 30 ? 'accent' : 'muted'}
                value={cliente.aderencia_pct == null ? '—' : formatPct(cliente.aderencia_pct, 0)}
              />
              <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] text-muted-foreground/45">
                aderência
              </span>
            </div>
            {tarefasAtrasadas > 0 && (
              <Chip tone="accent">
                {tarefasAtrasadas} {tarefasAtrasadas === 1 ? 'atrasada' : 'atrasadas'}
              </Chip>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}
