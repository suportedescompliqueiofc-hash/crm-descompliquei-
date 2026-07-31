-- Duas colunas aditivas autorizadas pelo CEO (05-operacoes-e-cs/sistema/arquitetura-app-cs.md,
-- seção F, itens 2 e 4) + cs_publicar_jornada (publicar plano pelo app) +
-- cs_cliente_marcos (marcos do CRM para a linha do tempo).
--
-- Nenhum ALTER em tabela de terceiros além de duas colunas nullable em
-- jornadas/jornada_passos (ambas do próprio domínio de Jornada/CS). Nenhum
-- DROP. Escopo: supabase/migrations + src/hooks/cs (não toca páginas/componentes).

-- ═══════════════════════════════════════════════════════════════════
-- 1. Colunas aditivas
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.jornadas ADD COLUMN IF NOT EXISTS ativada_em timestamptz;

COMMENT ON COLUMN public.jornadas.ativada_em IS
  'Momento exato da transição rascunho->ativa (preenchido por cs_publicar_jornada). '
  'Distinto de created_at (quando o rascunho nasceu) e updated_at (sobrescrito por '
  'qualquer edição futura) — resolve a imprecisão apontada em '
  '05-operacoes-e-cs/sistema/arquitetura-app-cs.md, seção F item 4, para a linha '
  'do tempo mostrar "quando o plano foi publicado" com precisão. Nullable: '
  'jornadas antigas (onboarding, ou publicadas antes desta migration) ficam NULL.';

ALTER TABLE public.jornada_passos ADD COLUMN IF NOT EXISTS dono text;

ALTER TABLE public.jornada_passos
  ADD CONSTRAINT jornada_passos_dono_check
  CHECK (dono IS NULL OR dono IN ('cliente', 'joao'));

