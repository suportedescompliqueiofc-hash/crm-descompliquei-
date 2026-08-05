-- ============================================================================
-- REMOÇÃO COMPLETA DO ARSENAL — Ferramentas + Aulas (drop total da feature)
-- ============================================================================
-- ⚠️  NÃO RODAR AINDA — irreversível. Conferir os backups (tabelas `*_bkp`
--     criadas abaixo) antes e depois de aplicar. Esta migration substitui o
--     rascunho anterior `_PENDENTE_20260706_drop_arsenal_ferramentas.sql`
--     (que preservava as tabelas de Aulas) — aqui o Arsenal inteiro sai,
--     Ferramentas E Aulas.
--
-- PRÉ-REQUISITOS (cumprir ANTES de rodar este SQL):
--   1. Edge function `descompliquei-os` já deployada (via CLI) SEM nenhuma
--      dependência das tabelas `arsenal_*` — remover tools/handlers que
--      leem/escrevem `arsenal_ferramentas`, `arsenal_categorias`,
--      `arsenal_progresso`, `arsenal_construcoes`, `arsenal_materiais`,
--      `arsenal_templates`, `arsenal_blocos`, `arsenal_aulas`,
--      `arsenal_aulas_progresso` (inclui a tool `criar_jornada`, que hoje
--      resolve `ferramenta_slug`/`aula_slug` contra `slugMap`/`aulaSlugMap`).
--   2. Edge function `admin-os` já deployada SEM dependência dessas tabelas
--      (painéis admin de Arsenal/Aulas).
--   3. Front-end já mergeado/deployado sem telas que consultem `arsenal_*`
--      (`Arsenal.tsx`, `ArsenalAula.tsx`, `ArsenalFerramenta.tsx`,
--      `AdminArsenal.tsx`, `AdminArsenalAulas.tsx`, hooks `useArsenalAulas`,
--      `useAdminArsenal`, referências em `Jornada.tsx`/`useJornada.ts` e no
--      editor `AdminJornadaEditor.tsx`) e sem o toggle "acesso_arsenal" em
--      `AdminProdutos`.
--   4. Confirmar com `list_tables`/`get_advisors` (fora deste SQL) que nada
--      mais no banco (views, functions, triggers) referencia `arsenal_*`.
-- ============================================================================

begin;

-- ── 1. BACKUP no próprio banco (snapshot das 9 tabelas de Arsenal) ─────────
create table if not exists arsenal_categorias_bkp       as select * from arsenal_categorias;
create table if not exists arsenal_ferramentas_bkp       as select * from arsenal_ferramentas;
create table if not exists arsenal_progresso_bkp         as select * from arsenal_progresso;
create table if not exists arsenal_construcoes_bkp       as select * from arsenal_construcoes;
create table if not exists arsenal_materiais_bkp         as select * from arsenal_materiais;
create table if not exists arsenal_templates_bkp         as select * from arsenal_templates;
create table if not exists arsenal_blocos_bkp            as select * from arsenal_blocos;
create table if not exists arsenal_aulas_bkp             as select * from arsenal_aulas;
create table if not exists arsenal_aulas_progresso_bkp   as select * from arsenal_aulas_progresso;

-- snapshot das colunas FK que serão zeradas/removidas (para poder auditar depois)
create table if not exists jornada_passos_arsenal_bkp as
  select id, ferramenta_id, categoria_id, aula_id from jornada_passos
  where ferramenta_id is not null or categoria_id is not null or aula_id is not null;
create table if not exists meus_materiais_arsenal_bkp as
  select id, categoria_arsenal_id, ferramenta_id from meus_materiais
  where categoria_arsenal_id is not null or ferramenta_id is not null;

-- ── 2. Zerar FKs nas tabelas que PERMANECEM (Jornada e Materiais) ──────────
update jornada_passos set ferramenta_id = null, categoria_id = null, aula_id = null
  where ferramenta_id is not null or categoria_id is not null or aula_id is not null;
update meus_materiais set categoria_arsenal_id = null, ferramenta_id = null
  where categoria_arsenal_id is not null or ferramenta_id is not null;

-- ── 3. Dropar as 9 tabelas de Arsenal (dependentes primeiro; CASCADE cobre FKs internas) ──
drop table if exists arsenal_progresso        cascade;
drop table if exists arsenal_construcoes      cascade;
drop table if exists arsenal_materiais        cascade;
drop table if exists arsenal_templates        cascade;
drop table if exists arsenal_ferramentas      cascade;
drop table if exists arsenal_categorias       cascade;
drop table if exists arsenal_aulas_progresso  cascade;
drop table if exists arsenal_aulas            cascade;
drop table if exists arsenal_blocos           cascade;

-- ── 4. Remover flag de acesso ao Arsenal em platform_products ──────────────
alter table platform_products drop column if exists acesso_arsenal;

commit;

-- ── 5. Pós-drop (fora do escopo deste SQL) ─────────────────────────────────
--   • Rodar `get_advisors` (RLS/segurança) logo após o drop para conferir que
--     nada ficou órfão (policies, triggers, views apontando para tabelas que
--     não existem mais).
--   • Quando validado (tempo de segurança combinado), dropar manualmente as
--     tabelas `*_bkp` criadas no passo 1 (incluindo
--     `jornada_passos_arsenal_bkp` e `meus_materiais_arsenal_bkp`).
-- ============================================================================
