// Rota "/plano/:orgId" do app de CS — redesign 2026-07-30. O conteúdo
// principal do plano agora vive DENTRO da Ficha do Cliente
// (PlanoEmbutido.tsx, mês corrente). Esta tela virou o arquivo: navegar
// entre cliente e mês, e ver o plano publicado de qualquer mês do ciclo —
// inclusive meses já fechados.
//
// Redesign 2026-07-31 (design "Console"): esta tela ganhou <PlanoMesPanel>
// própria em vez de reaproveitar <PlanoEmbutido> — ver o cabeçalho desse
// arquivo para o porquê (PlanoEmbutido carrega comportamento de edição do
// mês corrente que este arquivo histórico nunca usa, e é peça compartilhada
// com a Ficha do Cliente, fora do escopo desta rodada). A largura deixou de
// ser fixa em 760px (medida de coluna de texto) — o container já é 1200px
// (CsLayout) e cada tela desenha o próprio grid dentro dele.
//
// Acopla o método (pedido do coordenador, 2026-07-30): uma referência
// discreta e recolhida (`<details>`) com a anatomia de um bom plano e o
// teste de qualidade de uma ação — útil quando o João está lendo ou
// redigindo ações, não empilhado como bloco de texto permanente na tela.
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { format, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAderencia, useCarteira, useClienteElos, usePlanoConteudo } from '@/hooks/cs';
import { getPlanoDeAcao } from '@/content/cs';
import { PageTitle, Panel, PanelBody, Section, EmptyState } from '@/components/cs/ui';
import { SeletorCliente } from '@/components/cs/plano/SeletorCliente';
import { SeletorMes } from '@/components/cs/plano/SeletorMes';
import { PlanoVazio } from '@/components/cs/plano/PlanoVazio';
import { PlanoMesPanel } from '@/components/cs/plano/PlanoMesPanel';

export default function PlanoCliente() {
  const { orgId } = useParams<{ orgId: string }>();

  const { data: carteira = [], isLoading: carteiraLoading } = useCarteira();
  const cliente = useMemo(() => carteira.find((c) => c.organization_id === orgId), [carteira, orgId]);

  const hojeMes = useMemo(() => startOfMonth(new Date()), []);
  const [mes, setMes] = useState<Date>(hojeMes);

  useEffect(() => {
    setMes(startOfMonth(new Date()));
  }, [orgId]);

  const minMes = cliente ? startOfMonth(parseISO(cliente.cliente_desde)) : null;
  const periodoISO = format(mes, 'yyyy-MM-dd');
  const mesLabel = format(mes, "MMMM 'de' yyyy", { locale: ptBR });
  const mesAtual = isSameMonth(mes, hojeMes);

  const { data: aderencia, isLoading: aderenciaLoading } = useAderencia(orgId, periodoISO);
  const { data: elos = [], isLoading: elosLoading } = useClienteElos(orgId, periodoISO);
  const { data: passos = [], isLoading: passosLoading } = usePlanoConteudo(orgId, periodoISO);

  const semPlano =
    !aderenciaLoading && !passosLoading && !!aderencia && aderencia.total_passos === 0 && passos.length === 0;
  const clienteNaoEncontrado = !!orgId && !carteiraLoading && !cliente;

  const anatomia = getPlanoDeAcao();

  return (
    <div className="pb-16 space-y-6">
      <PageTitle
        // Trilha em três níveis quando há cliente: a ficha dele é o caminho
        // natural de volta (foi de lá que se chegou aqui pelo "ver plano
        // completo"), e a Carteira é a saída de cima. Sem cliente na URL, a
        // tela é só um arquivo genérico e a trilha para na Carteira.
        trilha={
          cliente
            ? [{ label: 'Carteira', to: '/' }, { label: cliente.nome, to: `/cliente/${cliente.organization_id}` }, { label: 'Plano' }]
            : [{ label: 'Carteira', to: '/' }, { label: 'Plano' }]
        }
        title="Plano"
        eyebrow="PLANO"
        description="O plano publicado em cada mês do ciclo — arquivo histórico. O mês corrente vive na ficha do cliente."
      />

      {/* Painel de filtro — cliente e mês são os dois controles que decidem
          o que o resto da tela mostra; ganham superfície própria em vez de
          flutuarem soltos sobre o canvas entre o título e o painel do mês. */}
      <Panel>
        <PanelBody className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <SeletorCliente clientes={carteira} orgId={orgId} isLoading={carteiraLoading} />
          {orgId && <SeletorMes mes={mes} minMes={minMes} maxMes={hojeMes} onChange={setMes} />}
        </PanelBody>
      </Panel>

      {!orgId ? (
        <EmptyState title="Selecione um cliente" description="Escolha um cliente no filtro acima para ver o plano do mês." />
      ) : clienteNaoEncontrado ? (
        <EmptyState title="Cliente não encontrado" description="Este cliente não está na carteira PCA." />
      ) : semPlano ? (
        <PlanoVazio mesLabel={mesLabel} />
      ) : (
        <PlanoMesPanel
          mesLabel={mesLabel}
          aderencia={aderencia}
          passos={passos}
          isLoading={aderenciaLoading || passosLoading}
        />
      )}

      {!elosLoading && elos.length > 0 && mesAtual && (
        <p className="text-[13px] text-muted-foreground/70">
          A cadeia de elos deste mês, em detalhe, está na ficha do cliente.
        </p>
      )}

      <Section title="Referência">
        <details className="text-sm">
          <summary className="cursor-pointer text-foreground font-medium">Anatomia de um bom plano</summary>
          <div className="mt-2 space-y-2 text-[13px] text-muted-foreground leading-relaxed max-w-[620px]">
            <p>{anatomia.oQueE}</p>
            <p>{anatomia.umEloPorPlano.regra}</p>
            <div>
              <p className="font-medium text-foreground mb-1">Teste de qualidade de uma ação:</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {anatomia.testeDeQualidade.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
            <Link
              to="/metodo?secao=artefatos"
              className="inline-block text-foreground underline underline-offset-2 hover:no-underline"
            >
              Ver o plano de ação completo, com os 9 exemplos por elo, no Método
            </Link>
          </div>
        </details>
      </Section>
    </div>
  );
}
