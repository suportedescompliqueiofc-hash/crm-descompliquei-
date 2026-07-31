// Navegação entre os meses do ciclo do cliente. Redesign 2026-07-30:
// versão clara, sem o fundo translúcido branco pensado pra dentro do
// PageHero escuro (que saiu do app de CS inteiro).
import { format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function addMonthsLocal(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

interface SeletorMesProps {
  mes: Date;
  /** Primeiro mês navegável (mês de `cliente_desde`). null enquanto carrega. */
  minMes: Date | null;
  /** Último mês navegável (mês corrente). */
  maxMes: Date;
  onChange: (novoMes: Date) => void;
}

export function SeletorMes({ mes, minMes, maxMes, onChange }: SeletorMesProps) {
  const podeVoltar = !minMes || addMonthsLocal(mes, -1) >= minMes;
  const podeAvancar = addMonthsLocal(mes, 1) <= maxMes;
  const label = format(mes, "MMMM 'de' yyyy", { locale: ptBR });
  const atual = isSameMonth(mes, maxMes);

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => podeVoltar && onChange(addMonthsLocal(mes, -1))}
        disabled={!podeVoltar}
        aria-label="Mês anterior"
        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
      >
        ← anterior
      </button>
      <p className="text-sm font-medium text-foreground capitalize font-display min-w-[140px] text-center">
        {label}
        <span className="block text-[11px] text-muted-foreground/60 font-normal">{atual ? 'em curso' : 'histórico'}</span>
      </p>
      <button
        type="button"
        onClick={() => podeAvancar && onChange(addMonthsLocal(mes, 1))}
        disabled={!podeAvancar}
        aria-label="Próximo mês"
        className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:hover:text-muted-foreground"
      >
        próximo →
      </button>
    </div>
  );
}
