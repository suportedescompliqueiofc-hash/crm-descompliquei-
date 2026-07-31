// Metadados dos 8 elos da cadeia (ver 05-operacoes-e-cs/sistema/01-a-cadeia.md).
// Fonte ÚNICA para todo o app de CS — rótulo de exibição, formato do valor,
// camada e cor por camada. O valor numérico em si sempre vem do hook
// (useClienteElos/useClienteSerie/useCarteira); este arquivo só decide COMO
// exibir o que a API já mandou.
//
// Consolidado em 2026-07-30 a partir de DOIS mapeamentos duplicados criados
// por agentes diferentes (`carteira/elos.ts` e `cliente/eloMeta.ts`) — e, de
// quebra, corrige um bug real descoberto na consolidação: os dois arquivos
// duplicados assumiam que o campo `elo` vindo do banco era um slug em
// snake_case ("demanda", "ticket", "resgate_lead_frio"...). NÃO é. A função
// `cs_cliente_elos` (supabase/migrations/20260730120001_cs_funcoes_novo_modelo.sql,
// linhas 131-145) devolve o nome do elo em Title Case PT-BR — exatamente os
// mesmos textos usados em `01-a-cadeia.md`: "Demanda", "Agendamento",
// "Resgate de Lead Frio", "Comparecimento", "Fechamento", "Ticket", "Ciclo de
// Venda", "Recompra". `cs_carteira.elo_restricao` usa o mesmo vocabulário
// (mais os valores especiais "Adoção (Camada 0)" e "Sem dado suficiente para
// simular"). Só `plano/CadeiaDoMes.tsx` (Executor da tela Plano) tinha
// acertado isso por conta própria — seu `FORMATO` local usava as mesmas
// chaves Title Case; foi migrado para reusar este arquivo.
//
// Efeito do bug antes desta consolidação: em `CadeiaElos.tsx` (Ficha do
// Cliente), a comparação `elo.camada === camada` nunca batia (a RPC também
// devolve `camada` como TEXT '1'/'2'/'3', comparado por igualdade estrita
// contra os números 1/2/3 de `ORDEM_CAMADA`) — a seção "A Cadeia — 8 elos"
// renderizava vazia, sem nenhum elo, sem mensagem de erro. E mesmo corrigido
// isso, `getEloMeta('Ticket')` batia em `ELO_META['ticket']` (chave errada),
// caía no fallback `formato: 'int'` — Ticket exibia número cru em vez de
// R$, percentuais exibiam sem o símbolo %. Ver `useClienteCS.ts` para a
// correção complementar (coerção de `camada` para number).
import { formatBRL, formatInt, formatNum, formatPct } from '@/lib/format';
import type { CamadaElo } from '@/hooks/cs';
import type { EloId } from '@/content/cs';

export type FormatoElo = 'pct' | 'brl' | 'dias' | 'int';

export interface EloMeta {
  label: string;
  formato: FormatoElo;
}

/** Chaves = exatamente o texto que `cs_cliente_elos`/`cs_cliente_serie` devolvem no campo `elo`. */
export const ELO_META: Record<string, EloMeta> = {
  Demanda: { label: 'Demanda', formato: 'int' },
  Agendamento: { label: 'Agendamento', formato: 'pct' },
  'Resgate de Lead Frio': { label: 'Resgate de Lead Frio', formato: 'pct' },
  Comparecimento: { label: 'Comparecimento', formato: 'pct' },
  Fechamento: { label: 'Fechamento', formato: 'pct' },
  Ticket: { label: 'Ticket', formato: 'brl' },
  'Ciclo de Venda': { label: 'Ciclo de Venda', formato: 'dias' },
  Recompra: { label: 'Recompra', formato: 'pct' },
};

/**
 * O texto Title Case PT-BR que as RPCs de CS devolvem (chave de ELO_META)
 * traduzido para o `EloId` snake_case que `src/content/cs` usa como chave —
 * os dois vocabulários nasceram em tarefas diferentes (dado ao vivo vs.
 * conteúdo do método) e precisam de uma ponte explícita para não silenciosamente
 * não baterem (mesma classe de bug já documentada acima neste arquivo).
 */
export const ELO_ID_POR_LABEL: Record<string, EloId> = {
  Demanda: 'demanda',
  Agendamento: 'agendamento',
  'Resgate de Lead Frio': 'resgate_lead_frio',
  Comparecimento: 'comparecimento',
  Fechamento: 'fechamento',
  Ticket: 'ticket',
  'Ciclo de Venda': 'ciclo_venda',
  Recompra: 'recompra',
};

export function getEloIdPorLabel(elo: string | null | undefined): EloId | undefined {
  return elo ? ELO_ID_POR_LABEL[elo] : undefined;
}

/**
 * Camada (1|2|3) de cada elo — usado onde só temos o texto do elo, sem a
 * linha completa de `ClienteElo` (ex.: `cs_carteira.elo_restricao`, que vem
 * desacompanhado de camada).
 */
export const ELO_CAMADA: Record<string, CamadaElo> = {
  Demanda: 1,
  Agendamento: 2,
  'Resgate de Lead Frio': 2,
  Comparecimento: 2,
  Fechamento: 2,
  Ticket: 2,
  'Ciclo de Venda': 2,
  Recompra: 3,
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
      // Ciclo de Venda é uma mediana (percentile_cont) — pode ser fracionário.
      return `${formatNum(valor, 1)} dias`;
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

export const ORDEM_CAMADA: CamadaElo[] = [1, 2, 3];

/**
 * Compara o texto livre de `elo_restricao` (vindo do banco, pode ser composto —
 * ex.: "Fechamento/Agendamento") com o nome de um elo, de forma tolerante a
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
  return alvo.includes(labelNormalizado);
}

/**
 * Traduz o `elo_restricao` cru da carteira (`cs_carteira`) em rótulo + rótulo
 * de camada legíveis — usado na Carteira, onde só temos o texto do elo, sem
 * a linha completa de `ClienteElo` (que já traria a camada numérica pronta).
 * Valores especiais (ex.: "Adoção (Camada 0)", "Sem dado suficiente para
 * simular") não têm camada 1-3 — caem no fallback "—".
 */
export function getEloInfo(elo: string | null): { label: string; camadaLabel: string } {
  if (!elo) return { label: '—', camadaLabel: '—' };
  const label = getEloMeta(elo).label;
  const camada = ELO_CAMADA[elo];
  const camadaLabel = camada ? `Camada ${camada} · ${CAMADA_META[camada].label}` : '—';
  return { label, camadaLabel };
}
