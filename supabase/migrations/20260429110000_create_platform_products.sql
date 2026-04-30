-- Tabela de produtos (planos configuráveis pelo admin)
CREATE TABLE platform_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC DEFAULT 0,
  duracao_dias INTEGER DEFAULT 30,

  -- Acesso à trilha (pilares)
  pilares_liberados UUID[] DEFAULT '{}',

  -- Acesso às IAs da plataforma
  ias_liberadas TEXT[] DEFAULT '{}',

  -- Funcionalidades do sistema
  acesso_cerebro BOOLEAN DEFAULT false,
  acesso_crm BOOLEAN DEFAULT false,
  acesso_sessoes_taticas BOOLEAN DEFAULT false,
  acesso_materiais BOOLEAN DEFAULT false,
  acesso_ia_comercial BOOLEAN DEFAULT false,

  -- Limites
  max_leads INTEGER DEFAULT 500,
  max_usuarios_crm INTEGER DEFAULT 3,

  -- Controle
  ativo BOOLEAN DEFAULT true,
  ordem_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar coluna product_id em platform_tenants para vincular produto ao cliente
ALTER TABLE platform_tenants
ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES platform_products(id),
ADD COLUMN IF NOT EXISTS access_starts_at TIMESTAMPTZ DEFAULT NOW();

-- RLS: apenas service_role e admins podem manipular produtos
ALTER TABLE platform_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON platform_products
  USING (true) WITH CHECK (true);

-- Inserir produtos iniciais baseados nos planos existentes (pca e gca)
INSERT INTO platform_products (nome, descricao, preco_mensal, duracao_dias, pilares_liberados, ias_liberadas, acesso_cerebro, acesso_crm, acesso_sessoes_taticas, acesso_materiais, acesso_ia_comercial, max_leads, max_usuarios_crm, ordem_index)
VALUES
(
  'P.C.A. — Performance Comercial Avançada',
  'Acesso ao Motor Comercial e Fundação Clínica, IAs de conversão e CRM.',
  997, 30,
  ARRAY['dbed0140-2823-40da-829e-613b20d6394d'::UUID, '2aaf1dbb-7190-403e-a05c-43584d9b6771'::UUID],
  ARRAY['analysis','followup','objections','preattendance','remarketing'],
  false, true, true, true, true,
  500, 3, 1
),
(
  'G.C.A. — Gestão Clínica Avançada',
  'Acesso completo: todos os pilares, todas as IAs, Cérebro e CRM.',
  1997, 30,
  ARRAY['dbed0140-2823-40da-829e-613b20d6394d'::UUID, '66e3db65-2a15-4688-8409-dc152fbfa5b4'::UUID, '2aaf1dbb-7190-403e-a05c-43584d9b6771'::UUID],
  ARRAY['analysis','campaign','content','creative','followup','objections','preattendance','remarketing'],
  true, true, true, true, true,
  2000, 10, 2
);
