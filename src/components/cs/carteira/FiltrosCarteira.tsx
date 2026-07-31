// Barra de filtros da Carteira — pedido do CEO em 2026-07-31 ("na parte de
// carteira pode ter alguns filtros também"). Tudo aqui é estado LOCAL da
// tela (useState em Carteira.tsx, ver o comentário lá): busca por nome e os
// filtros rápidos são uma peneira em memória sobre a lista que `useCarteira()`
// já carregou — nunca tocam hook, cache ou URL, e nunca chamam o banco de
// novo.
//
// Os filtros por elo-restrição são DERIVADOS dos dados presentes na carteira
// (calculados em Carteira.tsx a partir da própria lista) — de propósito, para
// não hardcodar aqui uma lista de elos que pode não bater com o que a
// carteira atual de fato tem.
import type { ChangeEvent } from 'react';
import { Panel, PanelBody, Action } from '@/components/cs/ui';
import { formatInt } from '@/lib/format';

/** 'todos' | 'acao' | 'sem_plano' | 'elo:<valor cru de elo_restricao>'. */
export type FiltroCarteira = 'todos' | 'acao' | 'sem_plano' | `elo:${string}`;

export interface EloPresente {
  /** Valor cru de `elo_restricao`, usado para comparar/filtrar. */
  valor: string;
  /** Rótulo legível (getEloInfo), usado só para exibir o filtro. */
  label: string;
}

interface FiltrosCarteiraProps {
  busca: string;
  onBuscaChange: (valor: string) => void;
  filtro: FiltroCarteira;
  onFiltroChange: (filtro: FiltroCarteira) => void;
  elosPresentes: EloPresente[];
  mostrando: number;
  total: number;
}

export function FiltrosCarteira({
  busca,
  onBuscaChange,
  filtro,
  onFiltroChange,
  elosPresentes,
  mostrando,
  total,
}: FiltrosCarteiraProps) {
  const handleBusca = (e: ChangeEvent<HTMLInputElement>) => onBuscaChange(e.target.value);

  return (
    <Panel className="mb-4">
      <PanelBody className="flex flex-col gap-3">
        <input
          type="text"
          value={busca}
          onChange={handleBusca}
          placeholder="Buscar cliente pelo nome…"
          aria-label="Buscar cliente pelo nome"
          className="h-9 w-full max-w-sm rounded-lg border border-border bg-card px-3 text-[13px] text-foreground placeholder:text-muted-foreground/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--cs-accent))]/40"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <Action size="sm" variant={filtro === 'todos' ? 'solid' : 'ghost'} onClick={() => onFiltroChange('todos')}>
            Todos
          </Action>
          <Action size="sm" variant={filtro === 'acao' ? 'solid' : 'ghost'} onClick={() => onFiltroChange('acao')}>
            Precisam de ação
          </Action>
          <Action
            size="sm"
            variant={filtro === 'sem_plano' ? 'solid' : 'ghost'}
            onClick={() => onFiltroChange('sem_plano')}
          >
            Sem plano no mês
          </Action>
          {elosPresentes.map((elo) => (
            <Action
              key={elo.valor}
              size="sm"
              variant={filtro === (`elo:${elo.valor}` as FiltroCarteira) ? 'solid' : 'ghost'}
              onClick={() => onFiltroChange(`elo:${elo.valor}`)}
            >
              {elo.label}
            </Action>
          ))}

          <span className="ml-auto shrink-0 text-[11.5px] text-muted-foreground/70">
            Mostrando {formatInt(mostrando)} de {formatInt(total)}
          </span>
        </div>
      </PanelBody>
    </Panel>
  );
}
