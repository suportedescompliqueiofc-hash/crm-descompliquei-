// Navegação entre os meses do ciclo do cliente, para dentro do PageHero (fundo
// escuro — por isso os tons translúcidos brancos, no padrão do design system).
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="shrink-0 flex items-center gap-2 bg-white/[0.04] backdrop-blur-sm rounded-2xl px-3 py-3 border border-white/[0.06]">
      <button
        type="button"
        onClick={() => podeVoltar && onChange(addMonthsLocal(mes, -1))}
        disabled={!podeVoltar}
        aria-label="Mês anterior"
        className="h-8 w-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <div className="min-w-[132px] text-center">
        <p className="text-[13px] font-semibold text-white capitalize font-display leading-tight">{label}</p>
        <p className="text-[10px] text-white/40 uppercase tracking-wide mt-0.5">
          {atual ? 'Em curso' : 'Histórico'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => podeAvancar && onChange(addMonthsLocal(mes, 1))}
        disabled={!podeAvancar}
        aria-label="Próximo mês"
        className="h-8 w-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}
