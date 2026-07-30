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
