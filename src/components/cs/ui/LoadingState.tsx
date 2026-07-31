// Estado de carregamento do app de CS — texto com pulso sutil, sem ícone de
// spinner. Mantém a regra "zero símbolo decorativo" (princípio 2) mesmo no
// estado técnico mais comum da tela.
interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Carregando…', className }: LoadingStateProps) {
  return (
    <div className={className ?? 'py-16 text-center'}>
      <p className="text-xs text-muted-foreground/50 animate-pulse">{label}</p>
    </div>
  );
}
