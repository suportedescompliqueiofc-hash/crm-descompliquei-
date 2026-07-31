// Estado de erro do app de CS — mesma moldura textual do EmptyState/
// LoadingState, só troca a cor para sinalizar problema (cor é exceção e
// aqui é exatamente a exceção que a justifica). Complementa, não substitui,
// o `toast.error()` da chamada que falhou — o toast avisa no instante, este
// componente explica o vazio que ficou na tela depois.
interface ErrorStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ErrorState({
  title = 'Não foi possível carregar',
  description = 'Tente novamente em instantes.',
  className,
}: ErrorStateProps) {
  return (
    <div className={className ?? 'py-16 text-center'}>
      <p className="text-sm font-medium text-red-600">{title}</p>
      {description && <p className="text-xs text-muted-foreground/50 mt-1">{description}</p>}
    </div>
  );
}
