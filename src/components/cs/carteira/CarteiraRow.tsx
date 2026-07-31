import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { formatPct } from '@/lib/format';
import type { ClienteCarteira } from '@/hooks/cs';
import { ListRow, Metric, StatusIndicator, type StatusTone } from '@/components/cs/ui';
import { getEloInfo } from '../eloMeta';
import { formatDataBR } from '../format';
import { CARTEIRA_GRID_COLS } from './utils';

// Mesmo vocabulário de `cs_carteira.nivel_risco` usado em `ClienteDetalhe.tsx`
// — nunca 'baixo'/'medio'/'alto'.
const NIVEL_RISCO_LABEL: Record<string, string> = {
  critico: 'Crítico',
  atencao: 'Atenção',
  saudavel: 'Saudável',
  referencia: 'Referência',
};

function riscoTone(nivel: string | null): StatusTone {
  if (nivel && nivel in NIVEL_RISCO_LABEL) return nivel as StatusTone;
  return 'neutro';
}

/**
 * Uma clínica da carteira PCA — uma linha de lista, não um cartão dentro de
 * outro cartão. A linha inteira é clicável e abre a mesa de trabalho do
 * cliente (`/cliente/:orgId`).
 *
 * Quando `camada_0_ok` é falso, a coluna de elo-restrição não mostra o elo
 * calculado — mostra um aviso discreto ("Adoção pendente") no lugar. Antes
 * disso era uma faixa vermelha de largura total acima da linha; a informação
 * é a mesma (o diagnóstico comercial não é confiável ainda), mas agora
 * convive na mesma hierarquia visual do resto da linha em vez de gritar mais
 * alto que ela.
 */
export function CarteiraRow({ cliente }: { cliente: ClienteCarteira }) {
  const navigate = useNavigate();
  const { label: eloLabel, camadaLabel } = getEloInfo(cliente.elo_restricao);
  const tone = riscoTone(cliente.nivel_risco);
  const riscoLabel = cliente.nivel_risco ? (NIVEL_RISCO_LABEL[cliente.nivel_risco] ?? cliente.nivel_risco) : '—';

  return (
    <ListRow onClick={() => navigate(`/cliente/${cliente.organization_id}`)}>
      <div className={cn('grid grid-cols-1 gap-2.5 md:gap-6 items-start md:items-center', CARTEIRA_GRID_COLS)}>
        {/* Cliente: nome + tempo de casa + relógio do contrato (texto, sem barra) */}
        <div className="min-w-0">
          <p className="text-sm font-semibold font-display text-foreground truncate">{cliente.nome}</p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">
            Cliente desde {formatDataBR(cliente.cliente_desde)} · {formatPct(cliente.pct_contrato, 0)} do contrato
          </p>
        </div>

        {/* Risco */}
        <div className="flex items-center gap-2 md:block">
          <span className="md:hidden text-[11px] text-muted-foreground/40">Risco</span>
          <StatusIndicator tone={tone} label={riscoLabel} />
        </div>

        {/* Elo-restrição — ou aviso de adoção pendente */}
        <div className="min-w-0">
          {cliente.camada_0_ok ? (
            <>
              <p className="text-sm text-foreground truncate">{eloLabel}</p>
              <p className="text-xs text-muted-foreground/50 mt-0.5">{camadaLabel}</p>
            </>
          ) : (
            <>
              <StatusIndicator tone="atencao" label="Adoção pendente" />
              <p className="text-xs text-muted-foreground/50 mt-0.5">Diagnóstico comercial ainda não é confiável</p>
            </>
          )}
        </div>

        {/* Aderência */}
        <div className="flex items-center gap-2 md:block md:text-right">
          <span className="md:hidden text-[11px] text-muted-foreground/40">Aderência</span>
          <Metric size="sm" value={cliente.aderencia_pct == null ? '—' : formatPct(cliente.aderencia_pct, 0)} />
        </div>
      </div>
    </ListRow>
  );
}
