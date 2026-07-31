
-- Fix: perfis não tem coluna created_at (tem criado_em) — corrigido depois do
-- teste em transação revelar o erro (42703). CREATE OR REPLACE, mesma função,
-- só troca a ordenação da busca de um perfil da org.
CREATE OR REPLACE FUNCTION public.cs_publicar_jornada(
  p_org_id uuid,
  p_periodo_ref date,
  p_titulo text,
  p_elo_alvo text,
  p_criterio_sucesso text,
  p_estagios jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_user_id uuid;
  v_jornada_id uuid;
  v_estagio jsonb;
  v_estagio_id uuid;
  v_estagio_ordem int := 0;
  v_estagio_prazo_dias int;
  v_estagio_data_inicio date;
  v_passo jsonb;
  v_passo_ordem int;
  v_dono text;
  v_prazo date;
  v_qtd_estagios int := 0;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF p_org_id IS NULL THEN
    RAISE EXCEPTION 'organization_id é obrigatório — toda jornada precisa ficar visível à equipe inteira da clínica, não só a um user_id (05-publicar-plano.md, seção 2).';
  END IF;

  IF p_periodo_ref IS NULL THEN
    RAISE EXCEPTION 'periodo_ref é obrigatório (primeiro dia do mês do plano, ex.: 2026-08-01).';
  END IF;

  IF p_elo_alvo IS NULL OR btrim(p_elo_alvo) = '' THEN
    RAISE EXCEPTION 'elo_alvo é obrigatório — todo plano ataca um elo declarado (04-plano-de-acao.md, seção 2).';
  END IF;

  IF p_criterio_sucesso IS NULL OR btrim(p_criterio_sucesso) = '' THEN
    RAISE EXCEPTION 'criterio_sucesso é obrigatório — uma métrica só, com alvo numérico único (04-plano-de-acao.md, seção 4.3).';
  END IF;

  IF p_estagios IS NULL OR jsonb_typeof(p_estagios) <> 'array' OR jsonb_array_length(p_estagios) = 0 THEN
    RAISE EXCEPTION 'p_estagios precisa ser um array jsonb não vazio de estágios (semanas). Ver COMMENT da função para o formato.';
  END IF;

  IF EXISTS (
    SELECT 1 FROM jornadas j
    WHERE j.organization_id = p_org_id
      AND j.tipo = 'mensal'
      AND j.status = 'ativa'
      AND date_trunc('month', j.periodo_ref::timestamp) = date_trunc('month', p_periodo_ref::timestamp)
  ) THEN
    RAISE EXCEPTION 'Já existe uma jornada mensal ativa para esta organização em % — feche (status=concluida) o plano vigente antes de publicar um novo, não duplique.', to_char(p_periodo_ref, 'YYYY-MM');
  END IF;

  -- jornadas.user_id é NOT NULL com FK para perfis/auth.users, mas a RLS de
  -- leitura aceita user_id=auth.uid() OU organization_id do perfil — qualquer
  -- perfil desta clínica basta (05-publicar-plano.md, seção 2). Coluna real de
  -- perfis é `criado_em`, não `created_at` (confirmado via information_schema
  -- depois de um erro 42703 no teste em transação desta migration).
  SELECT p.id INTO v_user_id
  FROM perfis p
  WHERE p.organization_id = p_org_id
  ORDER BY p.criado_em ASC
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum perfil encontrado para organization_id % — não é possível publicar (jornadas.user_id é NOT NULL e exige um perfil desta clínica).', p_org_id;
  END IF;

  INSERT INTO jornadas (
    user_id, organization_id, titulo, status, tipo, periodo_ref,
    elo_alvo, criterio_sucesso, gerada_por, ativada_em
  ) VALUES (
    v_user_id, p_org_id, COALESCE(NULLIF(btrim(p_titulo), ''), 'Plano de Ação — ' || to_char(p_periodo_ref, 'YYYY-MM')),
    'ativa', 'mensal', p_periodo_ref, p_elo_alvo, p_criterio_sucesso, 'admin', now()
  )
  RETURNING id INTO v_jornada_id;

  FOR v_estagio IN SELECT * FROM jsonb_array_elements(p_estagios)
  LOOP
    v_estagio_prazo_dias := COALESCE((v_estagio->>'prazo_dias')::int, 7);
    v_estagio_data_inicio := NULLIF(v_estagio->>'data_inicio', '')::date;

    INSERT INTO jornada_estagios (jornada_id, titulo, descricao, ordem, prazo_dias, data_inicio)
    VALUES (
      v_jornada_id,
      COALESCE(NULLIF(btrim(v_estagio->>'titulo'), ''), 'Semana ' || (v_estagio_ordem + 1)::text),
      v_estagio->>'descricao',
      COALESCE((v_estagio->>'ordem')::int, v_estagio_ordem),
      v_estagio_prazo_dias,
      v_estagio_data_inicio
    )
    RETURNING id INTO v_estagio_id;

    v_qtd_estagios := v_qtd_estagios + 1;
    v_passo_ordem := 0;

    IF (v_estagio ? 'passos') AND jsonb_typeof(v_estagio->'passos') = 'array' THEN
      FOR v_passo IN SELECT * FROM jsonb_array_elements(v_estagio->'passos')
      LOOP
        v_dono := v_passo->>'dono';
        IF v_dono IS NULL OR v_dono NOT IN ('cliente', 'joao') THEN
          RAISE EXCEPTION 'Todo passo precisa de dono ''cliente'' ou ''joao'' (04-plano-de-acao.md §4.2) — recebido: %. Passo: %', COALESCE(v_dono, 'NULL'), v_passo->>'titulo';
        END IF;

        IF v_dono = 'cliente' THEN
          INSERT INTO jornada_passos (
            estagio_id, titulo, descricao, ordem, tipo, obrigatorio, prazo_dias, dono
          ) VALUES (
            v_estagio_id,
            v_passo->>'titulo',
            v_passo->>'descricao',
            COALESCE((v_passo->>'ordem')::int, v_passo_ordem),
            COALESCE(NULLIF(v_passo->>'tipo', ''), 'acao_livre'),
            COALESCE((v_passo->>'obrigatorio')::boolean, true),
            (v_passo->>'prazo_dias')::int,
            'cliente'
          );
        ELSE
          v_prazo := NULL;
          IF v_estagio_data_inicio IS NOT NULL THEN
            v_prazo := v_estagio_data_inicio
              + COALESCE((v_passo->>'prazo_dias')::int, v_estagio_prazo_dias, 7);
          END IF;
          INSERT INTO cs_tarefas (
            organization_id, titulo, descricao, dono, origem, jornada_id, prazo, criada_por
          ) VALUES (
            p_org_id,
            v_passo->>'titulo',
            v_passo->>'descricao',
            'joao',
            'plano',
            v_jornada_id,
            v_prazo,
            auth.uid()
          );
        END IF;

        v_passo_ordem := v_passo_ordem + 1;
      END LOOP;
    END IF;
  END LOOP;

  IF v_qtd_estagios = 0 THEN
    RAISE EXCEPTION 'Nenhum estágio válido em p_estagios.';
  END IF;

  RETURN v_jornada_id;
END;
$function$;
