-- Contexto, percepção e continuidade de cada cliente PCA — hoje vivem só em
-- markdown (05-operacoes-e-cs/clientes/<cliente>/contexto.md e continuidade.md),
-- fora do alcance do app de CS. Esta migration cria os 3 objetos que os
-- substituem no banco, e faz a ÚNICA alteração autorizada em tabela de
-- terceiros (2 colunas aditivas em `jornadas`).
--
-- Princípios que o desenho abaixo implementa (05-operacoes-e-cs/sistema/00-como-funciona.md):
--   P1 — nenhum número mora aqui (cs_contexto não tem NENHUMA coluna numérica de desempenho).
--   P2 — percepção nunca se mistura com fato: cs_percepcao é tabela própria, com
--        marcador explícito de quando diverge do dado.
--   P3 — continuidade só cresce: cs_continuidade é apêndice-only (trigger bloqueia
--        UPDATE/DELETE — correção vira entrada nova, nunca edição).
--
-- RLS: todas as 3 tabelas — só usuário interno (is_super_admin() OR is_admin()),
-- mesmo padrão de cs_tarefas/cs_aderencia_snapshot/cs_reunioes (20260730120000).

-- ═══════════════════════════════════════════════════════════════════
-- cs_contexto — uma linha por organização (o que o CRM não sabe sobre o cliente)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.cs_contexto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,

  cidade text,
  cliente_desde date,

  -- Campo mais importante e hoje vazio em todos os 7 clientes (ver seed).
  promessa_venda text,

  -- Modelo de negócio da clínica.
  convenio_particular text,
  quem_atende text,
  quem_vende text,
  tem_equipe text,

  -- Elo-restrição DECLARADO (contexto/hipótese) — não é o cálculo de
  -- cs_cliente_ganho_simulado(). 'hipotese' = repassado em conversa, ainda sem
  -- fechamento (/cs-mes) que o confirme; 'confirmado' = veio de um fechamento.
  elo_restricao text,
  elo_restricao_status text CHECK (elo_restricao_status IS NULL OR elo_restricao_status IN ('hipotese', 'confirmado')),
  elo_restricao_desde text,

  restricoes_conhecidas text,

  atualizado_em timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cs_contexto IS
  'Uma linha por organização PCA — o que o contexto.md de cada cliente guardava '
  'em markdown. NENHUMA coluna numérica de desempenho (P1) — número vem do CRM '
  'na hora, sempre. Campos textuais NULL = "ainda não preenchido" (lacuna '
  'conhecida, ver 05-operacoes-e-cs/clientes/*/contexto.md), nunca string vazia. '
  'elo_restricao aqui é o valor DECLARADO/hipótese do contexto — distinto do '
  'cálculo ao vivo de cs_cliente_ganho_simulado()/cs_carteira().';

CREATE INDEX idx_cs_contexto_organization_id ON public.cs_contexto(organization_id);

CREATE OR REPLACE FUNCTION public.cs_contexto_set_atualizado_em()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER trg_cs_contexto_atualizado_em
  BEFORE UPDATE ON public.cs_contexto
  FOR EACH ROW
  EXECUTE FUNCTION public.cs_contexto_set_atualizado_em();

ALTER TABLE public.cs_contexto ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_contexto_internal_only ON public.cs_contexto
  FOR ALL
  USING (public.is_super_admin() OR public.is_admin())
  WITH CHECK (public.is_super_admin() OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- cs_percepcao — a leitura do CEO sobre o cliente, separada do fato (P2).
-- Só cresce (mesmo desenho apêndice-only de cs_continuidade, abaixo).
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.cs_percepcao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  -- Data em que a percepção foi formada (NÃO a data do registro no banco).
  -- NULL + data_aproximada=true = percepção migrada do modelo antigo, sem data
  -- exata recuperável (caso real dos 7 clientes na migração desta squad).
  data_percepcao date,
  data_aproximada boolean NOT NULL DEFAULT false,

  texto text NOT NULL,

  -- O sinal mais valioso do sistema (P2): quando esta percepção diverge do que
  -- o número do CRM mostra. Marcador explícito, nunca resolvido "na força".
  diverge_do_dado boolean NOT NULL DEFAULT false,
  divergencia_nota text,

  registrada_em timestamptz NOT NULL DEFAULT now(),
  registrada_por uuid
);

COMMENT ON TABLE public.cs_percepcao IS
  'Percepção do CEO sobre o cliente (P2) — fonte legítima, nunca misturada com '
  'fato do CRM. Apêndice-only: sem UPDATE/DELETE (trigger cs_bloquear_alteracao) '
  '— só cresce, igual continuidade.md. diverge_do_dado marca o sinal mais '
  'valioso do sistema: quando a percepção diverge do número.';

CREATE INDEX idx_cs_percepcao_organization_id ON public.cs_percepcao(organization_id);
CREATE INDEX idx_cs_percepcao_data ON public.cs_percepcao(organization_id, data_percepcao DESC, registrada_em DESC);

