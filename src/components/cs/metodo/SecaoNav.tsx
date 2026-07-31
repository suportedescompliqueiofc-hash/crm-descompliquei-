// Navegação entre as 5 seções da tela de Método. Texto puro, sem ícone, sem
// pill colorida — o ativo se distingue por peso de fonte e um filete inferior,
// não por cor (cor é exceção no app de CS). Ver src/components/cs/ui para os
// primitivos equivalentes desta linguagem visual nas demais telas do CS.
import { SECOES } from '@/content/cs';
import type { SecaoId } from '@/content/cs';
import { cn } from '@/lib/utils';

interface SecaoNavProps {
  ativa: SecaoId;
  onSelecionar: (secao: SecaoId) => void;
}

export function SecaoNav({ ativa, onSelecionar }: SecaoNavProps) {
  return (
    <nav className="flex flex-wrap gap-x-6 gap-y-2 border-b border-border/60">
      {SECOES.map((secao) => {
        const isAtiva = secao.id === ativa;
        return (
          <button
            key={secao.id}
            type="button"
            onClick={() => onSelecionar(secao.id)}
            aria-current={isAtiva ? 'true' : undefined}
            className={cn(
              'pb-2.5 -mb-px text-[13px] font-medium border-b-2 transition-colors',
              isAtiva
                ? 'text-foreground border-foreground font-semibold'
                : 'text-muted-foreground border-transparent hover:text-foreground',
            )}
          >
            {secao.nome}
          </button>
        );
      })}
    </nav>
  );
}
