// Ficha do Cliente — rota "/cliente/:orgId" do app de CS. A tela mais
// importante do sistema. Reconstruída em 2026-07-31 sobre a especificação
// aprovada pelo CEO (05-operacoes-e-cs/sistema/arquitetura-app-cs.md) depois
// de duas rodadas reprovadas: a primeira parecia painel super admin (tabelas,
// badges, cartões de KPI); a segunda tirou o ruído mas tirou a estrutura
// junto (prosa bonita sobre um cômodo vazio — sem tarefas, sem linha do
// tempo, sem plano publicável, sem materiais).
//
// Os 9 blocos da especificação (seção B), nesta ordem — orientar,
// diagnosticar, agir, revisar histórico, planejar o próximo passo, consultar
// o pano de fundo:
//   1. Cabeçalho — relógio do contrato + elo-restrição + motivo da fila
//   2. A cadeia — Camada 0 (checklist) + os 8 elos (prosa numérica)
//   3. Plano do mês — checklist real, status de publicação, ação de publicar
//   4. Tarefas deste cliente
//   5. Linha do tempo unificada
//   6. Materiais do cliente
//   7. Próxima reunião — com checklist de prontidão quando é a mensal
//   8. Contexto e promessa da venda
//   9. Percepção do CEO e a divergência
// Rolagem única, sem abas — coluna única `max-w-[760px]` (justificativa na
// seção D do documento). Todo dado vem exclusivamente dos hooks de
// src/hooks/cs/ — nunca consulta direta a tabela de cliente.
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
  usePlanoConteudo,
} from '@/hooks/cs';
import type { EloMaterial } from '@/hooks/cs';
import { ClienteResumo } from '@/components/cs/cliente/ClienteResumo';
import { CadeiaNarrativa } from '@/components/cs/cliente/CadeiaNarrativa';
import { PlanoEmbutido } from '@/components/cs/cliente/PlanoEmbutido';
import { TarefasCliente } from '@/components/cs/cliente/TarefasCliente';
import { TimelineCliente } from '@/components/cs/cliente/TimelineCliente';
import { MateriaisCliente } from '@/components/cs/cliente/MateriaisCliente';
import { ProximaReuniao } from '@/components/cs/cliente/ProximaReuniao';
import { ContextoNegocio } from '@/components/cs/cliente/ContextoNegocio';
import { PercepcaoCeo } from '@/components/cs/cliente/PercepcaoCeo';

const ELOS_MATERIAL_VALIDOS: EloMaterial[] = [
  'Adoção (Camada 0)',
  'Demanda',
  'Agendamento',
  'Resgate de Lead Frio',
  'Comparecimento',
  'Fechamento',
  'Ticket',
  'Ciclo de Venda',
  'Recompra',
];

export default function ClienteDetalhe() {
  const { orgId } = useParams<{ orgId: string }>();
  const mesAtual = useMemo(() => format(new Date(), 'yyyy-MM'), []);
  const mesLabel = useMemo(() => format(new Date(), "MMMM 'de' yyyy", { locale: ptBR }), []);

  const { data: carteira = [], isLoading: carteiraLoading } = useCarteira();
  const cliente = useMemo(() => carteira?.find((c) => c.organization_id === orgId), [carteira, orgId]);

  const { data: contexto, isLoading: contextoLoading } = useClienteContexto(orgId);
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

  const eloAtual = cliente?.elo_restricao ?? null;
  const eloSugeridoMaterial = ELOS_MATERIAL_VALIDOS.includes(eloAtual as EloMaterial) ? (eloAtual as EloMaterial) : null;
  const jornadaIdAtual = passos[0]?.jornada_id ?? null;

  if (!orgId) return null;

  return (
    <div className="max-w-[760px] mx-auto pb-16">
      {/* 1. Cabeçalho */}
      <div className="pb-8">
        <ClienteResumo cliente={cliente} contexto={contexto} isLoading={carteiraLoading} />
      </div>

      <div className="divide-y divide-border/60">
        {/* 2. A cadeia */}
        <CadeiaNarrativa
          adocao={adocao}
          adocaoLoading={adocaoLoading}
          elos={elos}
          elosLoading={elosLoading}
          serie={serie}
          serieLoading={serieLoading}
          eloRestricao={eloAtual}
          camada0Passa={camada0Passa}
        />

        {/* 3. Plano do mês */}
        <PlanoEmbutido
          orgId={orgId}
          aderencia={aderencia}
          passos={passos}
          isLoading={aderenciaLoading || passosLoading}
          mesLabel={mesLabel}
        />

        {/* 4. Tarefas deste cliente */}
        <TarefasCliente orgId={orgId} clienteNome={cliente?.nome ?? 'Cliente'} clientes={carteira} />

        {/* 5. Linha do tempo */}
        <TimelineCliente orgId={orgId} />

        {/* 6. Materiais do cliente */}
        <MateriaisCliente orgId={orgId} eloSugerido={eloSugeridoMaterial} jornadaIdAtual={jornadaIdAtual} />

        {/* 7. Próxima reunião */}
        <ProximaReuniao
          orgId={orgId}
          clientes={carteira}
          aderencia={aderencia}
          aderenciaLoading={aderenciaLoading}
          eloAtual={eloAtual}
        />

        {/* 8. Contexto e promessa da venda */}
        <ContextoNegocio contexto={contexto} isLoading={contextoLoading} />

        {/* 9. Percepção do CEO e a divergência */}
        <PercepcaoCeo organizationId={orgId} percepcoes={contexto?.percepcoes_recentes ?? []} isLoading={contextoLoading} />
      </div>
    </div>
  );
}
