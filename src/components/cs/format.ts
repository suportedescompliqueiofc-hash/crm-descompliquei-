// Formatação de data segura para o app de CS — utilitário único, para não
// repetir a lógica em cada tela que precisa mostrar uma data curta.
//
// Consolidado em 2026-07-30: só `carteira/CarteiraRow.tsx` tinha esta função
// (antes vivia local em `carteira/utils.ts`). Verificação nas demais telas
// (ClienteDetalhe, SerieHistorica, PlanoCliente, Semana) mostrou que nenhuma
// caiu no bug de fuso — todas já usam `parseISO` do date-fns (que, ao
// contrário de `new Date('YYYY-MM-DD')`, interpreta string de data pura como
// horário local, não UTC — por isso não desloca um dia para trás em fusos
// negativos como BRT). Promovido para cá (compartilhado, fora de `carteira/`)
// para ser a peça óbvia a reusar caso uma tela nova precise do formato curto
// dd/mm/aaaa em vez de um formato por extenso (que continua sendo
// `format(parseISO(...), "d 'de' MMMM 'de' yyyy", { locale: ptBR })`, já
// estabelecido nas outras telas).
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function formatDataBR(value: string | null | undefined): string {
  if (!value) return '—';
  const soDataMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (soDataMatch) {
    const [, ano, mes, dia] = soDataMatch;
    return `${dia}/${mes}/${ano}`;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

/**
 * Mês curto ("jul/26") a partir de QUALQUER forma de mês que o banco devolva.
 *
 * Existe por causa de um travamento real (2026-07-31, ficha da Dra. Tayane):
 * `cs_cliente_serie` declara `mes` como **date**, então chega no frontend como
 * `'2026-07-01'` — mas o tipo em `hooks/cs/types.ts` dizia `YYYY-MM` e a tela
 * concatenava `-01`, produzindo `'2026-07-01-01'`. `parseISO` devolvia Invalid
 * Date e `format()` lançava `RangeError: Invalid time value`, derrubando a
 * ficha inteira em tela branca. Só aparecia em cliente com 2+ meses de série,
 * que é por que passou despercebido.
 *
 * Como os hooks chamam RPC com `as any`, o compilador não protege contra esse
 * tipo de divergência — então a proteção tem de ser em runtime: aceita
 * `YYYY-MM` e `YYYY-MM-DD`, e devolve '—' em vez de lançar quando não
 * reconhece. Data de interface nunca deve poder derrubar uma tela.
 */
export function formatMesCurto(value: string | null | undefined): string {
  if (!value) return '—';
  const m = /^(\d{4})-(\d{2})/.exec(value);
  if (!m) return '—';
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return '—';
  // Construção local (ano, mês, 1) em vez de parse de string: não passa por
  // UTC, então não desloca um mês para trás em fuso negativo (BRT).
  return format(new Date(ano, mes - 1, 1), 'MMM/yy', { locale: ptBR });
}
