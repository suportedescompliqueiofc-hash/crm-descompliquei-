import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteMarco } from './types';

// Marcos derivados do CRM para a linha do tempo do cliente (arquitetura-app-
// cs.md, seção C/F item 5) — primeira venda, primeiro agendamento, primeira
// mensagem e saltos/quedas relevantes de demanda mês a mês. Via RPC
// `cs_cliente_marcos` — só leitura de vendas/agendamentos/mensagens/leads,
// nenhuma escrita. Complementa (não substitui) `useTimelineCliente`, que já
// cobre `primeira_venda` e outros eventos — unir os dois feeds num só é
// decisão de quem consome (fora da fatia deste squad, que não toca páginas/
// componentes).
//
// Critério de "relevante" para salto/queda de demanda (definido na função,
// documentado no COMMENT do banco): só marca quando o mês anterior teve >= 5
// leads (piso de amostra, evita ruído de número pequeno) E a variação
// absoluta é >= 30% do mês anterior (magnitude que não é flutuação normal de
// mês a mês). Escolha de bom senso deste squad, não uma constante validada
// estatisticamente — recalibrar se o CEO observar falsos positivos/negativos.
//
// CONFIRMADO AO VIVO (projeto noncbgdczgcboronmcah, 2026-07-31) com as 7 orgs
// PCA reais: devolve zero ou mais linhas, nunca erro. Dr. Jhonatan Dutra
// devolveu `[]` (organização com pouquíssimo dado ainda); Dr. Derek Gonçalves
// devolveu só `primeira_mensagem` (também com pouco dado); as demais 5
// devolveram entre 3 e 5 marcos, incluindo saltos/quedas de demanda reais
// (ex.: Dra Monção, +470% em um mês — variação real da carteira, não erro de
// cálculo).
export function useClienteMarcos(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-cliente-marcos', orgId],
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<ClienteMarco[]> => {
      const { data, error } = await (supabase as any).rpc('cs_cliente_marcos', {
        p_org_id: orgId,
      });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r): ClienteMarco => ({
        tipo: r.tipo,
        titulo: r.titulo,
        descricao: r.descricao ?? null,
        data: r.data,
      }));
    },
  });
}
