// Busca no conteúdo do método inteiro. Usa search() de @/content/cs — puro,
// sem hook, sem rede — chamado direto no render (memoizado pelo consumidor).
import { Input } from '@/components/ui/input';
import { ListRow, EmptyState } from '@/components/cs/ui';
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
      <Input
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Buscar no método — um elo, um material, uma regra…"
        className="h-10 text-sm rounded-lg border-border/60"
        autoFocus={false}
      />

      {buscando && (
        <div className="divide-y divide-border/50">
          {resultados.length === 0 ? (
            <EmptyState
              title="Nada encontrado"
              description="Tente outro termo — nomes de elo, material, sinal de risco ou trecho de regra costumam achar mais rápido."
            />
          ) : (
            resultados.map((r) => {
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
            })
          )}
        </div>
      )}
    </div>
  );
}
