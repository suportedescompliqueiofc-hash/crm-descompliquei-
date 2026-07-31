-- Funções de leitura/escrita para cs_contexto, cs_percepcao, cs_continuidade
-- (tabelas criadas em 20260730130000). Mesmo padrão de
-- 20260730120001_cs_funcoes_novo_modelo.sql: SECURITY DEFINER, guarda
-- is_super_admin()/is_admin(), pragma #variable_conflict use_column.
--
-- Escrita (P6, 05-operacoes-e-cs/CLAUDE.md): cs_registrar_continuidade,
-- cs_salvar_contexto e cs_registrar_percepcao escrevem em tabelas INTERNAS do
-- CS (não em leads/vendas/agendamentos/mensagens/metas) — permitido.

-- ═══════════════════════════════════════════════════════════════════
-- cs_cliente_contexto — o contexto completo de um cliente, incl. percepções recentes
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_cliente_contexto(p_org_id uuid)
RETURNS TABLE(
  organization_id uuid,
  nome text,
  cidade text,
  cliente_desde date,
  promessa_venda text,
  convenio_particular text,
  quem_atende text,
  quem_vende text,
  tem_equipe text,
  elo_restricao text,
  elo_restricao_status text,
  elo_restricao_desde text,
  restricoes_conhecidas text,
  atualizado_em timestamptz,
  percepcoes_recentes jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    o.id,
    o.name,
    c.cidade,
    COALESCE(c.cliente_desde, o.created_at::date),
    c.promessa_venda,
    c.convenio_particular,
    c.quem_atende,
    c.quem_vende,
    c.tem_equipe,
    c.elo_restricao,
    c.elo_restricao_status,
    c.elo_restricao_desde,
    c.restricoes_conhecidas,
    c.atualizado_em,
    (
      SELECT COALESCE(jsonb_agg(sub ORDER BY sub.ordem_data DESC, sub.registrada_em DESC), '[]'::jsonb)
      FROM (
        SELECT
          p.id, p.data_percepcao, p.data_aproximada, p.texto,
          p.diverge_do_dado, p.divergencia_nota, p.registrada_em,
          COALESCE(p.data_percepcao, p.registrada_em::date) AS ordem_data
        FROM cs_percepcao p
        WHERE p.organization_id = p_org_id
        ORDER BY ordem_data DESC, p.registrada_em DESC
        LIMIT 10
      ) sub
    ) AS percepcoes_recentes
  FROM organizations o
  LEFT JOIN cs_contexto c ON c.organization_id = o.id
  WHERE o.id = p_org_id;
END;
$function$;

COMMENT ON FUNCTION public.cs_cliente_contexto(uuid) IS
  'Contexto completo de um cliente (equivalente a contexto.md), com as 10 '
  'percepções mais recentes (cs_percepcao) embutidas como jsonb. Nunca '
  'devolve número de desempenho (P1) — cliente_desde cai de volta em '
  'organizations.created_at quando cs_contexto não tem linha ainda. Retorna '
  'zero linhas se a organização não existir; nunca erro.';

-- ═══════════════════════════════════════════════════════════════════
-- cs_cliente_continuidade — o histórico, mais recente primeiro
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_cliente_continuidade(p_org_id uuid, p_limite int DEFAULT 50)
RETURNS TABLE(
  id uuid,
  data_evento date,
  tipo text,
  o_que_aconteceu text,
  ficou_combinado text,
  combinado_com text,
  origem text,
  reuniao_id uuid,
  reuniao_tipo text,
  reuniao_data_hora timestamptz,
  criada_em timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT
    cc.id, cc.data_evento, cc.tipo, cc.o_que_aconteceu, cc.ficou_combinado,
    cc.combinado_com, cc.origem, cc.reuniao_id, r.tipo, r.data_hora, cc.criada_em
  FROM cs_continuidade cc
  LEFT JOIN cs_reunioes r ON r.id = cc.reuniao_id
  WHERE cc.organization_id = p_org_id
  ORDER BY cc.data_evento DESC, cc.criada_em DESC
  LIMIT p_limite;
END;
$function$;

COMMENT ON FUNCTION public.cs_cliente_continuidade(uuid, int) IS
  'Histórico de continuidade de um cliente (equivalente a continuidade.md), '
  'mais recente primeiro (data_evento DESC, criada_em DESC como desempate). '
  'p_limite default 50. Junta dados da reunião de origem quando reuniao_id '
  'está preenchido.';

-- ═══════════════════════════════════════════════════════════════════
-- cs_registrar_continuidade — insere uma entrada nova (nunca edita)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_registrar_continuidade(
  p_org_id uuid,
  p_data_evento date,
  p_tipo text,
  p_o_que_aconteceu text,
  p_ficou_combinado text DEFAULT NULL,
  p_combinado_com text DEFAULT NULL,
  p_origem text DEFAULT 'registro_manual',
  p_reuniao_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_id uuid;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO cs_continuidade (
    organization_id, data_evento, tipo, o_que_aconteceu, ficou_combinado,
    combinado_com, origem, reuniao_id, criada_por
  ) VALUES (
    p_org_id, p_data_evento, p_tipo, p_o_que_aconteceu, p_ficou_combinado,
    p_combinado_com, p_origem, p_reuniao_id, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

COMMENT ON FUNCTION public.cs_registrar_continuidade(uuid, date, text, text, text, text, text, uuid) IS
  'Única forma de escrever em cs_continuidade além de migração direta — sempre '
  'INSERT (a tabela bloqueia UPDATE/DELETE por trigger). "Registrar não é '
  'comando": toda sessão de CS que resulta em algo combinado deve terminar com '
  'uma chamada a esta função (00-como-funciona.md).';

-- ═══════════════════════════════════════════════════════════════════
-- cs_salvar_contexto — upsert que só preenche o que for passado (nunca apaga
-- um campo já preenchido por causa de um parâmetro omitido)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_salvar_contexto(
  p_org_id uuid,
  p_cidade text DEFAULT NULL,
  p_cliente_desde date DEFAULT NULL,
  p_promessa_venda text DEFAULT NULL,
  p_convenio_particular text DEFAULT NULL,
  p_quem_atende text DEFAULT NULL,
  p_quem_vende text DEFAULT NULL,
  p_tem_equipe text DEFAULT NULL,
  p_elo_restricao text DEFAULT NULL,
  p_elo_restricao_status text DEFAULT NULL,
  p_elo_restricao_desde text DEFAULT NULL,
  p_restricoes_conhecidas text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_id uuid;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO cs_contexto (
    organization_id, cidade, cliente_desde, promessa_venda, convenio_particular,
    quem_atende, quem_vende, tem_equipe, elo_restricao, elo_restricao_status,
    elo_restricao_desde, restricoes_conhecidas
  ) VALUES (
    p_org_id, p_cidade, p_cliente_desde, p_promessa_venda, p_convenio_particular,
    p_quem_atende, p_quem_vende, p_tem_equipe, p_elo_restricao, p_elo_restricao_status,
    p_elo_restricao_desde, p_restricoes_conhecidas
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    cidade                = COALESCE(EXCLUDED.cidade, cs_contexto.cidade),
    cliente_desde          = COALESCE(EXCLUDED.cliente_desde, cs_contexto.cliente_desde),
    promessa_venda          = COALESCE(EXCLUDED.promessa_venda, cs_contexto.promessa_venda),
    convenio_particular     = COALESCE(EXCLUDED.convenio_particular, cs_contexto.convenio_particular),
    quem_atende             = COALESCE(EXCLUDED.quem_atende, cs_contexto.quem_atende),
    quem_vende              = COALESCE(EXCLUDED.quem_vende, cs_contexto.quem_vende),
    tem_equipe              = COALESCE(EXCLUDED.tem_equipe, cs_contexto.tem_equipe),
    elo_restricao           = COALESCE(EXCLUDED.elo_restricao, cs_contexto.elo_restricao),
    elo_restricao_status    = COALESCE(EXCLUDED.elo_restricao_status, cs_contexto.elo_restricao_status),
    elo_restricao_desde     = COALESCE(EXCLUDED.elo_restricao_desde, cs_contexto.elo_restricao_desde),
    restricoes_conhecidas   = COALESCE(EXCLUDED.restricoes_conhecidas, cs_contexto.restricoes_conhecidas)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

COMMENT ON FUNCTION public.cs_salvar_contexto(uuid, text, date, text, text, text, text, text, text, text, text, text) IS
  'Upsert de cs_contexto por organization_id. Parâmetro omitido (NULL) NUNCA '
  'apaga um valor já salvo — só preenche o que for passado explicitamente '
  '(COALESCE(EXCLUDED.x, cs_contexto.x)). Para limpar um campo de propósito, '
  'edite a tabela diretamente como usuário interno. Cria a linha na primeira '
  'chamada para uma organização.';

-- ═══════════════════════════════════════════════════════════════════
-- cs_registrar_percepcao — insere uma percepção nova (nunca edita)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_registrar_percepcao(
  p_org_id uuid,
  p_texto text,
  p_data_percepcao date DEFAULT NULL,
  p_data_aproximada boolean DEFAULT false,
  p_diverge_do_dado boolean DEFAULT false,
  p_divergencia_nota text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_id uuid;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  INSERT INTO cs_percepcao (
    organization_id, texto, data_percepcao, data_aproximada,
    diverge_do_dado, divergencia_nota, registrada_por
  ) VALUES (
    p_org_id, p_texto, p_data_percepcao, p_data_aproximada,
    p_diverge_do_dado, p_divergencia_nota, auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$function$;

COMMENT ON FUNCTION public.cs_registrar_percepcao(uuid, text, date, boolean, boolean, text) IS
  'Única forma de escrever em cs_percepcao além de migração direta — sempre '
  'INSERT (a tabela bloqueia UPDATE/DELETE por trigger). diverge_do_dado=true + '
  'divergencia_nota é o registro explícito do sinal mais valioso do sistema '
  '(P2) — nunca resolver a divergência apagando um dos dois lados.';

-- ═══════════════════════════════════════════════════════════════════
-- cs_dias_sem_contato — derivado da continuidade (substitui o NULL fixo que
-- cs_carteira() devolvia em v1, ver 20260730120001)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_dias_sem_contato(p_org_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_ultimo date;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT max(cc.data_evento) INTO v_ultimo
  FROM cs_continuidade cc
  WHERE cc.organization_id = p_org_id;

  IF v_ultimo IS NULL THEN
    RETURN NULL; -- nenhuma entrada de continuidade ainda: não computável, não é zero
  END IF;

  RETURN (current_date - v_ultimo);
END;
$function$;

COMMENT ON FUNCTION public.cs_dias_sem_contato(uuid) IS
  'Dias desde o data_evento mais recente em cs_continuidade para esta '
  'organização. NULL quando não há nenhuma entrada de continuidade ainda '
  '(não confundir com 0 — ausência de dado, não contato hoje). Usada por '
  'cs_carteira() (atualizada nesta migration) no lugar do NULL::int fixo da v1.';

-- ═══════════════════════════════════════════════════════════════════
-- cs_carteira — CREATE OR REPLACE: mesma função de 20260730120001, só troca
-- dias_sem_contato de NULL::int fixo para o valor real via cs_dias_sem_contato().
-- Todo o resto (elo-restrição por ganho simulado, régua de risco, camada 0)
-- é idêntico à v1 — não há mudança de comportamento fora dessa coluna.
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_carteira()
RETURNS TABLE(
  organization_id uuid,
  nome text,
  cliente_desde date,
  dias_de_ciclo int,
  pct_contrato numeric,
  camada_0_ok boolean,
  elo_restricao text,
  nivel_risco text,
  aderencia_pct numeric,
  dias_sem_contato int,
  ordem_fila int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH pca(organization_id) AS (
    VALUES
      ('2780f688-e00d-4d22-a8c5-67cbaea77d24'::uuid), -- Dra Tayane Rocha
      ('78144f3a-c6f3-4145-a027-534e6f622984'::uuid), -- Dra Juliana Lopes
      ('38d31fbd-59f3-4ade-99bb-28699279d913'::uuid), -- Dra Monção
      ('ab4dcdc0-f313-4cef-b376-02c95c5ff4e2'::uuid), -- Clínica Lara Morgado
      ('93358e8b-b724-4cba-b477-b3646d9d0227'::uuid), -- Doutora Anna Clara
      ('271d81c4-a739-4059-9f55-14a490303fc3'::uuid), -- Dr Jhonatan Dutra
      ('f1015744-992f-4db5-aac3-566e4cbd8d18'::uuid)  -- Dr Derek Gonçalves
  ),
  base AS (
    SELECT p.organization_id, o.name AS nome, o.created_at::date AS cliente_desde,
      (current_date - o.created_at::date) AS dias_de_ciclo,
      round(100.0 * (current_date - o.created_at::date) / 180.0, 1) AS pct_contrato
    FROM pca p
    JOIN organizations o ON o.id = p.organization_id
  ),
  leads_tot AS (
    SELECT organization_id, count(*) AS n
    FROM leads WHERE organization_id IN (SELECT organization_id FROM pca)
    GROUP BY 1
  ),
  vendas_tot AS (
    SELECT organization_id, count(*) AS n, sum(valor_fechado) AS receita
    FROM vendas WHERE organization_id IN (SELECT organization_id FROM pca)
    GROUP BY 1
  ),
  whats AS (
    SELECT organization_id, bool_or(status = 'connected') AS ok
    FROM whatsapp_connections WHERE organization_id IN (SELECT organization_id FROM pca)
    GROUP BY 1
  ),
  camada0 AS (
    SELECT b.organization_id,
      COALESCE(w.ok, false) AS whatsapp_ok,
      COALESCE(lt.n, 0) AS leads_total,
      COALESCE(vt.n, 0) AS vendas_total,
      COALESCE(vt.receita, 0) AS receita_total,
      ((NOT COALESCE(w.ok, false))
        OR (COALESCE(lt.n, 0) >= 10 AND b.dias_de_ciclo >= 30 AND COALESCE(vt.n, 0) = 0)
      ) AS estrutural_falho
    FROM base b
    LEFT JOIN whats w ON w.organization_id = b.organization_id
    LEFT JOIN leads_tot lt ON lt.organization_id = b.organization_id
    LEFT JOIN vendas_tot vt ON vt.organization_id = b.organization_id
  ),
  ganhos AS (
    SELECT p.organization_id, g.elo, g.ganho_simulado, g.simulavel
    FROM pca p
    CROSS JOIN LATERAL cs_cliente_ganho_simulado(p.organization_id) g
  ),
  melhor_ganho AS (
    SELECT DISTINCT ON (organization_id) organization_id, elo, ganho_simulado
    FROM ganhos
    WHERE simulavel AND ganho_simulado IS NOT NULL
    ORDER BY organization_id, ganho_simulado DESC,
      CASE elo
        WHEN 'Agendamento' THEN 1 WHEN 'Resgate de Lead Frio' THEN 2
        WHEN 'Comparecimento' THEN 3 WHEN 'Fechamento' THEN 4
        WHEN 'Ticket' THEN 5 WHEN 'Demanda' THEN 6 ELSE 9
      END
  ),
  recompra_disponivel AS (
    SELECT organization_id, (count(*) FILTER (WHERE lead_id IS NOT NULL)) > 0 AS tem_dado
    FROM vendas WHERE organization_id IN (SELECT organization_id FROM pca)
    GROUP BY 1
  ),
  elo_escolhido AS (
    SELECT c0.organization_id,
      CASE
        WHEN c0.estrutural_falho THEN 'Adoção (Camada 0)'
        WHEN mg.elo IS NOT NULL THEN mg.elo
        WHEN COALESCE(rd.tem_dado, false) THEN 'Recompra'
        ELSE 'Sem dado suficiente para simular'
      END AS elo_restricao
    FROM camada0 c0
    LEFT JOIN melhor_ganho mg ON mg.organization_id = c0.organization_id
    LEFT JOIN recompra_disponivel rd ON rd.organization_id = c0.organization_id
  ),
  aderencia_atual AS (
    SELECT p.organization_id, ad.pct
    FROM pca p
    CROSS JOIN LATERAL cs_aderencia(p.organization_id, current_date) ad
  ),
  aderencia_snapshot_prev AS (
    SELECT s.organization_id, s.pct
    FROM cs_aderencia_snapshot s
    WHERE s.organization_id IN (SELECT organization_id FROM pca)
      AND s.periodo_ref = date_trunc('month', current_date - interval '1 month')::date
  ),
  jornada_mensal AS (
    SELECT organization_id, true AS existe
    FROM jornadas
    WHERE organization_id IN (SELECT organization_id FROM pca)
      AND tipo = 'mensal' AND status IN ('ativa', 'concluida')
    GROUP BY 1
  ),
  contato AS (
    SELECT p.organization_id, cs_dias_sem_contato(p.organization_id) AS dias_sem_contato
    FROM pca p
  ),
  niveis AS (
    SELECT c0.organization_id,
      a.pct AS aderencia_pct,
      CASE
        WHEN c0.estrutural_falho THEN 'critico'
        WHEN b.pct_contrato > 50 AND NOT COALESCE(jm.existe, false) THEN 'critico'
        WHEN c0.receita_total = 0 AND b.pct_contrato > 25 THEN 'critico'
        WHEN a.pct IS NOT NULL AND a.pct < 30 AND asp.pct IS NOT NULL AND asp.pct < 30 THEN 'critico'
        WHEN a.pct IS NOT NULL AND a.pct < 60 THEN 'atencao'
        WHEN b.pct_contrato BETWEEN 40 AND 50 AND NOT COALESCE(jm.existe, false) THEN 'atencao'
        ELSE 'saudavel'
      END AS nivel_risco
    FROM camada0 c0
    JOIN base b ON b.organization_id = c0.organization_id
    LEFT JOIN aderencia_atual a ON a.organization_id = c0.organization_id
    LEFT JOIN aderencia_snapshot_prev asp ON asp.organization_id = c0.organization_id
    LEFT JOIN jornada_mensal jm ON jm.organization_id = c0.organization_id
  ),
  final AS (
    SELECT
      b.organization_id, b.nome, b.cliente_desde, b.dias_de_ciclo, b.pct_contrato,
      NOT c0.estrutural_falho AS camada_0_ok,
      ee.elo_restricao,
      n.nivel_risco,
      n.aderencia_pct,
      ct.dias_sem_contato,
      c0.receita_total
    FROM base b
    JOIN camada0 c0 ON c0.organization_id = b.organization_id
    JOIN elo_escolhido ee ON ee.organization_id = b.organization_id
    JOIN niveis n ON n.organization_id = b.organization_id
    JOIN contato ct ON ct.organization_id = b.organization_id
  )
  SELECT
    f.organization_id, f.nome, f.cliente_desde, f.dias_de_ciclo, f.pct_contrato,
    f.camada_0_ok, f.elo_restricao, f.nivel_risco, f.aderencia_pct, f.dias_sem_contato,
    row_number() OVER (
      ORDER BY
        CASE f.nivel_risco WHEN 'critico' THEN 0 WHEN 'atencao' THEN 1 WHEN 'saudavel' THEN 2 ELSE 3 END,
        f.pct_contrato DESC,
        (f.receita_total = 0) DESC,
        f.aderencia_pct ASC NULLS LAST
    )::int AS ordem_fila
  FROM final f
  ORDER BY ordem_fila;
END;
$function$;

COMMENT ON FUNCTION public.cs_carteira() IS
  'Uma linha por clínica PCA (7 orgs fixas), ordenada pela régua de risco '
  '(05-operacoes-e-cs/sistema/ritos/01-regua-de-risco.md). '
  'elo_restricao: vem de cs_cliente_ganho_simulado() — ganho de receita '
  'simulado, cliente comparado só com ele mesmo (método de 01-a-cadeia.md). '
  'dias_sem_contato (atualizado nesta migration, 20260730130001): agora vem de '
  'cs_dias_sem_contato(), derivado de cs_continuidade — NULL só quando o '
  'cliente não tem nenhuma entrada de continuidade ainda, não mais sempre '
  'NULL como na v1. Limitações remanescentes (não corrigidas aqui, mesmo '
  'escopo da v1): trigger de Crítico "elo piorando 2 meses seguidos" e o nível '
  '"referência" (3 meses saudável) não são avaliados por dependerem de série '
  'histórica que cs_aderencia_snapshot ainda não acumulou; o gatilho '
  'específico de Crítico por dias-sem-contato prolongado (regua-de-risco.md) '
  'não foi adicionado ao CASE de nivel_risco — o dado agora existe na coluna, '
  'mas incorporá-lo à régua de risco é mudança de comportamento fora do '
  'escopo pedido a este squad (só popular a coluna).';
