import { AlertTriangle, AlertCircle, CheckCircle2, Star, HelpCircle, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiscoConfig {
  label: string;
  classes: string;
  icon: LucideIcon;
}

// Padrão "trio" do design system: fundo pastel + texto escuro + borda.
// Cores por significado (definidas na tarefa): crítico = vermelho,
// atenção = âmbar, saudável = esmeralda, referência = azul.
const RISCO_CONFIG: Record<string, RiscoConfig> = {
  critico: { label: 'Crítico', classes: 'bg-red-50 text-red-700 border-red-200/60', icon: AlertTriangle },
  atencao: { label: 'Atenção', classes: 'bg-amber-50 text-amber-700 border-amber-200/60', icon: AlertCircle },
  saudavel: { label: 'Saudável', classes: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', icon: CheckCircle2 },
  referencia: { label: 'Referência', classes: 'bg-blue-50 text-blue-700 border-blue-200/60', icon: Star },
};

const FALLBACK: RiscoConfig = {
  label: '—',
  classes: 'bg-muted/50 text-muted-foreground border-border/40',
  icon: HelpCircle,
};

export function RiscoBadge({ nivel }: { nivel: string | null }) {
  const config = (nivel && RISCO_CONFIG[nivel]) || FALLBACK;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded border',
        config.classes,
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {config.label}
    </span>
  );
}
