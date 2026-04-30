-- ============================================================
-- PLATAFORMA DE APRENDIZADO — Hub de Gestão Comercial
-- Prefixo: platform_ | Projeto: noncbgdczgcboronmcah
-- Execute no SQL Editor do Supabase:
-- https://supabase.com/dashboard/project/noncbgdczgcboronmcah/sql/new
-- ============================================================

-- ─────────────────────────────────────────────
-- FUNÇÃO GENÉRICA PARA updated_at
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION platform_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────
-- 1. platform_users
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL CHECK (plan IN ('gca', 'pca')),
  clinic_name         TEXT,
  specialty           TEXT,
  cerebro_complete    BOOLEAN DEFAULT false,
  onboarding_complete BOOLEAN DEFAULT false,
  crm_user_id         UUID,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER platform_users_updated_at
  BEFORE UPDATE ON platform_users
  FOR EACH ROW EXECUTE FUNCTION platform_set_updated_at();

-- ─────────────────────────────────────────────
-- 2. platform_modules
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_modules (
  id               TEXT PRIMARY KEY,
  pillar           INT NOT NULL CHECK (pillar IN (1, 2, 3)),
  title            TEXT NOT NULL,
  description      TEXT,
  video_url        TEXT,
  duration_minutes INT,
  min_plan         TEXT DEFAULT 'pca' CHECK (min_plan IN ('pca', 'gca')),
  order_index      INT NOT NULL,
  active           BOOLEAN DEFAULT true
);

-- ─────────────────────────────────────────────
-- 3. platform_progress
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  module_id    TEXT NOT NULL REFERENCES platform_modules(id),
  completed    BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);

-- ─────────────────────────────────────────────
-- 4. platform_cerebro
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_cerebro (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL UNIQUE REFERENCES platform_users(id) ON DELETE CASCADE,
  specialty_preset  TEXT,
  anchor_procedure  TEXT,
  procedures        JSONB DEFAULT '[]',
  icp               JSONB DEFAULT '{}',
  differentials     TEXT,
  voice_tone        TEXT CHECK (voice_tone IN ('tecnica', 'acolhedora', 'premium')),
  working_hours     TEXT,
  payment_methods   TEXT,
  faq               JSONB DEFAULT '[]',
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER platform_cerebro_updated_at
  BEFORE UPDATE ON platform_cerebro
  FOR EACH ROW EXECUTE FUNCTION platform_set_updated_at();

-- ─────────────────────────────────────────────
-- 5. platform_ia_history
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_ia_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES platform_users(id) ON DELETE CASCADE,
  ia_type     TEXT NOT NULL,
  input_text  TEXT,
  output_text TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- ─────────────────────────────────────────────
-- 6. platform_sessoes_taticas
-- ─────────────────────────────────────────────
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

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE platform_users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_modules         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_progress        ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_cerebro         ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_ia_history      ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_sessoes_taticas ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────
-- platform_users — lê/edita apenas o próprio
-- ─────────────────────────────────────────────
CREATE POLICY "platform_users_select_own"
  ON platform_users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "platform_users_insert_own"
  ON platform_users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "platform_users_update_own"
  ON platform_users FOR UPDATE
  USING (auth.uid() = id);

-- ─────────────────────────────────────────────
-- platform_modules — SELECT para todos autenticados
-- ─────────────────────────────────────────────
CREATE POLICY "platform_modules_select_authenticated"
  ON platform_modules FOR SELECT
  USING (auth.role() = 'authenticated');

-- ─────────────────────────────────────────────
-- platform_progress — lê/edita apenas o próprio
-- ─────────────────────────────────────────────
CREATE POLICY "platform_progress_select_own"
  ON platform_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "platform_progress_insert_own"
  ON platform_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "platform_progress_update_own"
  ON platform_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- platform_cerebro — lê/edita apenas o próprio
-- ─────────────────────────────────────────────
CREATE POLICY "platform_cerebro_select_own"
  ON platform_cerebro FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "platform_cerebro_insert_own"
  ON platform_cerebro FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "platform_cerebro_update_own"
  ON platform_cerebro FOR UPDATE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- platform_ia_history — lê/escreve apenas o próprio
-- ─────────────────────────────────────────────
CREATE POLICY "platform_ia_history_select_own"
  ON platform_ia_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "platform_ia_history_insert_own"
  ON platform_ia_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- platform_sessoes_taticas — SELECT para todos autenticados
-- ─────────────────────────────────────────────
CREATE POLICY "platform_sessoes_select_authenticated"
  ON platform_sessoes_taticas FOR SELECT
  USING (auth.role() = 'authenticated');
