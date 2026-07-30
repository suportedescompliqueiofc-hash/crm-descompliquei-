// Rota "/plano/:orgId" do app de CS — o plano de ação do mês daquele cliente,
// do jeito que foi publicado: as 4 semanas, aderência real (medida em
// jornada_passos via cs_aderencia) e navegação entre os meses do ciclo.
//
// Fonte de dado — SOMENTE hooks de src/hooks/cs/ (nunca tabela de cliente
// direta): useCarteira() para o seletor de cliente e o "elo em foco" do mês
// corrente; useAderencia() para o número que decide a conversa do mês;
// useClienteElos() para a leitura da cadeia de elos do período selecionado.
//
// GAP DECLARADO (ver CadeiaDoMes.tsx): nenhum hook expõe o texto do plano
// publicado — títulos das ações por semana, elo declarado e critério de
// sucesso do mês vivem em jornadas/jornada_estagios/jornada_passos, sem RPC
// `cs_*` que os devolva. Esta tela mostra a aderência NUMÉRICA real (o dado
// que de fato decide a conversa mensal), não uma lista de ações — reportado
// como pendência no relatório final do Executor.
import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ListChecks } from 'lucide-react';
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { PageHero } from '@/components/PageHero';
import { useAderencia, useCarteira, useClienteElos } from '@/hooks/cs';
import { SeletorCliente } from '@/components/cs/plano/SeletorCliente';
import { SeletorMes } from '@/components/cs/plano/SeletorMes';
import { AderenciaResumo } from '@/components/cs/plano/AderenciaResumo';
import { CadeiaDoMes } from '@/components/cs/plano/CadeiaDoMes';
import { PlanoVazio } from '@/components/cs/plano/PlanoVazio';

export default function PlanoCliente() {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: carteira = [], isLoading: carteiraLoading } = useCarteira();

  const cliente = useMemo(
    () => carteira.find((c) => c.organization_id === orgId),
    [carteira, orgId],
  );

  const hojeMes = useMemo(() => startOfMonth(new Date()), []);
  const [mes, setMes] = useState<Date>(hojeMes);

  // Trocou de cliente (via seletor ou navegação direta) — volta para o mês corrente.
  useEffect(() => {
    setMes(startOfMonth(new Date()));
  }, [orgId]);

  const minMes = cliente ? startOfMonth(parseISO(cliente.cliente_desde)) : null;
  const periodoISO = format(mes, 'yyyy-MM-dd');
  const mesLabel = format(mes, "MMMM 'de' yyyy", { locale: ptBR });
  const mesAtual = isSameMonth(mes, hojeMes);

  const { data: aderencia, isLoading: aderenciaLoading } = useAderencia(orgId, periodoISO);
  const { data: elos = [], isLoading: elosLoading } = useClienteElos(orgId, periodoISO);

  const semPlano = !aderenciaLoading && !!aderencia && aderencia.total_passos === 0;
  const clienteNaoEncontrado = !!orgId && !carteiraLoading && !cliente;

  return (
    <div className="max-w-[1400px] mx-auto space-y-8 pb-12">
      <PageHero
        dataTutorial="cs-plano-header"
        icon={ListChecks}
        title="Plano do Cliente"
        titleAccent={cliente?.nome ?? (carteiraLoading ? 'Carregando…' : orgId ? 'Cliente não encontrado' : 'Selecione um cliente')}
        subtitle="O plano de ação do mês, semana a semana, com a aderência real medida na plataforma."
        right={orgId ? <SeletorMes mes={mes} minMes={minMes} maxMes={hojeMes} onChange={setMes} /> : undefined}
      />

      <SeletorCliente clientes={carteira} orgId={orgId} isLoading={carteiraLoading} />

      {!orgId ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">
          Selecione um cliente para ver o plano do mês.
        </div>
      ) : clienteNaoEncontrado ? (
        <div className="rounded-2xl border border-border/60 bg-card p-10 text-center text-sm text-muted-foreground">
          Cliente não encontrado na carteira PCA.
        </div>
      ) : semPlano ? (
        <PlanoVazio mesLabel={mesLabel} />
      ) : (
        <>
          <AderenciaResumo aderencia={aderencia} isLoading={aderenciaLoading} />
          <CadeiaDoMes
            elos={elos}
            isLoading={elosLoading}
            eloEmFoco={cliente?.elo_restricao ?? null}
            mostrarEloEmFoco={mesAtual}
          />
        </>
      )}
    </div>
  );
}
