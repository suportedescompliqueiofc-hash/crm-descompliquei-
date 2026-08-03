// Ficha do Cliente — rota "/cliente/:orgId" do app de CS. A tela mais
// importante do sistema.
//
// Redesign 2026-07-31 (rodada "Console"): a sistemática (os blocos, a ordem,
// as regras) já estava aprovada — o que muda aqui é só a forma. A coluna
// única de 760px empurrava tudo para uma rolagem infinita e não deixava
// nenhum bloco respirar como painel; agora a ficha usa os 1200px inteiros do
// `CsLayout` em DUAS COLUNAS:
//   - esquerda (fluida): A cadeia → Plano do mês → Tarefas → Linha do tempo
//     → Materiais — nesta ordem porque é a ordem de TRABALHO (diagnosticar,
//     agir no plano, agir nas tarefas, olhar o histórico, olhar o material).
//   - direita (340px, sticky): Próxima reunião → Contexto e promessa da
//     venda → Percepção do CEO — é CONSULTA, não trabalho: fica fixa
//     enquanto se rola a coluna da esquerda porque não muda com a rolagem.
// Todo dado continua vindo exclusivamente dos hooks de src/hooks/cs/ — nunca
// consulta direta a tabela de cliente.
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
  const mesAtual = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
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
    <div className="pb-16">
      {/* 1. Cabeçalho — fora das duas colunas: fala pela ficha inteira. */}
      <div className="mb-6">
        <ClienteResumo cliente={cliente} contexto={contexto} isLoading={carteiraLoading} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
        {/* Coluna principal — trabalho, na ordem do rito diário. */}
        <div className="space-y-5 min-w-0">
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
        </div>

        {/* Coluna lateral — consulta, fixa enquanto se rola o trabalho. */}
        <div className="space-y-5 lg:sticky lg:top-[68px]">
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
    </div>
  );
}
