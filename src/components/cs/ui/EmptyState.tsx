// Estado vazio do app de CS — só texto, sem ícone em caixa (a plataforma do
// cliente usa `p-3 rounded-xl bg-muted/40` + ícone Lucide; aqui isso é
// exatamente o tipo de símbolo que o CEO pediu para tirar). Duas linhas de
// texto bastam: o que está vazio, e por quê/o que fazer a respeito.
interface EmptyStateProps {
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div className={className ?? 'py-16 text-center'}>
      <p className="text-sm font-medium text-muted-foreground">{title}</p>
      {description && <p className="text-xs text-muted-foreground/50 mt-1">{description}</p>}
    </div>
  );
}
