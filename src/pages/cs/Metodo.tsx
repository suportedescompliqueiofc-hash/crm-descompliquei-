// Rota do Método de CS — leitura e consulta do manual embutido no app. Fonte
// de conteúdo: src/content/cs/ (ver README.md dessa pasta para a decisão de
// arquitetura). Tela deliberadamente sóbria: texto, hierarquia tipográfica,
// sem ícone decorativo, sem card dentro de card — segue os mesmos primitivos
// de src/components/cs/ui usados em Carteira.tsx.
//
// Integração ao trabalho (arquitetura-app-cs.md, seção D "Método"): o CEO
// apontou a tela como "muito fora" — a correção não é redesenhar, é parar de
// tratá-la como destino único de leitura e torná-la alcançável por link
// direto a partir do número/elo/passo que ela explica, em qualquer outra
// tela do app. Por isso esta tela lê `?secao=` e `?busca=` da própria URL —
// qualquer outro agente (Ficha do Cliente linkando um elo, Semana linkando a
// semana do rito, ou esta própria Plano linkando a anatomia do plano) só
// precisa navegar para `/metodo?secao=<id>` ou `/metodo?secao=<id>&busca=
// <termo>`, sem duplicar nenhum conteúdo do Método. Sincroniza nas duas
// direções: chegar por link posiciona a tela; navegar dentro da tela
// atualiza a URL (para voltar/recarregar preservar a posição).
//
// Guardrail de rota: esta tela ainda não está registrada em App-cs.tsx — a
// consolidação da rota /metodo fica para quem integra as fatias dos agentes.
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PageTitle } from '@/components/cs/ui';
import { SecaoNav } from '@/components/cs/metodo/SecaoNav';
import { BuscaMetodo } from '@/components/cs/metodo/BuscaMetodo';
import { FundamentosView } from '@/components/cs/metodo/FundamentosView';
import { RitosView } from '@/components/cs/metodo/RitosView';
import { ArtefatosView } from '@/components/cs/metodo/ArtefatosView';
import { RealidadeView } from '@/components/cs/metodo/RealidadeView';
import { TecnicoView } from '@/components/cs/metodo/TecnicoView';
import { search, SECOES } from '@/content/cs';
import type { SecaoId } from '@/content/cs';

function secaoValida(id: string | null): id is SecaoId {
  return !!id && SECOES.some((s) => s.id === id);
}

export default function Metodo() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [secao, setSecao] = useState<SecaoId>(() => {
    const p = searchParams.get('secao');
    return secaoValida(p) ? p : 'fundamentos';
  });
  const [query, setQuery] = useState(() => searchParams.get('busca') ?? '');

  // Chegar por link (ou navegar internamente na SPA para /metodo?secao=...
  // enquanto a tela já está montada) reposiciona a leitura — sem isso, um
  // link de outra tela só funcionaria no primeiro carregamento.
  useEffect(() => {
    const p = searchParams.get('secao');
    const b = searchParams.get('busca');
    if (secaoValida(p)) setSecao(p);
    setQuery(b ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const resultados = useMemo(() => search(query, { limit: 40 }), [query]);
  const buscando = query.trim().length >= 2;

  function irParaSecao(id: SecaoId) {
    setSecao(id);
    setQuery('');
    setSearchParams({ secao: id }, { replace: true });
  }

  function irParaBusca(q: string) {
    setQuery(q);
    if (q.trim()) {
      setSearchParams({ busca: q }, { replace: true });
    } else {
      setSearchParams({ secao }, { replace: true });
    }
  }

  return (
    <div className="max-w-[900px] mx-auto pb-16 space-y-6">
      <PageTitle
        title="Método"
        description="O manual de CS da Descompliquei — a cadeia de elos, os ritos, o catálogo de materiais e a régua de risco, para consultar sem sair do app."
      />

      <BuscaMetodo query={query} onQueryChange={irParaBusca} resultados={resultados} onIrPara={irParaSecao} />

      {!buscando && (
        <div className="space-y-6">
          <SecaoNav ativa={secao} onSelecionar={irParaSecao} />
          <div>
            {secao === 'fundamentos' && <FundamentosView />}
            {secao === 'ritos' && <RitosView />}
            {secao === 'artefatos' && <ArtefatosView />}
            {secao === 'realidade' && <RealidadeView />}
            {secao === 'tecnico' && <TecnicoView />}
          </div>
        </div>
      )}
    </div>
  );
}
