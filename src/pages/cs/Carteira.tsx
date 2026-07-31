// Rota "/" do app de CS — a carteira PCA inteira, ordenada por risco. É a
// primeira tela que o João vê ao abrir o sistema: responde "com quem eu
// preciso me preocupar agora" — em segundos, não depois de ler quatro
// cartões de métrica que só repetem o que a lista já mostra.
//
// Implementação de referência da linguagem visual nova do app de CS — ver
// 05-operacoes-e-cs/sistema/design-cs.md. Sem PageHero, sem StatCardGrid: um
// título discreto, no máximo um número grande (quantos clientes estão em
// crítico agora), e a lista em si como protagonista.
//
// Fonte de dado: exclusivamente `useCarteira()` (src/hooks/cs/useCarteira.ts),
// que já chama a RPC `cs_carteira` e devolve a lista ordenada por `ordem_fila`
// (a régua de risco — 05-operacoes-e-cs/sistema/ritos/01-regua-de-risco.md).
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { formatInt } from '@/lib/format';
import { useCarteira } from '@/hooks/cs';
import { PageTitle, Section, Metric, EmptyState, LoadingState, ErrorState } from '@/components/cs/ui';
import { CarteiraListHeader } from '@/components/cs/carteira/CarteiraListHeader';
import { CarteiraRow } from '@/components/cs/carteira/CarteiraRow';

export default function Carteira() {
  const { data: carteira, isLoading, isError } = useCarteira();
  const lista = carteira ?? [];

  useEffect(() => {
    if (isError) {
      toast.error('Não foi possível carregar a carteira. Tente novamente em instantes.');
    }
  }, [isError]);

  const resumo = useMemo(() => {
    const total = lista.length;
    const criticos = lista.filter((c) => c.nivel_risco === 'critico').length;
    const semCamada0 = lista.filter((c) => !c.camada_0_ok).length;
    return { total, criticos, semCamada0 };
  }, [lista]);

  // O único número grande da tela (princípio "um número por tela, no
  // máximo"): quantos clientes estão em crítico agora — a pergunta que essa
  // tela existe para responder. Se não há crítico, o número vira o total da
  // carteira, em tom neutro, para a tela nunca ficar sem nenhum número.
  const descricao = isLoading ? undefined : (
    <div className="space-y-1 pt-1">
      <Metric
        size="lg"
        tone={resumo.criticos > 0 ? 'danger' : 'muted'}
        value={resumo.criticos > 0 ? formatInt(resumo.criticos) : formatInt(resumo.total)}
      />
      <p>
        {resumo.criticos > 0
          ? `em estado crítico, de ${formatInt(resumo.total)} clientes na carteira.`
          : 'clientes na carteira — nenhum em estado crítico agora.'}
        {resumo.semCamada0 > 0 &&
          ` ${formatInt(resumo.semCamada0)} sem Camada 0 configurada — diagnóstico deles ainda não é confiável.`}
      </p>
    </div>
  );

  return (
    <div className="max-w-[1100px] mx-auto pb-12">
      <PageTitle title="Carteira" description={descricao} />

      <Section
        title="Clientes PCA"
        description="Ordenados pela régua de risco — nível, depois relógio do contrato, contato, resultado e aderência."
      >
        {isLoading ? (
          <LoadingState label="Carregando a carteira…" />
        ) : isError ? (
          <ErrorState description="Não foi possível carregar a carteira." />
        ) : lista.length === 0 ? (
          <EmptyState title="Nada por aqui ainda" description="Assim que a carteira for carregada, ela aparece aqui." />
        ) : (
          <div>
            <CarteiraListHeader />
            <div className="divide-y divide-border/50">
              {lista.map((cliente) => (
                <CarteiraRow key={cliente.organization_id} cliente={cliente} />
              ))}
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
