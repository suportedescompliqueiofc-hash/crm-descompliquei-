// Índice da tela de Método — redesign 2026-07-31 (veredito do CEO: "ficou
// bem legal a parte de método, só que tá muito fora"). O problema não era o
// conteúdo, era a nav horizontal solta em cima de texto corrido, sem nenhuma
// superfície — nada ali dizia "isto é parte do console". A correção: virar
// coluna de ÍNDICE fixa (sticky) à esquerda, na MESMA gramática visual da
// barra de topo (CsTopNav) — lá o fio laranja de 2px marca a rota ativa numa
// barra horizontal; aqui é o mesmo fio, girado para a borda esquerda de uma
// lista vertical. É essa reutilização de vocabulário (não a cor em si) que
// costura a tela ao resto do sistema.
//
// Continua texto puro — sem ícone, sem pill colorida.
import { SECOES } from '@/content/cs';
import type { SecaoId } from '@/content/cs';
import { cn } from '@/lib/utils';

interface SecaoNavProps {
  ativa: SecaoId;
  onSelecionar: (secao: SecaoId) => void;
}

export function SecaoNav({ ativa, onSelecionar }: SecaoNavProps) {
  return (
    <nav className="sticky top-[68px] space-y-0.5" aria-label="Índice do método">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground/55 px-3 mb-2">Índice</p>
      {SECOES.map((secao) => {
        const isAtiva = secao.id === ativa;
        return (
          <button
            key={secao.id}
            type="button"
            onClick={() => onSelecionar(secao.id)}
            aria-current={isAtiva ? 'true' : undefined}
            className={cn(
              'relative block w-full text-left px-3 py-[7px] text-[13px] rounded-md transition-colors',
              // Fio de 2px na borda esquerda — a mesma peça que, na barra de
              // topo, encosta embaixo da aba ativa.
              'before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:rounded-full before:content-[""] before:transition-colors',
              isAtiva
                ? 'text-foreground font-semibold bg-muted/50 before:bg-[hsl(var(--cs-accent))]'
                : 'text-muted-foreground font-medium before:bg-transparent hover:text-foreground hover:bg-muted/25',
            )}
          >
            {secao.nome}
          </button>
        );
      })}
    </nav>
  );
}
