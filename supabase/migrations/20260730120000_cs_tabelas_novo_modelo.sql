-- Novo sistema de CS (5 elos -> 8 elos, régua de risco, plano publicado, reuniões).
-- Cria SOMENTE objetos novos: 3 tabelas internas de CS, com RLS restrita a
-- is_super_admin() OR is_admin(). Nenhuma tabela/coluna/função existente é
-- alterada, removida ou substituída.
--
-- Referência: 05-operacoes-e-cs/sistema/proposta-novos-elos.md,
-- comparecimento-e-fechamento.md, ritos/01-regua-de-risco.md, 05-publicar-plano.md

-- ═══════════════════════════════════════════════════════════════════
-- cs_tarefas — as tarefas do CS (dono João ou Claude)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.cs_tarefas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  dono text NOT NULL CHECK (dono IN ('joao', 'claude')),
  origem text NOT NULL CHECK (origem IN ('plano', 'manual', 'sistema')),
  jornada_id uuid NULL REFERENCES public.jornadas(id) ON DELETE SET NULL,
  prazo date,
  prioridade int DEFAULT 0,
  concluida boolean DEFAULT false,
  concluida_em timestamptz,
  criada_por uuid,
  criada_em timestamptz DEFAULT now()
);

COMMENT ON TABLE public.cs_tarefas IS 'Tarefas do CS (João/Claude). Tabela interna — acesso somente is_super_admin()/is_admin().';

CREATE INDEX idx_cs_tarefas_organization_id ON public.cs_tarefas(organization_id);
CREATE INDEX idx_cs_tarefas_concluida ON public.cs_tarefas(concluida);
CREATE INDEX idx_cs_tarefas_prazo ON public.cs_tarefas(prazo);

ALTER TABLE public.cs_tarefas ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_tarefas_internal_only ON public.cs_tarefas
  FOR ALL
  USING (public.is_super_admin() OR public.is_admin())
  WITH CHECK (public.is_super_admin() OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- cs_aderencia_snapshot — congela a aderência de um mês fechado
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.cs_aderencia_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  periodo_ref date NOT NULL,
  jornada_id uuid NULL REFERENCES public.jornadas(id) ON DELETE SET NULL,
  total_passos int,
  passos_concluidos int,
  pct numeric,
  por_semana jsonb,
  congelado_em timestamptz DEFAULT now(),
  UNIQUE (organization_id, periodo_ref)
);

COMMENT ON TABLE public.cs_aderencia_snapshot IS 'Aderência ao plano do mês, congelada no fechamento mensal (/cs-mes). Não muda retroativamente mesmo se jornada_passos for editado depois. Tabela interna.';

CREATE INDEX idx_cs_aderencia_snapshot_org ON public.cs_aderencia_snapshot(organization_id);

ALTER TABLE public.cs_aderencia_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_aderencia_snapshot_internal_only ON public.cs_aderencia_snapshot
  FOR ALL
  USING (public.is_super_admin() OR public.is_admin())
  WITH CHECK (public.is_super_admin() OR public.is_admin());

-- ═══════════════════════════════════════════════════════════════════
-- cs_reunioes — agenda de reuniões com clientes (não existia em lugar nenhum)
-- ═══════════════════════════════════════════════════════════════════
CREATE TABLE public.cs_reunioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NULL REFERENCES public.organizations(id) ON DELETE SET NULL,
  tipo text CHECK (tipo IN ('kickoff', 'semanal', 'mensal', 'sob_demanda', 'tatica_grupo')),
  data_hora timestamptz NOT NULL,
  status text DEFAULT 'agendada' CHECK (status IN ('agendada', 'realizada', 'cancelada')),
  pauta text,
  notas text,
  criada_em timestamptz DEFAULT now()
);

COMMENT ON TABLE public.cs_reunioes IS 'Agenda de reuniões de CS com clientes PCA. organization_id NULL = sessão tática em grupo. Tabela interna.';

CREATE INDEX idx_cs_reunioes_organization_id ON public.cs_reunioes(organization_id);
CREATE INDEX idx_cs_reunioes_data_hora ON public.cs_reunioes(data_hora);

ALTER TABLE public.cs_reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY cs_reunioes_internal_only ON public.cs_reunioes
  FOR ALL
  USING (public.is_super_admin() OR public.is_admin())
  WITH CHECK (public.is_super_admin() OR public.is_admin());
