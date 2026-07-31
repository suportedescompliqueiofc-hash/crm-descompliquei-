import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ClienteContexto, RegistrarPercepcaoInput, SalvarContextoInput } from './types';

// Contexto do cliente — identificação, promessa feita na venda, modelo de
// negócio, elo declarado e percepções recentes do CEO. Base da mesa de
// trabalho (skill cs-cliente). Via RPC `cs_*` — nunca leads/vendas/
// agendamentos/mensagens/organizations/perfis direto.
//
// REVALIDADO AO VIVO em 2026-07-30 (projeto noncbgdczgcboronmcah) — nomes de
// campo e de parâmetro conferidos com `pg_get_functiondef` + chamada real
// (SELECT para leitura; INSERT em transação com ROLLBACK para escrita,
// confirmado sem sobra por SELECT depois). Ver comentários em `types.ts`
// para o detalhe campo a campo.
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
        convenio_particular: row.convenio_particular ?? null,
        quem_atende: row.quem_atende ?? null,
        quem_vende: row.quem_vende ?? null,
        tem_equipe: row.tem_equipe ?? null,
        elo_restricao: row.elo_restricao ?? null,
        elo_restricao_status: row.elo_restricao_status ?? null,
        elo_restricao_desde: row.elo_restricao_desde ?? null,
        restricoes_conhecidas: row.restricoes_conhecidas ?? null,
        atualizado_em: row.atualizado_em,
        percepcoes_recentes: ((row.percepcoes_recentes ?? []) as any[]).map((p) => ({
          id: p.id,
          texto: p.texto,
          data_percepcao: p.data_percepcao ?? null,
          data_aproximada: !!p.data_aproximada,
          diverge_do_dado: !!p.diverge_do_dado,
          divergencia_nota: p.divergencia_nota ?? null,
          registrada_em: p.registrada_em,
        })),
      };
    },
  });
}

// `cs_salvar_contexto` é UPSERT por organization_id (COALESCE contra o valor
// já salvo) — ver aviso em `SalvarContextoInput` sobre não conseguir limpar
// um campo para null por aqui.
export function useSalvarContexto() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SalvarContextoInput) => {
      const { error } = await (supabase as any).rpc('cs_salvar_contexto', {
        p_org_id: input.organizationId,
        p_cidade: input.cidade ?? null,
        p_cliente_desde: input.clienteDesde ?? null,
        p_promessa_venda: input.promessaVenda ?? null,
        p_convenio_particular: input.convenioParticular ?? null,
        p_quem_atende: input.quemAtende ?? null,
        p_quem_vende: input.quemVende ?? null,
        p_tem_equipe: input.temEquipe ?? null,
        p_elo_restricao: input.eloRestricao ?? null,
        p_elo_restricao_status: input.eloRestricaoStatus ?? null,
        p_elo_restricao_desde: input.eloRestricaoDesde ?? null,
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
// sinal mais valioso). Sempre uma entrada nova — `cs_percepcao` tem trigger
// que bloqueia UPDATE/DELETE, então não há (nem pode haver) hook de editar
// percepção antiga aqui.
export function useRegistrarPercepcao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: RegistrarPercepcaoInput) => {
      const { error } = await (supabase as any).rpc('cs_registrar_percepcao', {
        p_org_id: input.organizationId,
        p_texto: input.texto,
        p_data_percepcao: input.dataPercepcao ?? null,
        p_data_aproximada: input.dataAproximada ?? false,
        p_diverge_do_dado: input.divergeDoDado ?? false,
        p_divergencia_nota: input.divergenciaNota ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_data, input) => {
      qc.invalidateQueries({ queryKey: ['cs-cliente-contexto', input.organizationId] });
    },
  });
}
