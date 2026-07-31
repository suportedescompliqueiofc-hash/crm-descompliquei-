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
// Segunda passada de design (2026-07-31, conceito "Console"): o número grande
// que antes vivia dentro da descrição virou `stats` do PageTitle (é leitura,
// não prosa) e a lista deixou de ser um `divide-y` solto para virar um
// `Panel` — "FILA DE ATENDIMENTO" — porque é isso que ela é: uma fila de
// trabalho, não um parágrafo com clientes.
//
// Fonte de dado: `useCarteira()` para a fila em si; `useTarefas()` só para o
// acréscimo de sinal por linha (tarefas atrasadas — arquitetura-app-cs.md,
// seção D). Nenhuma outra fonte entra nesta tela.
import { useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatInt } from '@/lib/format';
import { useCarteira, useTarefas } from '@/hooks/cs';
import {
  PageTitle,
  Panel,
  PanelHeader,
  PanelBody,
  PanelRows,
  Readout,
  Action,
  EmptyState,
  LoadingState,
  ErrorState,
} from '@/components/cs/ui';
import { CarteiraRow } from '@/components/cs/carteira/CarteiraRow';

export default function Carteira() {
  const { data: carteira, isLoading, isError, refetch } = useCarteira();
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
    // Mesmo campo que a linha usa para o chip "sem plano" (aderencia_pct nulo
    // = a RPC não achou plano publicado no período corrente para o cliente).
    const semPlano = lista.filter((c) => c.aderencia_pct == null).length;
    return { total, urgentes, semPlano };
  }, [lista]);

  return (
    <div className="pb-12">
      <PageTitle
        title="Carteira"
        description="A fila abaixo já vem ordenada por quem precisa de ação primeiro — o mesmo critério da régua de risco do método."
        stats={
          !isLoading && (
            <>
              <Readout
                label="Pedem ação agora"
                value={formatInt(resumo.urgentes)}
                tone={resumo.urgentes > 0 ? 'accent' : 'muted'}
              />
              <Readout label="Na carteira" value={formatInt(resumo.total)} />
              <Readout
                label="Sem plano no mês"
                value={formatInt(resumo.semPlano)}
                tone={resumo.semPlano > 0 ? 'accent' : 'muted'}
              />
            </>
          )
        }
      />

      <Panel>
        <PanelHeader title="Fila de atendimento" hint="ordenada por quem precisa de ação primeiro" />
        <PanelBody flush>
          {isLoading ? (
            <div className="px-4 py-4">
              <LoadingState rows={6} label="Carregando a carteira…" />
            </div>
          ) : isError ? (
            <div className="px-4 py-4">
              <ErrorState
                description="Não foi possível carregar a carteira."
                action={
                  <Action variant="outline" size="sm" onClick={() => refetch()}>
                    Tentar novamente
                  </Action>
                }
              />
            </div>
          ) : lista.length === 0 ? (
            <div className="px-4 py-4">
              <EmptyState title="Nada por aqui ainda" description="Assim que a carteira for carregada, ela aparece aqui." />
            </div>
          ) : (
            <PanelRows>
              {lista.map((cliente, index) => (
                <CarteiraRow
                  key={cliente.organization_id}
                  cliente={cliente}
                  index={index}
                  tarefasAtrasadas={atrasadasPorCliente.get(cliente.organization_id) ?? 0}
                />
              ))}
            </PanelRows>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
