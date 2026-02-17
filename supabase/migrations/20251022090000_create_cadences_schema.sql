-- Tabela de Fluxos de Cadência
CREATE TABLE public.cadencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Passos da Cadência
CREATE TABLE public.cadencia_passos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cadencia_id UUID NOT NULL REFERENCES public.cadencias(id) ON DELETE CASCADE,
  posicao_ordem INTEGER NOT NULL,
  tempo_espera INTEGER NOT NULL DEFAULT 1,
  unidade_tempo TEXT NOT NULL DEFAULT 'dias', -- 'minutos', 'horas', 'dias'
  tipo_mensagem TEXT NOT NULL DEFAULT 'texto', -- 'texto', 'audio', 'imagem', 'video', 'pdf'
  conteudo TEXT,
  arquivo_path TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Controle de Execução (Leads no Fluxo)
CREATE TABLE public.lead_cadencias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  cadencia_id UUID NOT NULL REFERENCES public.cadencias(id) ON DELETE CASCADE,
  passo_atual_ordem INTEGER DEFAULT 0,
  status TEXT DEFAULT 'ativo', -- 'ativo', 'concluido', 'pausado'
  proxima_execucao TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(lead_id, cadencia_id)
);

-- Ativar RLS
ALTER TABLE public.cadencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadencia_passos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_cadencias ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
CREATE POLICY "Cadencias Org Access" ON public.cadencias FOR ALL TO authenticated USING (organization_id = get_my_org_id());

CREATE POLICY "Passos Org Access" ON public.cadencia_passos FOR ALL TO authenticated 
USING (cadencia_id IN (SELECT id FROM public.cadencias WHERE organization_id = get_my_org_id()));

CREATE POLICY "Lead Cadencias Org Access" ON public.lead_cadencias FOR ALL TO authenticated USING (organization_id = get_my_org_id());