import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteContexto, RegistrarPercepcaoInput, SalvarContextoInput } from './types';

// Contexto do cliente — identificação, promessa feita na venda, modelo de
// negócio, elo declarado e percepções recentes do CEO. Base da mesa de
// trabalho (skill cs-cliente). Via RPC `cs_*` — nunca leads/vendas/
// agendamentos/mensagens/organizations/perfis direto.
//
// ATENÇÃO: `cs_cliente_contexto`, `cs_salvar_contexto` e `cs_registrar_percepcao`
// ainda NÃO existem no banco (confirmado ao vivo em 2026-07-30, projeto
// noncbgdczgcboronmcah — ver nota de divergência em types.ts). Hook escrito
// contra o contrato do maestro; NÃO testado. CONFIRMAR campo a campo assim
// que a função existir.
export function useClienteContexto(orgId: string | null | undefined) {
  return useQuery({
    queryKey: ['cs-cliente-contexto', orgId],
    enabled: !!orgId,
    staleTime: 2 * 60 * 1000,
    queryFn: async (): Promise<ClienteContexto | null> => {
      const { data, error } = await (supabase as any).rpc('cs_cliente_contexto', {
        p_org_id: orgId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      return {
        organization_id: row.organization_id,
        nome: row.nome,
        cidade: row.cidade ?? null,
        cliente_desde: row.cliente_desde,
        promessa_venda: row.promessa_venda ?? null,
        modelo_negocio: row.modelo_negocio ?? null,
        quem_atende: row.quem_atende ?? null,
        quem_vende: row.quem_vende ?? null,
        equipe: row.equipe ?? null,
        elo_declarado: row.elo_declarado ?? null,
        elo_declarado_desde: row.elo_declarado_desde ?? null,
        restricoes_conhecidas: row.restricoes_conhecidas ?? null,
        percepcoes_recentes: ((row.percepcoes_recentes ?? []) as any[]).map((p) => ({
          data: p.data,
          percepcao: p.percepcao,
          divergente: !!p.divergente,
        })),
      };
    },
  });
}

export function useSalvarContexto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalvarContextoInput) => {
      const { error } = await (supabase as any).rpc('cs_salvar_contexto', {
        p_org_id: input.organizationId,
        p_cidade: input.cidade ?? null,
        p_promessa_venda: input.promessaVenda ?? null,
        p_modelo_negocio: input.modeloNegocio ?? null,
        p_quem_atende: input.quemAtende ?? null,
        p_quem_vende: input.quemVende ?? null,
        p_equipe: input.equipe ?? null,
        p_elo_declarado: input.eloDeclarado ?? null,
        p_restricoes_conhecidas: input.restricoesConhecidas ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['cs-cliente-contexto', input.organizationId] });
    },
  });
}

// Percepção do CEO — o outro lado do sistema (o dado da query é um lado, o
// que o João sente/observa é o outro; quando divergem, a divergência é o
// sinal mais valioso). Sempre uma entrada nova, nunca edita percepção antiga.
export function useRegistrarPercepcao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarPercepcaoInput) => {
      const { error } = await (supabase as any).rpc('cs_registrar_percepcao', {
        p_org_id: input.organizationId,
        p_percepcao: input.percepcao,
        p_divergente: input.divergente ?? false,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['cs-cliente-contexto', input.organizationId] });
    },
  });
}
