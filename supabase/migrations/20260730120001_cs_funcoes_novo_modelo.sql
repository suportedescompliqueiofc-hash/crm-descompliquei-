-- Funções do novo modelo de CS (8 elos em 4 camadas + régua de risco).
-- Todas SECURITY DEFINER, com a mesma guarda de is_super_admin()/is_admin()
-- usada em get_cs_clients()/get_cs_crm_metrics() (padrão já existente, não alterado).
-- Nenhuma função existente é substituída — todas abaixo são CREATE (nomes novos).
--
-- Fórmulas testadas em 05-operacoes-e-cs/sistema/proposta-novos-elos.md,
-- comparecimento-e-fechamento.md e 05-publicar-plano.md.
--
-- LIMITAÇÃO DECLARADA (não corrigida aqui, só reportada): "tempo desde o último
-- contato registrado" (sinal 5 da régua) vive em continuidade.md de cada cliente,
-- fora do Supabase — não é computável só com acesso ao banco. cs_carteira()
-- retorna dias_sem_contato = NULL por esse motivo, e o critério de nível/fila
-- que dependeria dele (trigger 7 de Crítico, critério de desempate 2) não é
-- aplicado aqui. Da mesma forma, "elo-restrição piorando 2 meses seguidos"
-- (trigger 6) e o nível Referência (3 meses consecutivos) dependem de série
-- histórica que ainda não existe (sistema novo, cs_aderencia_snapshot vazia no
-- início) — não implementados nesta função v1.

