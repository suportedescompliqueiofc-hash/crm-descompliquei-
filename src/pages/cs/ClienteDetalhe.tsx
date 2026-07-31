// Ficha do Cliente — rota "/cliente/:orgId" do app de CS.
// A tela mais importante do sistema, e a mais fraca antes deste redesign
// (2026-07-30, veredito do CEO: "Aqui não tem histórico de nada do
// cliente... Está bem cru"). Virou um DOSSIÊ DE LEITURA, nesta ordem
// narrativa fixa:
//   1. quem é o cliente e há quanto tempo
//   2. o que foi prometido na venda (lacuna explícita quando vazio)
//   3. o histórico, cronológico
//   4. o que os números dizem (Camada 0 + os 8 elos + série do elo-restrição)
//   5. o plano do mês, embutido aqui (não em tela separada)
//   6. a percepção do CEO, com a divergência em destaque quando existe
// Sem PageHero, sem badge de risco colorido, sem card-grid. Todo dado vem
// exclusivamente dos hooks de src/hooks/cs/.
import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  useAderencia,
  useCarteira,
  useClienteAdocao,
  useClienteContexto,
  useClienteElos,
  useClienteSerie,
  useContinuidade,
  usePlanoConteudo,
} from '@/hooks/cs';
import { ClienteResumo } from '@/components/cs/cliente/ClienteResumo';
import { ContextoNegocio } from '@/components/cs/cliente/ContextoNegocio';
import { HistoricoContinuidade } from '@/components/cs/cliente/HistoricoContinuidade';
import { CadeiaNarrativa } from '@/components/cs/cliente/CadeiaNarrativa';
import { PlanoEmbutido } from '@/components/cs/cliente/PlanoEmbutido';
import { PercepcaoCeo } from '@/components/cs/cliente/PercepcaoCeo';

export default function ClienteDetalhe() {
  const { orgId } = useParams<{ orgId: string }>();
  const mesAtual = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const mesLabel = useMemo(() => format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }), []);

  const { data: carteira, isLoading: carteiraLoading } = useCarteira();
  const cliente = useMemo(() => carteira?.find((c) => c.organization_id === orgId), [carteira, orgId]);

  const { data: contexto, isLoading: contextoLoading } = useClienteContexto(orgId);
  const { data: continuidade = [], isLoading: continuidadeLoading } = useContinuidade(orgId);
  const { data: adocao = [], isLoading: adocaoLoading } = useClienteAdocao(orgId);
  const { data: elos = [], isLoading: elosLoading } = useClienteElos(orgId, mesAtual);
  const { data: serie = [], isLoading: serieLoading } = useClienteSerie(orgId);
  const { data: aderencia, isLoading: aderenciaLoading } = useAderencia(orgId, mesAtual);
  const { data: passos = [], isLoading: passosLoading } = usePlanoConteudo(orgId, mesAtual);

  const camada0Passa: boolean | null = carteiraLoading
    ? null
    : cliente
      ? cliente.camada_0_ok
      : adocao.length > 0
        ? adocao.every((i) => i.ligado)
        : null;

  if (!orgId) return null;

  return (
    <div className="max-w-[760px] mx-auto pb-16 space-y-2">
      <ClienteResumo
        nome={cliente?.nome}
        clienteDesde={cliente?.cliente_desde}
        diasDeCiclo={cliente?.dias_de_ciclo}
        pctContrato={cliente?.pct_contrato}
        isLoading={carteiraLoading}
      />

      <div className="divide-y divide-border/60">
        <ContextoNegocio contexto={contexto} isLoading={contextoLoading} />

        <HistoricoContinuidade organizationId={orgId} itens={continuidade} isLoading={continuidadeLoading} />

        <CadeiaNarrativa
          adocao={adocao}
          adocaoLoading={adocaoLoading}
          elos={elos}
          elosLoading={elosLoading}
          serie={serie}
          serieLoading={serieLoading}
          eloRestricao={cliente?.elo_restricao ?? null}
          camada0Passa={camada0Passa}
        />

        <PlanoEmbutido
          aderencia={aderencia}
          passos={passos}
          isLoading={aderenciaLoading || passosLoading}
          mesLabel={mesLabel}
        />

        <PercepcaoCeo
          organizationId={orgId}
          percepcoes={contexto?.percepcoes_recentes ?? []}
          isLoading={contextoLoading}
        />
      </div>
    </div>
  );
}
