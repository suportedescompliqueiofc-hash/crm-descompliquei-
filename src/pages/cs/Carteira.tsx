// Rota "/" do app de CS — a carteira PCA inteira, ordenada por risco. É a
// primeira tela que o João vê ao abrir o sistema: responde "com quem eu
// preciso me preocupar agora" — em segundos, lendo frases, não decodificando
// uma tabela.
//
// Redesign completo (2026-07-30, veredito do CEO — ver
// 05-operacoes-e-cs/sistema/design-cs.md para a primeira tentativa e por que
// não bastou). O conceito novo: cada cliente é uma frase, não uma linha de
// colunas. As palavras "crítico"/"atenção"/"saudável" nunca aparecem — nem
// aqui, nem em ClienteCard.tsx/narrativa.ts. Urgência vem da ordem
// (ordem_fila, já calculada pelo banco) e do texto, nunca de cor.
//
// Segunda passada de design (2026-07-31, conceito "Console"): o número grande
// que antes vivia dentro da descrição virou `stats` do PageTitle (é leitura,
// não prosa) e a lista deixou de ser um `divide-y` solto para virar um
// `Panel` — "FILA DE ATENDIMENTO" — porque é isso que ela é: uma fila de
// trabalho, não um parágrafo com clientes.
//
// Terceira passada (2026-07-31, pedido direto do CEO: "na parte de carteira
// pode ter alguns filtros também. E um card do cliente um pouco mais
// bonitinho"). Duas mudanças, sem tocar em dado nem em navegação:
//   1. `CarteiraRow` (linha de lista) virou `ClienteCard` (painel próprio) —
//      ver o cabeçalho de ClienteCard.tsx para a exceção deliberada à regra
//      "painel nunca dentro de painel".
//   2. Ganhou uma barra de filtros (`FiltrosCarteira`) acima da fila: busca
//      por nome + filtros rápidos + contador. É estado LOCAL desta tela
//      (useState abaixo) — não mexe em `useCarteira()`, cache ou URL; é só
//      uma peneira em memória sobre a lista que o hook já trouxe. A ORDEM da
//      fila nunca muda por causa de um filtro — só reduz quais entradas
//      aparecem, preservando `ordem_fila`.
//
// Fonte de dado: `useCarteira()` para a fila em si; `useTarefas()` só para o
// acréscimo de sinal por linha (tarefas atrasadas — arquitetura-app-cs.md,
// seção D). Nenhuma outra fonte entra nesta tela.
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { formatInt } from '@/lib/format';
import { useCarteira, useTarefas } from '@/hooks/cs';
import {
  PageTitle,
  Panel,
  PanelHeader,
  PanelBody,
  Readout,
  Action,
  EmptyState,
  LoadingState,
  ErrorState,
} from '@/components/cs/ui';
import { ClienteCard } from '@/components/cs/carteira/ClienteCard';
import { FiltrosCarteira, type FiltroCarteira, type EloPresente } from '@/components/cs/carteira/FiltrosCarteira';
import { getEloInfo } from '@/components/cs/eloMeta';

export default function Carteira() {
  const { data: carteira, isLoading, isError, refetch } = useCarteira();
  const { data: tarefas = [] } = useTarefas();
  const lista = carteira ?? [];

  // Filtro é estado local da TELA — nunca da fonte de dado. Resetar a busca
  // ou o filtro não refaz nenhuma chamada ao banco, só reaplica o `.filter`
  // abaixo sobre a mesma lista já carregada.
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroCarteira>('todos');

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
    // Mesmo campo que o cartão usa para o sinal "sem plano" (aderencia_pct
    // nulo = a RPC não achou plano publicado no período corrente).
    const semPlano = lista.filter((c) => c.aderencia_pct == null).length;
    return { total, urgentes, semPlano };
  }, [lista]);

  // Elos-restrição presentes na carteira ATUAL — vira filtro rápido. Nunca
  // uma lista fixa: se nenhum cliente estiver com "Ticket" como restrição
  // hoje, o filtro "Ticket" simplesmente não existe na barra.
  const elosPresentes: EloPresente[] = useMemo(() => {
    const porValor = new Map<string, string>();
    for (const c of lista) {
      if (!c.camada_0_ok || !c.elo_restricao || c.elo_restricao === 'Sem dado suficiente para simular') continue;
      const { label } = getEloInfo(c.elo_restricao);
      if (label !== '—') porValor.set(c.elo_restricao, label);
    }
    return Array.from(porValor.entries())
      .map(([valor, label]) => ({ valor, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [lista]);

  const listaFiltrada = useMemo(() => {
    let base = lista;

    const buscaNormalizada = busca.trim().toLowerCase();
    if (buscaNormalizada) {
      base = base.filter((c) => c.nome.toLowerCase().includes(buscaNormalizada));
    }

    if (filtro === 'acao') {
      base = base.filter((c) => c.nivel_risco === 'critico');
    } else if (filtro === 'sem_plano') {
      base = base.filter((c) => c.aderencia_pct == null);
    } else if (filtro.startsWith('elo:')) {
      const valorElo = filtro.slice('elo:'.length);
      base = base.filter((c) => c.elo_restricao === valorElo);
    }

    return base;
  }, [lista, busca, filtro]);

  const limparFiltros = () => {
    setBusca('');
    setFiltro('todos');
  };

  const filtroAtivo = busca.trim() !== '' || filtro !== 'todos';

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

      {!isLoading && !isError && lista.length > 0 && (
        <FiltrosCarteira
          busca={busca}
          onBuscaChange={setBusca}
          filtro={filtro}
          onFiltroChange={setFiltro}
          elosPresentes={elosPresentes}
          mostrando={listaFiltrada.length}
          total={lista.length}
        />
      )}

      <Panel>
        <PanelHeader title="Fila de atendimento" hint="ordenada por quem precisa de ação primeiro" />
        <PanelBody flush className="p-4">
          {isLoading ? (
            <LoadingState rows={6} label="Carregando a carteira…" />
          ) : isError ? (
            <ErrorState
              description="Não foi possível carregar a carteira."
              action={
                <Action variant="outline" size="sm" onClick={() => refetch()}>
                  Tentar novamente
                </Action>
              }
            />
          ) : lista.length === 0 ? (
            <EmptyState title="Nada por aqui ainda" description="Assim que a carteira for carregada, ela aparece aqui." />
          ) : listaFiltrada.length === 0 ? (
            <EmptyState
              title="Nenhum cliente com este filtro"
              description="Ajuste a busca ou volte para “Todos” para ver a carteira inteira."
              action={
                filtroAtivo ? (
                  <Action variant="outline" size="sm" onClick={limparFiltros}>
                    Limpar filtro
                  </Action>
                ) : undefined
              }
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {listaFiltrada.map((cliente, index) => (
                <ClienteCard
                  key={cliente.organization_id}
                  cliente={cliente}
                  index={index}
                  tarefasAtrasadas={atrasadasPorCliente.get(cliente.organization_id) ?? 0}
                />
              ))}
            </div>
          )}
        </PanelBody>
      </Panel>
    </div>
  );
}
