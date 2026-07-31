// Abertura do dossiê — quem é o cliente e há quanto tempo. Primeira peça da
// leitura narrativa da Ficha (ClienteDetalhe.tsx). Substitui o PageHero
// escuro com badge de risco colorido: aqui é uma frase, sem cor nenhuma.
import { formatInt, formatPct } from '@/lib/format';
import { formatDataBR } from '../format';

interface ClienteResumoProps {
  nome: string | undefined;
  clienteDesde: string | null | undefined;
  diasDeCiclo: number | null | undefined;
  pctContrato: number | null | undefined;
  isLoading: boolean;
}

const DIAS_CICLO_PCA = 180;

export function ClienteResumo({ nome, clienteDesde, diasDeCiclo, pctContrato, isLoading }: ClienteResumoProps) {
  if (isLoading) {
    return <p className="text-sm text-muted-foreground/50 animate-pulse">Carregando…</p>;
  }

  const diasRestantes = diasDeCiclo != null ? Math.max(DIAS_CICLO_PCA - diasDeCiclo, 0) : null;

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-bold font-display tracking-tight text-foreground">{nome ?? '—'}</h1>
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[620px]">
        {clienteDesde ? (
          <>
            Cliente desde {formatDataBR(clienteDesde)} — {formatInt(diasDeCiclo ?? 0)} dias de ciclo,{' '}
            {formatPct(pctContrato, 0)} dos {formatInt(DIAS_CICLO_PCA)} dias do contrato consumidos
            {diasRestantes != null && `, ${formatInt(diasRestantes)} dias restantes`}.
          </>
        ) : (
          'Sem data de cadastro para calcular o ciclo.'
        )}
      </p>
    </div>
  );
}
