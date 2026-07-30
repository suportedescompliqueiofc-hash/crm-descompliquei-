import { ChevronRight, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatPct } from '@/lib/format';
import type { ClienteCarteira } from '@/hooks/cs';
import { RiscoBadge } from './RiscoBadge';
import { RelogioContrato } from './RelogioContrato';
import { getEloInfo } from '../eloMeta';
import { formatDataBR } from '../format';
import { CARTEIRA_GRID_COLS } from './utils';

/**
 * Uma clínica da carteira PCA. O card inteiro é clicável e navega para a
 * mesa de trabalho do cliente (`/cliente/:orgId`). Quando `camada_0_ok` é
 * falso, a linha ganha uma faixa de alerta própria acima do conteúdo — é a
 * informação mais importante da linha quando acontece, não mais um badge.
 */
export function CarteiraRow({ cliente }: { cliente: ClienteCarteira }) {
  const navigate = useNavigate();
  const { label: eloLabel, camadaLabel } = getEloInfo(cliente.elo_restricao);

  const abrirCliente = () => navigate(`/cliente/${cliente.organization_id}`);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={abrirCliente}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          abrirCliente();
        }
      }}
      className="group overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer transition-colors hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
    >
      {!cliente.camada_0_ok && (
        <div className="flex items-center gap-2 px-5 py-2 bg-red-50 border-b border-red-200/60">
          <ShieldAlert className="h-3.5 w-3.5 text-red-600 shrink-0" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-red-700">
            Camada 0 não configurada — diagnóstico não confiável
          </p>
        </div>
      )}

      <div className={cn('grid grid-cols-1 gap-3 md:gap-6 items-center px-5 py-4', CARTEIRA_GRID_COLS)}>
        {/* Cliente: nome + cliente desde + relógio do contrato */}
        <div className="min-w-0 space-y-1.5">
          <p className="text-sm font-semibold font-display text-foreground truncate">{cliente.nome}</p>
          <p className="text-[11px] text-muted-foreground/60">
            Cliente desde {formatDataBR(cliente.cliente_desde)}
          </p>
          <RelogioContrato pctContrato={cliente.pct_contrato} />
        </div>

        {/* Risco */}
        <div className="flex md:block">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 md:hidden mr-2">
            Risco
          </span>
          <RiscoBadge nivel={cliente.nivel_risco} />
        </div>

        {/* Elo-restrição + camada */}
        <div className="min-w-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 md:hidden">
            Elo-restrição
          </span>
          <p className="text-sm font-medium text-foreground truncate">{eloLabel}</p>
          <p className="text-[11px] text-muted-foreground/60">{camadaLabel}</p>
        </div>

        {/* Aderência */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50 md:hidden mr-2">
            Aderência
          </span>
          <span className="text-[15px] font-bold font-display tabular-nums text-foreground">
            {cliente.aderencia_pct == null ? '—' : formatPct(cliente.aderencia_pct, 0)}
          </span>
        </div>

        <ChevronRight className="hidden md:block h-4 w-4 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors justify-self-end" />
      </div>
    </div>
  );
}
