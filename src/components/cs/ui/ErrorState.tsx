// Estado de erro do console.
//
// Este é o ÚNICO lugar do sistema onde vermelho é permitido (junto com ação
// destrutiva). Em todo o resto, laranja significa "exige ação" e petróleo
// "o método está de pé" — não existe vermelho de risco de cliente. Aqui o
// vermelho não é status de negócio: é falha técnica, e precisa se distinguir
// à primeira vista de tudo que é operação normal.
//
// Complementa, não substitui, o `toast.error()` da chamada que falhou: o
// toast avisa no instante, este bloco explica o vazio que ficou na tela.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  description?: string;
  /** Botão de nova tentativa, quando a chamada é repetível. */
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Tente novamente em instantes.',
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-destructive/25 bg-destructive/[0.045] px-4 py-6 text-center',
        className,
      )}
    >
      <p className="text-[13px] font-semibold text-destructive">{title}</p>
      {description && <p className="text-[11.5px] text-muted-foreground/70 mt-1">{description}</p>}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
