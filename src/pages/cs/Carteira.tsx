// Rota "/" do app de CS — a carteira PCA inteira, ordenada por risco. É a
// primeira tela que o João vê ao abrir o sistema: responde "com quem eu
// preciso me preocupar agora" — em segundos, lendo frases, não decodificando
// uma tabela.
//
// Redesign completo (2026-07-30, veredito do CEO — ver
// 05-operacoes-e-cs/sistema/design-cs.md para a primeira tentativa e por que
// não bastou). O conceito novo: cada cliente é uma frase, não uma linha de
// colunas. As palavras "crítico"/"atenção"/"saudável" nunca aparecem — nem
// aqui, nem em CarteiraRow.tsx/narrativa.ts. Urgência vem da ordem
// (ordem_fila, já calculada pelo banco) e do texto, nunca de cor.
//
// Fonte de dado: `useCarteira()` para a fila em si; `useTarefas()` só para o
// acréscimo de sinal por linha (tarefas atrasadas — arquitetura-app-cs.md,
// seção D). Nenhuma outra fonte entra nesta tela.
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatInt } from '@/lib/format';
import { useCarteira, useTarefas } from '@/hooks/cs';
import { PageTitle, Section, Metric, EmptyState, LoadingState, ErrorState } from '@/components/cs/ui';
import { CarteiraRow } from '@/components/cs/carteira/CarteiraRow';

export default function Carteira() {
  const { data: carteira, isLoading, isError } = useCarteira();
  const { data: tarefas = [] } = useTarefas();
  const lista = carteira ?? [];

  const hojeStr = format(new Date(), 'yyyy-MM-dd');
  const atrasadasPorCliente = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const t of tarefas) {
      if (t.concluida || !t.organization_id || !t.prazo || t.prazo >= hojeStr) continue;
      mapa.set(t.organization_id, (mapa.get(t.organization_id) ?? 0) + 1);
    }
    return mapa;
  }, [tarefas, hojeStr]);

  useEffect(() => {
    if (isError) {
      toast.error('Não foi possível carregar a carteira. Tente novamente em instantes.');
    }
  }, [isError]);

  const resumo = useMemo(() => {
    const total = lista.length;
    // "Precisam de ação imediata" é a tradução comportamental de
    // nivel_risco === 'critico' — a PALAVRA nunca é impressa na tela.
    const urgentes = lista.filter((c) => c.nivel_risco === 'critico').length;
    return { total, urgentes };
  }, [lista]);

  const descricao = isLoading ? undefined : (
    <div className="space-y-1 pt-1">
      {resumo.urgentes > 0 ? (
        <>
          <Metric size="lg" value={formatInt(resumo.urgentes)} />
          <p>
            {resumo.urgentes === 1 ? 'cliente pede' : 'clientes pedem'} ação imediata agora, de{' '}
            {formatInt(resumo.total)} na carteira.
          </p>
        </>
      ) : (
        <>
          <Metric size="lg" tone="muted" value={formatInt(resumo.total)} />
          <p>clientes na carteira — nenhum pede ação imediata agora.</p>
        </>
      )}
    </div>
  );

  return (
    <div className="max-w-[760px] mx-auto pb-12">
      <PageTitle title="Carteira" description={descricao} />

      <Section>
        {isLoading ? (
          <LoadingState label="Carregando a carteira…" />
        ) : isError ? (
          <ErrorState description="Não foi possível carregar a carteira." />
        ) : lista.length === 0 ? (
          <EmptyState title="Nada por aqui ainda" description="Assim que a carteira for carregada, ela aparece aqui." />
        ) : (
          <div className="divide-y divide-border/50">
            {lista.map((cliente) => (
              <CarteiraRow
                key={cliente.organization_id}
                cliente={cliente}
                tarefasAtrasadas={atrasadasPorCliente.get(cliente.organization_id) ?? 0}
              />
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
