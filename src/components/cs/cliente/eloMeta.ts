// Metadados de exibição dos 8 elos da cadeia (ver 05-operacoes-e-cs/sistema/01-a-cadeia.md).
// Puramente descritivo — rótulo em PT-BR, formato do valor e camada a que pertence.
// O valor numérico em si sempre vem do hook (useClienteElos/useClienteSerie); este
// arquivo só decide COMO exibir o número que a API já mandou.
import { formatBRL, formatInt, formatPct } from '@/lib/format';
import type { CamadaElo } from '@/hooks/cs';

export type FormatoElo = 'pct' | 'brl' | 'dias' | 'int';

export interface EloMeta {
  label: string;
  formato: FormatoElo;
}

export const ELO_META: Record<string, EloMeta> = {
  demanda: { label: 'Demanda', formato: 'int' },
  agendamento: { label: 'Agendamento', formato: 'pct' },
  resgate_lead_frio: { label: 'Resgate de Lead Frio', formato: 'pct' },
  comparecimento: { label: 'Comparecimento', formato: 'pct' },
  fechamento: { label: 'Fechamento', formato: 'pct' },
  ticket: { label: 'Ticket', formato: 'brl' },
  ciclo_venda: { label: 'Ciclo de Venda', formato: 'dias' },
  recompra: { label: 'Recompra', formato: 'pct' },
};

export function getEloMeta(elo: string): EloMeta {
  return ELO_META[elo] ?? { label: elo, formato: 'int' };
}

export function formatEloValor(elo: string, valor: number | null | undefined): string {
  if (valor == null) return '—';
  const meta = getEloMeta(elo);
  switch (meta.formato) {
    case 'pct':
      return formatPct(valor);
    case 'brl':
      return formatBRL(valor);
    case 'dias':
      return `${formatInt(valor)} ${valor === 1 ? 'dia' : 'dias'}`;
    case 'int':
    default:
      return formatInt(valor);
  }
}

export const CAMADA_META: Record<number, { label: string; descricao: string }> = {
  0: { label: 'Adoção', descricao: 'Configuração/hábito de uso da plataforma — não é elo' },
  1: { label: 'Aquisição', descricao: 'Geração de demanda — marketing, tráfego, indicação' },
  2: { label: 'Comercial', descricao: 'Follow-up, persuasão, processo, conversa — foco do produto' },
  3: { label: 'Retenção', descricao: 'Relacionamento pós-venda' },
};

/** Cor semântica por camada — usada na série histórica e em acentos de linha/ponto. */
export const CAMADA_COR: Record<number, string> = {
  1: '#3b82f6', // azul — aquisição
  2: '#8b5cf6', // violeta — comercial
  3: '#059669', // esmeralda — retenção
};

/**
 * Compara o texto livre de `elo_restricao` (vindo do banco, pode ser composto —
 * ex.: "Fechamento/Agendamento") com o slug de um elo, de forma tolerante a
 * acento/caixa/espaço.
 */
export function eloEhRestricao(elo: string, eloRestricao: string | null | undefined): boolean {
  if (!eloRestricao) return false;
  const normalizar = (s: string) =>
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  const alvo = normalizar(eloRestricao);
  const labelNormalizado = normalizar(getEloMeta(elo).label);
  const slugNormalizado = normalizar(elo);
  return alvo.includes(slugNormalizado) || alvo.includes(labelNormalizado);
}

export const ORDEM_CAMADA: CamadaElo[] = [1, 2, 3];