-- ═══════════════════════════════════════════════════════════════════
-- cs_cliente_elos — os 8 elos de um cliente em um mês específico
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_cliente_elos(p_org_id uuid, p_mes date)
RETURNS TABLE(
  camada text,
  elo text,
  valor numeric,
  numerador numeric,
  denominador numeric,
  amostra_suficiente boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_mes_ini date := date_trunc('month', p_mes)::date;
  v_mes_fim_excl date := (date_trunc('month', p_mes) + interval '1 month')::date;
  v_mes_fim date := (date_trunc('month', p_mes) + interval '1 month' - interval '1 day')::date;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH demanda AS (
    SELECT count(*)::numeric AS n
    FROM leads l
    WHERE l.organization_id = p_org_id
      AND l.criado_em >= v_mes_ini AND l.criado_em < v_mes_fim_excl
  ),
  leads_mes AS (
    SELECT l.id
    FROM leads l
    WHERE l.organization_id = p_org_id
      AND l.criado_em >= v_mes_ini AND l.criado_em < v_mes_fim_excl
  ),
  agendamento AS (
    SELECT
      count(*) FILTER (WHERE EXISTS (SELECT 1 FROM agendamentos a WHERE a.lead_id = lm.id))::numeric AS num,
      count(*)::numeric AS den
    FROM leads_mes lm
  ),
  entradas AS (
    SELECT m.lead_id, m.criado_em,
      lag(m.criado_em) OVER (PARTITION BY m.lead_id ORDER BY m.criado_em) AS anterior
    FROM mensagens m
    WHERE m.organization_id = p_org_id AND m.direcao = 'entrada'
      AND m.criado_em >= v_mes_ini AND m.criado_em < v_mes_fim_excl
  ),
  gaps AS (
    SELECT lead_id,
      max(extract(epoch FROM (criado_em - anterior)) / 86400.0) AS maior_gap,
      count(*) AS n_entradas
    FROM entradas
    GROUP BY 1
  ),
  resgate AS (
    SELECT
      count(*) FILTER (WHERE n_entradas >= 2 AND maior_gap >= 7)::numeric AS num,
      count(*) FILTER (WHERE n_entradas >= 2)::numeric AS den
    FROM gaps
  ),
  comparecimento AS (
    SELECT
      count(*) FILTER (WHERE a.status = 'realizado')::numeric AS num,
      count(*) FILTER (WHERE a.status IN ('realizado', 'nao_compareceu'))::numeric AS den
    FROM agendamentos a
    WHERE a.organization_id = p_org_id
      AND a.data_hora_inicio >= v_mes_ini AND a.data_hora_inicio < v_mes_fim_excl
  ),
  fechamento AS (
    SELECT
      (SELECT count(*)::numeric FROM vendas v WHERE v.organization_id = p_org_id
         AND v.data_fechamento >= v_mes_ini AND v.data_fechamento <= v_mes_fim) AS num,
      (SELECT count(*)::numeric FROM agendamentos a WHERE a.organization_id = p_org_id
         AND a.status = 'realizado'
         AND a.data_hora_inicio >= v_mes_ini AND a.data_hora_inicio < v_mes_fim_excl) AS den
  ),
  ticket AS (
    SELECT sum(v.valor_fechado) AS soma, count(*)::numeric AS den
    FROM vendas v
    WHERE v.organization_id = p_org_id AND v.valor_fechado IS NOT NULL
      AND v.data_fechamento >= v_mes_ini AND v.data_fechamento <= v_mes_fim
  ),
  ciclo AS (
    SELECT
      percentile_cont(0.5) WITHIN GROUP (ORDER BY (v.data_fechamento - l.criado_em::date)) AS mediana,
      count(*)::numeric AS den
    FROM vendas v
    JOIN leads l ON l.id = v.lead_id
    WHERE v.organization_id = p_org_id
      AND v.data_fechamento >= v_mes_ini AND v.data_fechamento <= v_mes_fim
  ),
  recompra AS (
    SELECT
      count(*) FILTER (WHERE existe_anterior)::numeric AS num,
      count(*)::numeric AS den
    FROM (
      SELECT v.id,
        EXISTS (
          SELECT 1 FROM vendas v2
          WHERE v2.lead_id = v.lead_id AND v2.organization_id = p_org_id
            AND v2.data_fechamento < v.data_fechamento
        ) AS existe_anterior
      FROM vendas v
      WHERE v.organization_id = p_org_id AND v.lead_id IS NOT NULL
        AND v.data_fechamento >= v_mes_ini AND v.data_fechamento <= v_mes_fim
    ) x
  )
  SELECT '1', 'Demanda'::text, d.n, d.n, NULL::numeric, true FROM demanda d
  UNION ALL
  SELECT '2', 'Agendamento', round(100.0 * ag.num / NULLIF(ag.den, 0), 1), ag.num, ag.den, ag.den >= 5 FROM agendamento ag
  UNION ALL
  SELECT '2', 'Resgate de Lead Frio', round(100.0 * r.num / NULLIF(r.den, 0), 1), r.num, r.den, r.den >= 5 FROM resgate r
  UNION ALL
  SELECT '2', 'Comparecimento', round(100.0 * c.num / NULLIF(c.den, 0), 1), c.num, c.den, c.den >= 5 FROM comparecimento c
  UNION ALL
  SELECT '2', 'Fechamento', round(100.0 * f.num / NULLIF(f.den, 0), 1), f.num, f.den, f.den >= 5 FROM fechamento f
  UNION ALL
  SELECT '2', 'Ticket', round(t.soma / NULLIF(t.den, 0), 2), t.soma, t.den, t.den >= 5 FROM ticket t
  UNION ALL
  SELECT '2', 'Ciclo de Venda', round(ci.mediana::numeric, 1), ci.mediana::numeric, ci.den, ci.den >= 5 FROM ciclo ci
  UNION ALL
  SELECT '3', 'Recompra', round(100.0 * rc.num / NULLIF(rc.den, 0), 1), rc.num, rc.den, rc.den >= 5 FROM recompra rc;
END;
$function$;

COMMENT ON FUNCTION public.cs_cliente_elos(uuid, date) IS 'Os 8 elos (Demanda, Agendamento, Resgate de Lead Frio, Comparecimento, Fechamento, Ticket, Ciclo de Venda, Recompra) de uma organização em um mês. amostra_suficiente = denominador >= 5 (calibração inicial, ajustável).';

-- ═══════════════════════════════════════════════════════════════════
-- cs_cliente_serie — a série mês a mês desde o cadastro da organização
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_cliente_serie(p_org_id uuid)
RETURNS TABLE(
  mes date,
  camada text,
  elo text,
  valor numeric,
  numerador numeric,
  denominador numeric,
  amostra_suficiente boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_inicio date;
  v_atual date := date_trunc('month', now())::date;
  v_mes date;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT date_trunc('month', o.created_at)::date INTO v_inicio
  FROM organizations o WHERE o.id = p_org_id;

  IF v_inicio IS NULL THEN
    RETURN; -- organização não encontrada: nenhuma linha, sem erro
  END IF;

  v_mes := v_inicio;
  WHILE v_mes <= v_atual LOOP
    RETURN QUERY
    SELECT v_mes, ce.camada, ce.elo, ce.valor, ce.numerador, ce.denominador, ce.amostra_suficiente
    FROM cs_cliente_elos(p_org_id, v_mes) ce;
    v_mes := (v_mes + interval '1 month')::date;
  END LOOP;
END;
$function$;

COMMENT ON FUNCTION public.cs_cliente_serie(uuid) IS 'Série mês a mês dos 8 elos, desde organizations.created_at até o mês corrente. Sem janela fixa — reusa cs_cliente_elos() por mês.';

-- ═══════════════════════════════════════════════════════════════════
-- cs_cliente_adocao — checklist da Camada 0 (Adoção), item a item
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_cliente_adocao(p_org_id uuid)
RETURNS TABLE(
  item text,
  ligado boolean,
  evidencia text
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
  SELECT 'WhatsApp conectado'::text,
    EXISTS (SELECT 1 FROM whatsapp_connections wc WHERE wc.organization_id = p_org_id AND wc.status = 'connected'),
    'whatsapp_connections.status = ''connected'''::text
  UNION ALL
  SELECT 'IA de recepção ativa',
    NOT EXISTS (
      SELECT 1 FROM athos_agentes_org ao
      WHERE ao.organization_id = p_org_id AND ao.agente_slug = 'recepcao' AND ao.ativo = false
    ),
    'athos_agentes_org (agente_slug=''recepcao''); ausência de registro = ligado por padrão (padrão implícito da plataforma)'
  UNION ALL
  SELECT 'Follow-up automático ligado',
    EXISTS (SELECT 1 FROM ia_followup_config fc WHERE fc.organization_id = p_org_id AND fc.ativo = true),
    'ia_followup_config.ativo; ausência de registro = desligado'
  UNION ALL
  SELECT 'Confirmação/lembrete de consulta ativo',
    EXISTS (
      SELECT 1 FROM agendamento_config_notificacoes cn
      WHERE cn.organization_id = p_org_id
        AND (cn.notif_confirmacao_ativa = true OR cn.notif_1_ativa = true OR cn.notif_2_ativa = true OR cn.notif_3_ativa = true)
    ),
    'agendamento_config_notificacoes.notif_confirmacao_ativa / notif_1_ativa / notif_2_ativa / notif_3_ativa'
  UNION ALL
  SELECT 'Registro de agendamento em uso',
    EXISTS (SELECT 1 FROM agendamentos a WHERE a.organization_id = p_org_id),
    'agendamentos — existência de ao menos 1 registro'
  UNION ALL
  SELECT 'Registro de venda em uso',
    EXISTS (SELECT 1 FROM vendas v WHERE v.organization_id = p_org_id),
    'vendas — existência de ao menos 1 registro'
  UNION ALL
  SELECT 'Meta cadastrada',
    EXISTS (SELECT 1 FROM metas m WHERE m.organization_id = p_org_id AND m.ativo = true),
    'metas.ativo = true';
END;
$function$;

COMMENT ON FUNCTION public.cs_cliente_adocao(uuid) IS 'Checklist da Camada 0 (Adoção) — 7 itens, cada um com evidência de tabela/coluna. Nunca lança erro para cliente sem dado (tudo via EXISTS).';

-- ═══════════════════════════════════════════════════════════════════
-- cs_aderencia — aderência ao plano do período (mês)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_aderencia(p_org_id uuid, p_periodo date)
RETURNS TABLE(
  total_passos int,
  passos_concluidos int,
  pct numeric,
  por_semana jsonb
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
  WITH passos AS (
    SELECT p.id, p.concluido, (e.ordem + 1) AS semana
    FROM jornadas j
    JOIN jornada_estagios e ON e.jornada_id = j.id
    JOIN jornada_passos p ON p.estagio_id = e.id
    WHERE j.organization_id = p_org_id
      AND j.tipo = 'mensal'
      AND j.status IN ('ativa', 'concluida')
      AND date_trunc('month', j.periodo_ref) = date_trunc('month', p_periodo)
  ),
  semanas AS (
    SELECT semana,
      count(*)::int AS total,
      count(*) FILTER (WHERE concluido)::int AS concluidos
    FROM passos
    GROUP BY semana
  )
  SELECT
    (SELECT count(*)::int FROM passos),
    (SELECT count(*) FILTER (WHERE concluido)::int FROM passos),
    round(100.0 * (SELECT count(*) FILTER (WHERE concluido) FROM passos) / NULLIF((SELECT count(*) FROM passos), 0), 1),
    (SELECT COALESCE(
        jsonb_agg(
          jsonb_build_object('semana', semana, 'total', total, 'concluidos', concluidos)
          ORDER BY semana
        ), '[]'::jsonb)
     FROM semanas);
END;
$function$;

COMMENT ON FUNCTION public.cs_aderencia(uuid, date) IS 'Aderência ao plano mensal (jornadas tipo=mensal, status ativa/concluida) no período informado, com quebra por semana (estágio; semana = jornada_estagios.ordem + 1). por_semana: array de {semana int, total int, concluidos int}. Retorna zeros/[] quando não há jornada — nunca erro.';

-- ═══════════════════════════════════════════════════════════════════
-- cs_carteira — uma linha por clínica PCA, ordenada pela régua de risco
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
      -- Gatilhos estruturais da régua de risco (sinal 1, categoria A):
      -- sem canal de entrada, OU sem venda com volume relevante (>=10 leads,
      -- calibração inicial ajustável) e >=30 dias de casa.
      ((NOT COALESCE(w.ok, false))
        OR (COALESCE(lt.n, 0) >= 10 AND b.dias_de_ciclo >= 30 AND COALESCE(vt.n, 0) = 0)
      ) AS estrutural_falho
    FROM base b
    LEFT JOIN whats w ON w.organization_id = b.organization_id
    LEFT JOIN leads_tot lt ON lt.organization_id = b.organization_id
    LEFT JOIN vendas_tot vt ON vt.organization_id = b.organization_id
  ),
  elos_mes AS (
    SELECT p.organization_id, ce.camada, ce.elo, ce.valor, ce.amostra_suficiente
    FROM pca p
    CROSS JOIN LATERAL cs_cliente_elos(p.organization_id, current_date) ce
  ),
  ranked AS (
    SELECT organization_id, camada, elo, valor, amostra_suficiente,
      CASE WHEN valor IS NULL OR NOT amostra_suficiente THEN NULL
        ELSE percent_rank() OVER (
          PARTITION BY elo
          ORDER BY (CASE WHEN elo = 'Ciclo de Venda' THEN -valor ELSE valor END)
        )
      END AS rank_saude -- 0 = pior da carteira nesse elo, 1 = melhor
    FROM elos_mes
  ),
  worst_comercial AS (
    SELECT DISTINCT ON (organization_id) organization_id, elo, rank_saude
    FROM ranked
    WHERE camada = '2' AND rank_saude IS NOT NULL
    ORDER BY organization_id, rank_saude ASC,
      CASE elo
        WHEN 'Agendamento' THEN 1 WHEN 'Resgate de Lead Frio' THEN 2
        WHEN 'Comparecimento' THEN 3 WHEN 'Fechamento' THEN 4
        WHEN 'Ticket' THEN 5 WHEN 'Ciclo de Venda' THEN 6 ELSE 9
      END
  ),
  demanda_rank AS (
    SELECT organization_id, rank_saude FROM ranked WHERE elo = 'Demanda'
  ),
  elo_escolhido AS (
    SELECT c0.organization_id,
      CASE
        WHEN c0.estrutural_falho THEN 'Adoção (Camada 0)'
        WHEN dr.rank_saude IS NOT NULL AND wc.rank_saude IS NOT NULL AND dr.rank_saude < wc.rank_saude THEN 'Demanda'
        WHEN wc.elo IS NOT NULL THEN wc.elo
        ELSE 'Demanda'
      END AS elo_restricao
    FROM camada0 c0
    LEFT JOIN worst_comercial wc ON wc.organization_id = c0.organization_id
    LEFT JOIN demanda_rank dr ON dr.organization_id = c0.organization_id
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
  niveis AS (
    SELECT c0.organization_id,
      a.pct AS aderencia_pct,
      CASE
        WHEN c0.estrutural_falho THEN 'critico'
        WHEN b.pct_contrato > 50 AND NOT COALESCE(jm.existe, false) THEN 'critico'
        WHEN c0.receita_total = 0 AND b.pct_contrato > 25 THEN 'critico'
        WHEN a.pct IS NOT NULL AND a.pct < 30 AND asp.pct IS NOT NULL AND asp.pct < 30 THEN 'critico'
        WHEN a.pct IS NOT NULL AND a.pct BETWEEN 30 AND 60 THEN 'atencao'
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
      NULL::int AS dias_sem_contato, -- não computável só com o banco: vive em continuidade.md (fora do Supabase)
      c0.receita_total
    FROM base b
    JOIN camada0 c0 ON c0.organization_id = b.organization_id
    JOIN elo_escolhido ee ON ee.organization_id = b.organization_id
    JOIN niveis n ON n.organization_id = b.organization_id
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
  'v1 — limitações declaradas: dias_sem_contato é sempre NULL (dado vive em '
  'continuidade.md, fora do Supabase); trigger de Crítico "elo piorando 2 meses '
  'seguidos" e o nível "referência" (3 meses saudável) não são avaliados aqui '
  'por dependerem de série histórica que cs_aderencia_snapshot ainda não '
  'acumulou; a trava de fila "Camada 0 categoria B / revisão manual necessária" '
  'não é aplicada (exigiria detectar padrão implausível de preenchimento, fora '
  'de escopo desta v1); elo_restricao usa ranking relativo entre as 7 clínicas '
  '(percent_rank) como heurística objetiva, não a análise qualitativa completa '
  'feita em /cs-cliente — é uma aproximação de primeira leitura, não substitui o '
  'diagnóstico humano/assistido registrado em continuidade.md.';
