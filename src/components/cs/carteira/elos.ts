// Mapeamento estático dos 8 elos (4 camadas) para exibição na Carteira.
// Fonte do modelo: 05-operacoes-e-cs/sistema/01-a-cadeia.md.
// `elo_restricao` chega do banco como string livre (ver hooks/cs/types.ts —
// `NomeElo`); este arquivo só traduz para rótulo + camada de exibição.

export const ELO_LABELS: Record<string, string> = {
  demanda: 'Demanda',
  agendamento: 'Agendamento',
  resgate_lead_frio: 'Resgate de Lead Frio',
  comparecimento: 'Comparecimento',
  fechamento: 'Fechamento',
  ticket: 'Ticket',
  ciclo_venda: 'Ciclo de Venda',
  recompra: 'Recompra',
};

export const ELO_CAMADA: Record<string, 1 | 2 | 3> = {
  demanda: 1,
  agendamento: 2,
  resgate_lead_frio: 2,
  comparecimento: 2,
  fechamento: 2,
  ticket: 2,
  ciclo_venda: 2,
  recompra: 3,
};

export const CAMADA_LABELS: Record<1 | 2 | 3, string> = {
  1: 'Camada 1 · Aquisição',
  2: 'Camada 2 · Comercial',
  3: 'Camada 3 · Retenção',
};

/** Traduz o `elo_restricao` cru do banco em rótulo + camada legíveis. */
export function getEloInfo(elo: string | null): { label: string; camadaLabel: string } {
  if (!elo) return { label: '—', camadaLabel: '—' };
  const label = ELO_LABELS[elo] ?? elo;
  const camada = ELO_CAMADA[elo];
  const camadaLabel = camada ? CAMADA_LABELS[camada] : '—';
  return { label, camadaLabel };
}
