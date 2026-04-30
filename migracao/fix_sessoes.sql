-- 1. Garante que a tabela existe com as colunas certas
CREATE TABLE IF NOT EXISTS platform_sessoes_taticas (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  type           TEXT CHECK (type IN ('comercial', 'demanda')),
  scheduled_at   TIMESTAMPTZ,
  meet_link      TEXT,
  recording_url  TEXT,
  description    TEXT,
  active         BOOLEAN DEFAULT true
);

-- 2. Habilita RLS
ALTER TABLE platform_sessoes_taticas ENABLE ROW LEVEL SECURITY;

-- 3. Remove políticas antigas para evitar conflito
DROP POLICY IF EXISTS "platform_sessoes_select_authenticated" ON platform_sessoes_taticas;
DROP POLICY IF EXISTS "platform_sessoes_admin_all" ON platform_sessoes_taticas;

-- 4. Cria política de LEITURA para todos os alunos
CREATE POLICY "platform_sessoes_select_authenticated"
  ON platform_sessoes_taticas FOR SELECT
  USING (auth.role() = 'authenticated');

-- 5. Cria política de TUDO para o Super Admin
CREATE POLICY "platform_sessoes_admin_all"
  ON platform_sessoes_taticas FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios_papeis WHERE usuario_id = auth.uid() AND papel = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM usuarios_papeis WHERE usuario_id = auth.uid() AND papel = 'admin'));

-- 6. Insere uma sessão de teste (opcional)
INSERT INTO platform_sessoes_taticas (title, type, scheduled_at, description, active)
VALUES ('Boas-vindas à Mentoria', 'comercial', now() + interval '1 day', 'Sessão inaugural da plataforma.', true)
ON CONFLICT DO NOTHING;
