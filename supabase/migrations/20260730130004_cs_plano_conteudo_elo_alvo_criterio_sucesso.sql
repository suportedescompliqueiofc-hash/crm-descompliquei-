-- cs_plano_conteudo (20260730120001) não devolvia elo_alvo/criterio_sucesso de
-- jornadas (colunas adicionadas em 20260730130000) — a tela de Plano não tinha
-- como mostrar qual elo o mês ataca nem qual número define sucesso. Esta
-- migration só ACRESCENTA 2 colunas no final do retorno (jornada_elo_alvo,
-- jornada_criterio_sucesso); as 14 colunas anteriores continuam com os mesmos
-- nomes, mesma ordem, mesmo comportamento — hooks e tela que já consomem por
-- nome não quebram.
--
-- Postgres não permite CREATE OR REPLACE mudar o RETURNS TABLE (colunas
-- novas) de uma função existente — exige DROP antes. cs_plano_conteudo é
-- função própria deste squad (não é objeto de terceiro), então o
-- DROP FUNCTION + CREATE FUNCTION abaixo está dentro do escopo autorizado.
DROP FUNCTION IF EXISTS public.cs_plano_conteudo(uuid, date);

CREATE FUNCTION public.cs_plano_conteudo(p_org_id uuid, p_periodo date)
RETURNS TABLE(
  jornada_id uuid,
  jornada_titulo text,
  jornada_status text,
  estagio_id uuid,
  estagio_titulo text,
  estagio_ordem int,
  passo_id uuid,
  passo_titulo text,
  passo_descricao text,
  passo_ordem int,
  passo_tipo text,
  obrigatorio boolean,
  concluido boolean,
  concluido_em timestamptz,
  jornada_elo_alvo text,
  jornada_criterio_sucesso text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
#variable_conflict use_column
DECLARE
  v_jornada_id uuid;
BEGIN
  IF NOT (is_super_admin() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT j.id INTO v_jornada_id
  FROM jornadas j
  WHERE j.organization_id = p_org_id
    AND j.tipo = 'mensal'
    AND j.status IN ('ativa', 'concluida')
    AND date_trunc('month', j.periodo_ref) = date_trunc('month', p_periodo)
  ORDER BY j.created_at DESC, j.id DESC
  LIMIT 1;

  IF v_jornada_id IS NULL THEN
    RETURN; -- nenhum plano no período: zero linhas, sem erro
  END IF;

  RETURN QUERY
  SELECT
    j.id, j.titulo, j.status,
    e.id, e.titulo, e.ordem,
    p.id, p.titulo, p.descricao, p.ordem, p.tipo, p.obrigatorio,
    p.concluido, p.concluido_em,
    j.elo_alvo, j.criterio_sucesso
  FROM jornadas j
  JOIN jornada_estagios e ON e.jornada_id = j.id
  JOIN jornada_passos p ON p.estagio_id = e.id
  WHERE j.id = v_jornada_id
    AND j.organization_id = p_org_id
  ORDER BY e.ordem, p.ordem;
END;
$function$;

COMMENT ON FUNCTION public.cs_plano_conteudo(uuid, date) IS
  'Conteúdo do plano mensal (títulos, descrição, tipo de cada passo) para a '
  'tela /plano/:orgId, que hoje só tinha os números de cs_aderencia. Mesmo '
  'universo de jornadas de cs_aderencia (tipo=mensal, status ativa/concluida) '
  'para o conteúdo bater com o percentual. Desempate se houver >1 jornada no '
  'mesmo período: pega só a mais recente por created_at (id como desempate '
  'final) — não concatena. cs_aderencia, ao contrário, agrega passos de TODAS '
  'as jornadas que baterem no filtro; no caso raro de duas jornadas mensais '
  'coexistindo, o total pode divergir — ver COMMENT completo no bloco da '
  'função. jornada_elo_alvo e jornada_criterio_sucesso (adicionadas em '
  '20260730130004, lidas de jornadas.elo_alvo/criterio_sucesso — colunas '
  'adicionadas em 20260730130000): são valores de NÍVEL DE JORNADA (o plano '
  'do mês inteiro), não de estágio nem de passo — por isso se REPETEM '
  'idênticos em toda linha retornada (formato longo, uma linha por passo). '
  'Isso é esperado, não é bug. Ambas nullable: NULL até que um fechamento '
  '(/cs-mes) declare o elo e o critério do mês.';
