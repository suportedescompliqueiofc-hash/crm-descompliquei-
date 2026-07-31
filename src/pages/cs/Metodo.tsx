// Rota do Método de CS — leitura e consulta do manual embutido no app. Fonte
// de conteúdo: src/content/cs/ (ver README.md dessa pasta para a decisão de
// arquitetura). Tela deliberadamente sóbria: texto, hierarquia tipográfica,
// sem ícone decorativo, sem card dentro de card — segue os mesmos primitivos
// de src/components/cs/ui usados em Carteira.tsx. design-cs.md ainda não
// existia no momento desta entrega; quando existir, revisar esta tela contra
// ele numa rodada de acabamento.
//
// Guardrail de rota: esta tela ainda não está registrada em App-cs.tsx — a
// consolidação da rota /metodo fica para quem integra as fatias dos agentes.
import { useMemo, useState } from 'react';
import { PageTitle } from '@/components/cs/ui';
import { SecaoNav } from '@/components/cs/metodo/SecaoNav';
import { BuscaMetodo } from '@/components/cs/metodo/BuscaMetodo';
import { FundamentosView } from '@/components/cs/metodo/FundamentosView';
import { RitosView } from '@/components/cs/metodo/RitosView';
import { ArtefatosView } from '@/components/cs/metodo/ArtefatosView';
import { RealidadeView } from '@/components/cs/metodo/RealidadeView';
import { TecnicoView } from '@/components/cs/metodo/TecnicoView';
import { search } from '@/content/cs';
import type { SecaoId } from '@/content/cs';

export default function Metodo() {
  const [secao, setSecao] = useState<SecaoId>('fundamentos');
  const [query, setQuery] = useState('');

  const resultados = useMemo(() => search(query, { limit: 40 }), [query]);
  const buscando = query.trim().length >= 2;

  function irParaSecao(id: SecaoId) {
    setSecao(id);
    setQuery('');
  }

  return (
    <div className="max-w-[900px] mx-auto pb-16 space-y-6">
      <PageTitle
        title="Método"
        description="O manual de CS da Descompliquei — a cadeia de elos, os ritos, o catálogo de materiais e a régua de risco, para consultar sem sair do app."
      />

      <BuscaMetodo query={query} onQueryChange={setQuery} resultados={resultados} onIrPara={irParaSecao} />

      {!buscando && (
        <div className="space-y-6">
          <SecaoNav ativa={secao} onSelecionar={setSecao} />
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
