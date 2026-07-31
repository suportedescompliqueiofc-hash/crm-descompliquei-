// Ficha do Cliente — rota "/cliente/:orgId" do app de CS.
// A tela mais importante do sistema: é onde o João se prepara antes de falar
// com um cliente. Segue o protocolo de 05-operacoes-e-cs/sistema/02-diagnostico.md:
// (1) Camada 0 como portão, (2) a cadeia dos 8 elos por camada, (3) série
// histórica desde o cadastro, (4) aderência ao plano corrente, (5) relógio do
// contrato de 180 dias. Todo dado de cliente vem exclusivamente dos hooks de
// `src/hooks/cs/` — nunca consulta de tabela direta.
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Stethoscope } from 'lucide-react';
import { PageHero } from '@/components/PageHero';
import { cn } from '@/lib/utils';
import { useAderencia, useCarteira, useClienteAdocao, useClienteElos, useClienteSerie } from '@/hooks/cs';
import { CamadaZeroPortao } from '@/components/cs/cliente/CamadaZeroPortao';
import { CadeiaElos } from '@/components/cs/cliente/CadeiaElos';
import { SerieHistorica } from '@/components/cs/cliente/SerieHistorica';
import { AderenciaPlano } from '@/components/cs/cliente/AderenciaPlano';
import { RelogioContrato } from '@/components/cs/cliente/RelogioContrato';

// Valores reais devolvidos por cs_carteira.nivel_risco (ver
// supabase/migrations/20260730120001_cs_funcoes_novo_modelo.sql, CTE `niveis`):
// 'critico' | 'atencao' | 'saudavel' — nunca 'baixo'/'medio'/'alto'. Mesmo
// vocabulário de src/components/cs/carteira/RiscoBadge.tsx (que já acertava
// isso) — bug real encontrado na revisão de 2026-07-30: com as chaves erradas
// abaixo, nenhuma cor de badge batia (nivel_risco nunca é null/'' aqui) e o
// rótulo caía no fallback de texto cru ("critico" em vez de "Risco crítico").
const NIVEL_RISCO_LABEL: Record<string, string> = {
  critico: 'Risco crítico',
  atencao: 'Atenção',
  saudavel: 'Saudável',
  referencia: 'Referência',
};

export default function ClienteDetalhe() {
  const { orgId } = useParams<{ orgId: string }>();
  const mesAtual = useMemo(() => format(new Date(), 'yyyy-MM'), []);

  // Nome, tempo de casa e o veredito da Camada 0 vêm de `useCarteira` — é a
  // única RPC do contrato que expõe esses campos por cliente (cs_carteira).
  const { data: carteira, isLoading: carteiraLoading } = useCarteira();
  const cliente = useMemo(() => carteira?.find((c) => c.organization_id === orgId), [carteira, orgId]);

  const { data: adocao = [], isLoading: adocaoLoading } = useClienteAdocao(orgId);
  const { data: elos = [], isLoading: elosLoading } = useClienteElos(orgId, mesAtual);
  const { data: serie = [], isLoading: serieLoading } = useClienteSerie(orgId);
  const { data: aderencia, isLoading: aderenciaLoading } = useAderencia(orgId, mesAtual);

  // Veredito do portão: prioriza o campo já calculado no backend
  // (cs_carteira.camada_0_ok). Só cai para o cálculo local (todo item ligado)
  // se o cliente não estiver na carteira retornada — nunca duplica a regra de
  // negócio de "quais itens são críticos", que é do backend.
  const camada0Passa: boolean | null = carteiraLoading
    ? null
    : cliente
      ? cliente.camada_0_ok
      : adocao.length > 0
        ? adocao.every((i) => i.ligado)
        : null;

  const nomeCliente = cliente?.nome ?? (carteiraLoading ? 'Carregando…' : orgId ? 'Cliente' : '—');
  const clienteDesdeLabel = cliente?.cliente_desde
    ? format(parseISO(cliente.cliente_desde), "'cliente desde' d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : undefined;
  const nivelRisco = cliente?.nivel_risco ? NIVEL_RISCO_LABEL[cliente.nivel_risco] ?? cliente.nivel_risco : null;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-cliente-header"
        icon={Stethoscope}
        title={nomeCliente}
        subtitle={clienteDesdeLabel ?? 'Mesa de trabalho do cliente PCA — números, cadeia e aderência ao plano.'}
        right={
          nivelRisco && (
            <span
              className={cn(
                'inline-flex items-center px-3 py-1.5 rounded-full text-[11px] font-semibold border backdrop-blur-sm',
                cliente?.nivel_risco === 'critico' && 'bg-red-500/15 text-red-200 border-red-400/30',
                cliente?.nivel_risco === 'atencao' && 'bg-amber-500/15 text-amber-200 border-amber-400/30',
                cliente?.nivel_risco === 'saudavel' && 'bg-emerald-500/15 text-emerald-200 border-emerald-400/30',
                cliente?.nivel_risco === 'referencia' && 'bg-blue-500/15 text-blue-200 border-blue-400/30',
                !cliente?.nivel_risco && 'bg-white/10 text-white/80 border-white/15',
              )}
            >
              {nivelRisco}
            </span>
          )
        }
      />

      {/* 1 — Camada 0 como portão, antes de qualquer número de elo */}
      <CamadaZeroPortao items={adocao} isLoading={adocaoLoading || carteiraLoading} passa={camada0Passa} />

      {/* 2 — A cadeia, por camada, com o elo-restrição destacado */}
      <CadeiaElos elos={elos} isLoading={elosLoading} eloRestricao={cliente?.elo_restricao ?? null} camada0Passa={camada0Passa} />

      {/* 3 — Série histórica desde o cadastro, elo selecionável */}
      <SerieHistorica
        serie={serie}
        isLoading={serieLoading}
        clienteDesde={cliente?.cliente_desde}
        eloInicial={cliente?.elo_restricao}
      />

      {/* 4 — Aderência ao plano corrente · 5 — Relógio do contrato */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AderenciaPlano aderencia={aderencia} isLoading={aderenciaLoading} />
        <RelogioContrato diasDeCiclo={cliente?.dias_de_ciclo} pctContrato={cliente?.pct_contrato} isLoading={carteiraLoading} />
      </div>
    </div>
  );
}
