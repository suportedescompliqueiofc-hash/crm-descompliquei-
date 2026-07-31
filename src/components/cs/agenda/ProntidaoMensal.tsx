// Checklist de prontidão para a reunião mensal de fechamento — segunda linha
// discreta em ReuniaoRow, só para tipo `mensal` ainda `agendada`
// (arquitetura-app-cs.md, seção D "Agenda": "a mesma checklist de prontidão
// descrita no bloco 7 da Ficha... aparece como uma segunda linha discreta em
// ReuniaoRow"). Evita que o João chegue à reunião sem saber que o plano do
// mês seguinte ou o material do elo ainda não estão prontos — o próprio
// manual proíbe uma reunião mensal despreparada (ritos/04-reuniao-mensal.md).
//
// Número do mês e aderência são sempre triviais (dado ao vivo, mesma fonte
// do bloco 3 da Ficha) — só os dois itens de fato condicionais (plano e
// material) são checados aqui, sem nenhuma RPC nova: reaproveita os mesmos
// hooks que a Ficha do Cliente já usa (usePlanoConteudo, useClienteContexto,
// useMateriaisCliente), compostos client-side.
import { addMonths, format, startOfMonth } from 'date-fns';
import { usePlanoConteudo, useClienteContexto, useMateriaisCliente } from '@/hooks/cs';
import { eloEhRestricao } from '@/components/cs/eloMeta';
import { cn } from '@/lib/utils';

interface ProntidaoMensalProps {
  organizationId: string;
  /** data_hora da própria reunião — o "próximo período" é o mês seguinte ao mês dela. */
  dataHora: string;
}

// `pronto` usa a mesma régua do resto do console: quando falta algo, é
// "exige ação" — laranja, não peso de fonte cru. Quando está pronto, fica no
// texto neutro do parágrafo (não precisa de destaque, só confirma).
function ItemProntidao({ label, pronto }: { label: string; pronto: boolean }) {
  return <span className={cn(!pronto && 'text-[hsl(var(--cs-accent))] font-medium')}>{label}</span>;
}

export function ProntidaoMensal({ organizationId, dataHora }: ProntidaoMensalProps) {
  const proximoPeriodo = format(startOfMonth(addMonths(new Date(dataHora), 1)), 'yyyy-MM-dd');

  const { data: passosProximoPeriodo = [], isLoading: planoLoading } = usePlanoConteudo(organizationId, proximoPeriodo);
  const { data: contexto, isLoading: contextoLoading } = useClienteContexto(organizationId);
  const { data: materiais = [], isLoading: materiaisLoading } = useMateriaisCliente(organizationId);

  // Enquanto carrega, não afirma nada — melhor silêncio do que "pendente" falso.
  if (planoLoading || contextoLoading || materiaisLoading) return null;

  const planoPronto = passosProximoPeriodo.length > 0;
  const eloRestricao = contexto?.elo_restricao ?? null;
  const materialPronto =
    !!eloRestricao && materiais.some((m) => m.status === 'entregue' && eloEhRestricao(m.elo, eloRestricao));

  return (
    <p className="text-[12px] text-muted-foreground/60 mt-1">
      Prontidão para o fechamento: número ok · aderência ok ·{' '}
      <ItemProntidao label={planoPronto ? 'plano do mês seguinte pronto' : 'plano do mês seguinte pendente'} pronto={planoPronto} />{' '}
      ·{' '}
      <ItemProntidao label={materialPronto ? 'material do elo entregue' : 'material do elo pendente'} pronto={materialPronto} />.
    </p>
  );
}
