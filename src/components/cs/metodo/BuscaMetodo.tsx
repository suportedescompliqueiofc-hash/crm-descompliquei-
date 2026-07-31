// Busca no conteúdo do método inteiro. Usa search() de @/content/cs — puro,
// sem hook, sem rede — chamado direto no render (memoizado pelo consumidor).
//
// Redesign 2026-07-31: o campo ganhou superfície própria (um <Panel> em vez
// de um <Input> solto sobre o canvas) — é o que o CEO chamou de "fora do
// sistema": um campo sem moldura ao lado de painéis com moldura lê como
// elemento importado de outra tela. Os resultados agora são <PanelRows> de
// <ListRow>, a mesma peça de lista usada no resto do console — nunca mais
// `divide-y` cru fora de painel.
import { Input } from '@/components/ui/input';
import { Panel, PanelBody, PanelRows, ListRow, EmptyState } from '@/components/cs/ui';
import type { SearchResult, SecaoId } from '@/content/cs';
import { SECOES } from '@/content/cs';

interface BuscaMetodoProps {
  query: string;
  onQueryChange: (query: string) => void;
  resultados: SearchResult[];
  onIrPara: (secao: SecaoId) => void;
}

export function BuscaMetodo({ query, onQueryChange, resultados, onIrPara }: BuscaMetodoProps) {
  const buscando = query.trim().length >= 2;

  return (
    <div className="space-y-4">
      <Panel>
        <PanelBody className="py-2.5">
          <Input
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Buscar no método — um elo, um material, uma regra…"
            className="h-8 text-sm border-0 shadow-none px-0 bg-transparent focus-visible:ring-0"
            autoFocus={false}
          />
        </PanelBody>
      </Panel>

      {buscando && (
        <Panel>
          <PanelBody flush>
            {resultados.length === 0 ? (
              <EmptyState
                title="Nada encontrado"
                description="Tente outro termo — nomes de elo, material, sinal de risco ou trecho de regra costumam achar mais rápido."
              />
            ) : (
              <PanelRows>
                {resultados.map((r) => {
                  const secaoNome = SECOES.find((s) => s.id === r.secao)?.nome ?? r.secao;
                  return (
                    <ListRow key={r.id} onClick={() => onIrPara(r.secao)}>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground/60">
                          <span className="uppercase tracking-wide font-semibold">{secaoNome}</span>
                          <span>·</span>
                          <span>{r.documento}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground">{r.titulo}</p>
                        <p className="text-[13px] text-muted-foreground line-clamp-2">{r.trecho}</p>
                      </div>
                    </ListRow>
                  );
                })}
              </PanelRows>
            )}
          </PanelBody>
        </Panel>
      )}
    </div>
  );
}