COMMENT ON COLUMN public.jornada_passos.dono IS
  'Dono da ação: ''cliente'' | ''joao'' | NULL (passos antigos, pré-migration). '
  'O método (05-operacoes-e-cs/sistema/04-plano-de-acao.md §4.2) exige dono '
  'explícito em toda ação — sem isso o plano não distingue o que o cliente '
  'executa do que é lista de tarefas do João. NA PRÁTICA, cs_publicar_jornada só '
  'grava dono=''cliente'' nesta tabela (ver COMMENT da função — passos de dono '
  '''joao'' viram cs_tarefas, não jornada_passos, porque esta tabela é lida pela '
  'tela Jornada real do cliente na plataforma principal, fora do app de CS, e '
  'esse app não pode ser alterado por este squad para filtrar por dono). O valor '
  '''joao'' segue aceito no CHECK para não travar o dado caso outra rotina (ex.: '
  'migração futura, edição direta por usuário interno) precise gravá-lo aqui.';

-- Trava adicional a nível de banco (defesa em profundidade, recomendada em
-- 05-publicar-plano.md, seção 7, Limite 1) — sem isso, só a checagem dentro de
-- cs_publicar_jornada impede duas jornadas mensais ativas na mesma org+mês.
-- Confirmado antes de criar o índice: nenhuma linha viola esta constraint hoje.
CREATE UNIQUE INDEX IF NOT EXISTS ux_jornadas_mensal_ativa_periodo
  ON public.jornadas (organization_id, (date_trunc('month', periodo_ref::timestamp)::date))
  WHERE status = 'ativa' AND tipo = 'mensal' AND organization_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. cs_publicar_jornada — publica o plano de ação mensal pelo app
--    (versão inicial; corrigida na migration seguinte, 20260731125933,
--    depois que o teste em transação revelou que perfis não tem coluna
--    created_at, e sim criado_em — mantida aqui como o histórico real do
--    que foi aplicado, CREATE OR REPLACE na sequência já resolve)
-- ═══════════════════════════════════════════════════════════════════
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

  -- Recusa duplicata: já existe jornada mensal ATIVA para esta org neste
  -- período (mês) — devolve erro claro em vez de criar uma segunda (o modelo
  -- de dados por si só tolera duas 'ativa' em paralelo, ver 05-publicar-plano.md
  -- seção 2 — quem impede aqui é esta checagem + o índice único acima).
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
  -- perfil desta clínica basta para satisfazer a FK sem afetar quem enxerga a
  -- jornada (05-publicar-plano.md, seção 2).
  SELECT p.id INTO v_user_id
  FROM perfis p
  WHERE p.organization_id = p_org_id
  ORDER BY p.created_at ASC
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
          -- Passo do cliente: publicado em jornada_passos — é o que a tela
          -- Jornada da PLATAFORMA REAL do cliente (fora do app de CS) exibe,
          -- via useJornada.ts / Jornada.tsx, filtrado só por status.
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
          -- Passo do João: ação INTERNA — nunca vai para jornada_passos
          -- (o cliente não deve vê-la, ver arquitetura-app-cs.md seção E/2).
          -- Vira cs_tarefas (dono='joao', origem='plano', jornada_id
          -- vinculado): a mesma tabela que já alimenta a lista diária do
          -- João em /cs, fechando o loop descrito em 04-plano-de-acao.md
          -- seção 5 ("a tarefa é consequência de o plano existir com aquele
          -- campo de dono preenchido — não existe lista escrita à mão em
          -- paralelo"). cs_tarefas.dono só aceita 'joao'/'claude' (CHECK já
          -- existente) — não haveria onde gravar 'cliente' ali de qualquer forma.
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

COMMENT ON FUNCTION public.cs_publicar_jornada(uuid, date, text, text, text, jsonb) IS
  'Publica o plano de ação mensal (jornada tipo=mensal, status já nasce ''ativa'' '
  '+ ativada_em=now() — chamar esta função É o ato de publicar, a aprovação do '
  'João já aconteceu antes, ver 04-plano-de-acao.md seção 11). Formato de '
  'p_estagios (jsonb array, uma posição por semana): '
  '[{"titulo":"Semana 1","descricao":"opcional","ordem":0,"prazo_dias":7,'
  '"data_inicio":"2026-08-01","passos":[{"titulo":"...","descricao":"...",'
  '"ordem":0,"tipo":"acao_livre","obrigatorio":true,"prazo_dias":3,'
  '"dono":"cliente"}]}]. Campos com default se omitidos: ordem (índice na '
  'array), prazo_dias do estágio (7), tipo do passo (''acao_livre''), '
  'obrigatorio (true). "dono" é OBRIGATÓRIO em todo passo (''cliente''|''joao'') '
  '— sem ele a função lança exceção citando o título do passo. '
  'DIVERGÊNCIA DELIBERADA da leitura literal da especificação de arquitetura '
  '(que mostra passos de dono João dentro do MESMO checklist publicado, com '
  'label de dono, na Ficha do Cliente): esta função só grava em jornada_passos '
  'os passos de dono=''cliente''. Os de dono=''joao'' viram cs_tarefas '
  '(dono=''joao'', origem=''plano'', jornada_id preenchido) em vez de '
  'jornada_passos, porque jornada_passos é a MESMA tabela lida pela tela '
  'Jornada da plataforma principal do cliente (useJornada.ts/Jornada.tsx, '
  'fora do app de CS e fora da fatia deste squad) — gravar ações internas do '
  'João ali as exporia ao cliente real, o oposto do que a arquitetura pede. '
  'A Ficha do Cliente (app de CS) recupera as ações do João pelo bloco '
  '"Tarefas deste cliente" (cs_tarefas filtrado por organization_id), não '
  'pelo bloco do Plano — reportado como divergência a decidir com o CEO: se '
  'o bloco 3 da Ficha (arquitetura-app-cs.md) precisa mesmo mostrar as ações '
  'do João junto do checklist do cliente, a correção correta é UNIR '
  'cs_plano_conteudo com cs_tarefas(origem=''plano'') no client-side ou numa '
  'RPC nova — não gravar o passo do João em jornada_passos. '
  'Recusa duplicata: erro explícito se já existir jornada tipo=mensal '
  'status=ativa para esta organização no mesmo mês (± índice único '
  'ux_jornadas_mensal_ativa_periodo como defesa em profundidade). '
  'organization_id é sempre preenchido (nunca repete o bug de criar_jornada '
  'do admin-os, que deixa a jornada visível só a um user_id).';

-- ═══════════════════════════════════════════════════════════════════
-- 3. cs_cliente_marcos — marcos do CRM para a linha do tempo (só leitura)
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.cs_cliente_marcos(p_org_id uuid)
RETURNS TABLE(
  tipo text,
  titulo text,
  descricao text,
  data date
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
  WITH primeira_venda AS (
    SELECT v.data_fechamento AS d, v.valor_fechado AS valor
    FROM vendas v
    WHERE v.organization_id = p_org_id AND v.data_fechamento IS NOT NULL
    ORDER BY v.data_fechamento ASC, v.criado_em ASC
    LIMIT 1
  ),
  primeiro_agendamento AS (
    SELECT a.data_hora_inicio::date AS d
    FROM agendamentos a
    WHERE a.organization_id = p_org_id
    ORDER BY a.data_hora_inicio ASC
    LIMIT 1
  ),
  primeira_mensagem AS (
    SELECT m.criado_em::date AS d
    FROM mensagens m
    WHERE m.organization_id = p_org_id
    ORDER BY m.criado_em ASC
    LIMIT 1
  ),
  demanda_mensal AS (
    SELECT date_trunc('month', l.criado_em)::date AS mes, count(*)::int AS qtd
    FROM leads l
    WHERE l.organization_id = p_org_id
    GROUP BY 1
  ),
  demanda_comparada AS (
    SELECT
      mes, qtd,
      lag(qtd) OVER (ORDER BY mes) AS qtd_anterior
    FROM demanda_mensal
  ),
  demanda_marcos AS (
    -- Critério de "relevante" (definido aqui, sem doc anterior que o
    -- fixasse — ver COMMENT da função para a justificativa completa):
    -- só considera o mês quando o mês ANTERIOR já teve >= 5 leads (piso de
    -- amostra — abaixo disso a variação percentual é ruído: 1->2 leads
    -- seria "+100%" sem significar nada) E a variação absoluta é >= 30%
    -- do mês anterior (salto/queda materialmente grande para uma métrica
    -- mensal, não uma flutuação normal de semana a semana).
    SELECT
      mes AS d,
      CASE WHEN qtd > qtd_anterior THEN 'salto_demanda' ELSE 'queda_demanda' END AS subtipo,
      qtd, qtd_anterior,
      round(100.0 * (qtd - qtd_anterior) / NULLIF(qtd_anterior, 0), 0) AS pct
    FROM demanda_comparada
    WHERE qtd_anterior IS NOT NULL
      AND qtd_anterior >= 5
      AND abs(qtd - qtd_anterior) >= round(0.30 * qtd_anterior)
  )
  SELECT 'primeira_venda'::text, 'Primeira venda registrada'::text,
    ('Valor: ' || COALESCE(pv.valor::text, 'não informado')), pv.d
  FROM primeira_venda pv
  UNION ALL
  SELECT 'primeiro_agendamento'::text, 'Primeiro agendamento registrado'::text, NULL::text, pa.d
  FROM primeiro_agendamento pa
  UNION ALL
  SELECT 'primeira_mensagem'::text, 'Primeira mensagem registrada'::text, NULL::text, pm.d
  FROM primeira_mensagem pm
  UNION ALL
  SELECT
    dm.subtipo,
    CASE WHEN dm.subtipo = 'salto_demanda' THEN 'Salto de demanda no mês' ELSE 'Queda de demanda no mês' END,
    (dm.qtd_anterior::text || ' → ' || dm.qtd::text || ' leads (' || CASE WHEN dm.pct > 0 THEN '+' ELSE '' END || dm.pct::text || '%)'),
    dm.d
  FROM demanda_marcos dm
  ORDER BY 4 DESC NULLS LAST;
END;
$function$;

COMMENT ON FUNCTION public.cs_cliente_marcos(uuid) IS
  'Marcos derivados do dado operacional do cliente para alimentar a linha do '
  'tempo (arquitetura-app-cs.md, seção C/F item 5) — só leitura de '
  'vendas/agendamentos/mensagens/leads, nenhuma escrita. Devolve zero ou mais '
  'linhas, nunca erro. Marcos cobertos: primeira_venda (min(data_fechamento) '
  'em vendas), primeiro_agendamento (min(data_hora_inicio) em agendamentos), '
  'primeira_mensagem (min(criado_em) em mensagens), e salto_demanda/'
  'queda_demanda (variação mês a mês de count(leads) por criado_em). '
  'CRITÉRIO DE "RELEVANTE" PARA DEMANDA (definido nesta migration, não '
  'importado de nenhum documento anterior — proposta-novos-elos.md e '
  'diagnostico-automacoes.md não fixam um limiar para variação mensal de '
  'Demanda): (1) piso de amostra — só compara quando o MÊS ANTERIOR teve >= 5 '
  'leads; abaixo disso a % é dominada por ruído de número pequeno (1->2 '
  'leads leria como "+100%" sem nenhum significado prático); (2) magnitude — '
  'só marca quando a variação absoluta é >= 30% do mês anterior, patamar '
  'escolhido por ser grande o suficiente para não capturar a oscilação '
  'normal de mês a mês de uma clínica pequena (que gira na casa de 10-20% '
  'com frequência) e pequeno o suficiente para não perder quedas/saltos que '
  'de fato merecem virar assunto de conversa com o cliente. Este limiar é '
  'uma escolha de bom senso deste squad, não uma constante validada '
  'estatisticamente contra a carteira real — se o CEO observar falsos '
  'positivos/negativos na prática, é o primeiro parâmetro a recalibrar. Não '
  'inclui variação semanal nem de outros elos (fora do pedido desta rodada). '
  'Complementa cs_cliente_timeline (que já cobre primeira_venda e outros '
  'eventos) — decisão de unir os dois num único feed é do consumidor '
  '(client-side ou RPC futura), não desta função.';
