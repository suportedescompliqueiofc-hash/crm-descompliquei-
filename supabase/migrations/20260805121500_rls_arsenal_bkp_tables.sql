-- ============================================================================
-- RLS nas tabelas de backup do drop do Arsenal (20260805120000)
-- ============================================================================
-- As tabelas *_bkp criadas pelo backup do drop do Arsenal nasceram sem RLS
-- (CREATE TABLE AS SELECT não herda RLS da tabela de origem) — ficaram
-- expostas à chave anon/authenticated via Supabase client. São snapshots
-- internos de auditoria; nenhuma tela do app as consulta. Habilita RLS sem
-- nenhuma policy — bloqueia acesso via client SDK por completo, sem quebrar
-- nada em uso.
-- ============================================================================

alter table public.arsenal_categorias_bkp        enable row level security;
alter table public.arsenal_ferramentas_bkp       enable row level security;
alter table public.arsenal_progresso_bkp         enable row level security;
alter table public.arsenal_construcoes_bkp       enable row level security;
alter table public.arsenal_materiais_bkp         enable row level security;
alter table public.arsenal_templates_bkp         enable row level security;
alter table public.arsenal_blocos_bkp            enable row level security;
alter table public.arsenal_aulas_bkp             enable row level security;
alter table public.arsenal_aulas_progresso_bkp   enable row level security;
alter table public.jornada_passos_arsenal_bkp    enable row level security;
alter table public.meus_materiais_arsenal_bkp    enable row level security;