ALTER TABLE public.cs_percepcao ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_percepcao_internal_only ON public.cs_percepcao
  FOR ALL
  USING (public.is_super_admin() OR public.is_admin())
  WITH CHECK (public.is_super_admin() OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- cs_continuidade — o histórico que só cresce (P3). Equivalente em banco do
-- continuidade.md de cada cliente — "o arquivo mais importante do sistema".
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.cs_continuidade (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,

  data_evento date NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('conversa', 'decisao', 'entrega', 'observacao', 'divergencia', 'fechamento')),

  o_que_aconteceu text NOT NULL,
  ficou_combinado text,
  combinado_com text,

  origem text NOT NULL DEFAULT 'registro_manual' CHECK (origem IN ('registro_manual', 'reuniao', 'fechamento_mensal')),
  -- Liga a entrada à reunião de cs_reunioes quando ela nasceu de uma (ex.: uma
  -- reunião mensal gera o registro de fechamento). NULL = não nasceu de reunião.
  reuniao_id uuid REFERENCES public.cs_reunioes(id) ON DELETE SET NULL,

  criada_em timestamptz NOT NULL DEFAULT now(),
  criada_por uuid
);

COMMENT ON TABLE public.cs_continuidade IS
  'Histórico cumulativo por cliente (P3) — nunca sobrescrito nem resumido, só '
  'recebe entradas novas. Apêndice-only: trigger cs_bloquear_alteracao impede '
  'UPDATE/DELETE a nível de banco (não só de convenção) — correção de uma '
  'entrada anterior deve virar uma entrada NOVA (tipo=divergencia ou o que '
  'couber), nunca uma edição da antiga. reuniao_id liga a entrada a '
  'cs_reunioes quando ela nasceu de uma reunião registrada.';

CREATE INDEX idx_cs_continuidade_organization_id ON public.cs_continuidade(organization_id, data_evento DESC, criada_em DESC);
CREATE INDEX idx_cs_continuidade_reuniao_id ON public.cs_continuidade(reuniao_id);
CREATE INDEX idx_cs_continuidade_tipo ON public.cs_continuidade(tipo);

-- Apêndice-only: bloqueia UPDATE e DELETE a nível de trigger, para as duas
-- tabelas que "só crescem" (cs_continuidade e cs_percepcao). Isso implementa o
-- princípio como garantia de banco, não só como regra documentada.
CREATE OR REPLACE FUNCTION public.cs_bloquear_alteracao()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  RAISE EXCEPTION 'Esta tabela só recebe entradas novas (INSERT) — nunca é sobrescrita nem resumida (P3/P2). Para corrigir uma entrada anterior, registre uma entrada nova.';
END;
$function$;

CREATE TRIGGER trg_cs_continuidade_bloquear_alteracao
  BEFORE UPDATE OR DELETE ON public.cs_continuidade
  FOR EACH ROW
  EXECUTE FUNCTION public.cs_bloquear_alteracao();

CREATE TRIGGER trg_cs_percepcao_bloquear_alteracao
  BEFORE UPDATE OR DELETE ON public.cs_percepcao
  FOR EACH ROW
  EXECUTE FUNCTION public.cs_bloquear_alteracao();

ALTER TABLE public.cs_continuidade ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_continuidade_internal_only ON public.cs_continuidade
  FOR ALL
  USING (public.is_super_admin() OR public.is_admin())
  WITH CHECK (public.is_super_admin() OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- ÚNICA alteração autorizada em tabela de terceiros: 2 colunas aditivas e
-- nullable em `jornadas`, autorizadas explicitamente pelo CEO. O método exige
-- que todo plano declare qual elo ataca e qual número define sucesso — hoje
-- não há onde guardar isso (nem jornadas, nem jornada_estagios, nem
-- jornada_passos têm campo pra isso). Nenhum DROP, nenhuma mudança de coluna
-- existente, nenhuma policy alheia tocada.
-- ═══════════════════════════════════════════════════════════════════
ALTER TABLE public.jornadas
  ADD COLUMN elo_alvo text,
  ADD COLUMN criterio_sucesso text;

COMMENT ON COLUMN public.jornadas.elo_alvo IS
  'Elo (dos 8 elos/4 camadas) que este plano mensal ataca. Nullable/aditivo — '
  'autorizado pelo CEO em 2026-07-30. Preenchido só para jornadas tipo=mensal '
  'geradas pelo fechamento (/cs-mes); jornadas antigas ficam NULL.';

COMMENT ON COLUMN public.jornadas.criterio_sucesso IS
  'O número que define sucesso deste plano mensal (texto livre — ex.: "Taxa de '
  'Agendamento de 42% para 55%"). Nullable/aditivo — autorizado pelo CEO em '
  '2026-07-30. Mesmo escopo de elo_alvo: nível plano/mês, não por estágio nem '
  'por passo.';
