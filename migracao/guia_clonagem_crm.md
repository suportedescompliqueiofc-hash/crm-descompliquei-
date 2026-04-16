# 🚀 Guia Completo de Clonagem — CRM VR Concept

> **Este guia foi gerado por análise profunda e automatizada do projeto atual.**  
> Cole cada bloco SQL no **SQL Editor** do **novo projeto Supabase**, em ordem.  
> Não pule nenhuma etapa. Cada seção depende da anterior.

---

## ⚙️ INFORMAÇÕES DO PROJETO ORIGINAL

- **Nome:** CRM Vr Concept  
- **ID Supabase:** `izhbmjqyoglagooosmoc`  
- **Região:** `sa-east-1` (São Paulo)  
- **Postgres:** 17.x  

---

## 📋 CHECKLIST GERAL

- [ ] 1. Criar novo projeto Supabase (mesma região `sa-east-1`)
- [ ] 2. Executar o **SQL Completo** (Etapas 1 a 10 abaixo)
- [ ] 3. Criar as **11 Edge Functions** (ver arquivo `edge_functions_completas.md`)
- [ ] 4. Criar **Cron Job** (com a URL do NOVO projeto)
- [ ] 5. Configurar **variáveis de ambiente** no frontend (novo SUPABASE_URL e ANON_KEY)
- [ ] 6. Atualizar **URLs de webhooks** nas Edge Functions para o novo ambiente
- [ ] 7. Cadastrar primeiro usuário (o trigger criará a org automaticamente)

---

## 🗄️ SQL COMPLETO — COLE NO SQL EDITOR DO NOVO PROJETO

### ETAPA 1 — EXTENSÕES

```sql
-- Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "vector";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
```

---

### ETAPA 2 — TIPOS ENUM CUSTOMIZADOS

```sql
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
        CREATE TYPE public.app_role AS ENUM ('admin', 'atendente', 'dentista', 'visualizador');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
        CREATE TYPE public.campaign_status AS ENUM ('draft', 'active', 'scheduled', 'completed', 'paused');
    END IF;
END $$;
```

---

### ETAPA 3 — TABELAS BASE (na ordem correta para respeitar FKs)

```sql
-- ============================================================
-- 3.1 ORGANIZATIONS (base de tudo, sem dependências)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.2 PERFIS (depende de auth.users e organizations)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfis (
    id UUID NOT NULL PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    nome_completo TEXT,
    url_avatar TEXT,
    telefone TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT perfis_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- ============================================================
-- 3.3 USUÁRIOS PAPEIS (depende de auth.users)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.usuarios_papeis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    papel public.app_role NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.4 CONFIGURAÇÕES DA CLÍNICA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.configuracoes_clinica (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    nome TEXT NOT NULL,
    cnpj TEXT,
    email TEXT,
    telefone TEXT,
    endereco JSONB,
    url_logo TEXT,
    fuso_horario TEXT DEFAULT 'America/Sao_Paulo',
    formato_data TEXT DEFAULT 'DD/MM/YYYY',
    moeda TEXT DEFAULT 'BRL',
    horario_funcionamento JSONB,
    mensagem_ausencia TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.5 ETAPAS DO PIPELINE (sem FK de org, é global)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.etapas (
    id SERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    cor TEXT NOT NULL,
    posicao_ordem INTEGER,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    em_funil BOOLEAN DEFAULT true
);

-- ============================================================
-- 3.6 FONTES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.fontes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    nome TEXT NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.7 TAGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    color TEXT DEFAULT 'slate',
    label_lid TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.8 CRIATIVOS (para marketing/ads)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.criativos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    nome TEXT,
    titulo TEXT,
    conteudo TEXT,
    url_midia TEXT,
    url_thumbnail TEXT,
    plataforma TEXT,
    aplicativo TEXT,
    id_externo TEXT,
    platform_metrics JSONB DEFAULT '{}'::jsonb,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.9 LEADS (depende de organizations, auth.users, criativos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    criativo_id UUID REFERENCES public.criativos(id),
    nome TEXT,
    telefone TEXT NOT NULL,
    email TEXT,
    cpf TEXT,
    idade INTEGER,
    data_nascimento DATE,
    genero TEXT,
    endereco TEXT,
    queixa_principal TEXT,
    origem TEXT,
    fonte TEXT,
    status TEXT DEFAULT 'Ativo',
    resumo TEXT,
    ultimo_contato TIMESTAMP WITH TIME ZONE,
    agendamento TIMESTAMP WITH TIME ZONE,
    ia_ativa BOOLEAN DEFAULT true,
    ia_paused_until TIMESTAMP WITH TIME ZONE,
    procedimento_interesse TEXT,
    posicao_pipeline INTEGER DEFAULT 1,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.10 LEADS_TAGS (pivot de leads e tags)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.leads_tags (
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (lead_id, tag_id)
);

-- ============================================================
-- 3.11 MENSAGENS (chat do WhatsApp)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.mensagens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id),
    user_id UUID REFERENCES auth.users(id),
    conteudo TEXT,
    direcao TEXT NOT NULL,
    remetente TEXT NOT NULL,
    tipo_conteudo TEXT DEFAULT 'texto',
    media_path TEXT,
    id_mensagem TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.12 ANEXOS DE MENSAGENS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES public.mensagens(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.13 VENDAS / FECHAMENTOS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    lead_id UUID NOT NULL REFERENCES public.leads(id),
    usuario_id UUID REFERENCES auth.users(id),
    valor_orcado NUMERIC,
    data_orcamento DATE,
    valor_fechado NUMERIC NOT NULL,
    data_fechamento DATE DEFAULT CURRENT_DATE,
    forma_pagamento TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.14 GASTOS DE MARKETING
-- ============================================================
CREATE TABLE IF NOT EXISTS public.marketing_expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    amount NUMERIC NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.15 CAMPANHAS DE DISPARO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.campanhas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    nome TEXT NOT NULL,
    descricao TEXT,
    status public.campaign_status DEFAULT 'draft',
    segmento TEXT,
    segmento_config JSONB,
    targeted_lead_ids JSONB,
    template_mensagem TEXT NOT NULL,
    media_url TEXT,
    data_agendamento TIMESTAMP WITH TIME ZONE,
    intervalo_segundos INTEGER DEFAULT 300,
    contagem_destinatarios INTEGER DEFAULT 0,
    contagem_enviados INTEGER DEFAULT 0,
    contagem_visualizados INTEGER DEFAULT 0,
    contagem_respostas INTEGER DEFAULT 0,
    contagem_conversoes INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.16 ATIVIDADES / LOG DE AÇÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.atividades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    lead_id UUID REFERENCES public.leads(id),
    campanha_id UUID REFERENCES public.campanhas(id),
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    metadados JSONB,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.17 INTEGRAÇÔES (WhatsApp, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.integracoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    tipo TEXT NOT NULL,
    nome TEXT NOT NULL,
    status TEXT DEFAULT 'inactive',
    credenciais JSONB,
    configuracoes JSONB,
    ultima_sincronizacao TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.18 TEMPLATES DE MENSAGEM
-- ============================================================
CREATE TABLE IF NOT EXISTS public.templates_mensagem (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID REFERENCES public.organizations(id),
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    variaveis JSONB DEFAULT '[]'::jsonb,
    esta_ativo BOOLEAN DEFAULT true,
    contagem_uso INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.19 MENSAGENS RÁPIDAS (respostas salvas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.quick_message_folders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    name TEXT NOT NULL,
    color TEXT DEFAULT '#000000',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    position INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.mensagens_rapidas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id),
    titulo TEXT NOT NULL,
    conteudo TEXT,
    tipo TEXT NOT NULL,
    arquivo_path TEXT,
    folder_id UUID REFERENCES public.quick_message_folders(id) ON DELETE SET NULL,
    position INTEGER DEFAULT 0,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.20 NOTIFICAÇÕES (push/in-app)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    lead_id UUID REFERENCES public.leads(id),
    mensagem TEXT NOT NULL,
    status TEXT DEFAULT 'pendente',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.21 AI PROMPTS POR ORGANIZAÇÃO
-- ============================================================
CREATE TABLE IF NOT EXISTS public.organization_ai_prompts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    prompt TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.22 MEMÓRIA DO AGENTE IA (n8n sessions) -- MANTER IGUAL
-- ============================================================
CREATE TABLE IF NOT EXISTS public.memoria_agente_moncao (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR NOT NULL,
    message JSONB NOT NULL
);

-- ============================================================
-- 3.23 HISTÓRICO DE ESTÁGIO DO LEAD
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_stage_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    stage_position INTEGER NOT NULL,
    entered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.24 CADÊNCIAS (sequências de follow-up automático)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cadencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.cadencia_passos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cadencia_id UUID NOT NULL REFERENCES public.cadencias(id) ON DELETE CASCADE,
    posicao_ordem INTEGER NOT NULL,
    tempo_espera INTEGER NOT NULL DEFAULT 1,
    unidade_tempo TEXT NOT NULL DEFAULT 'dias',
    tipo_mensagem TEXT NOT NULL DEFAULT 'texto',
    conteudo TEXT,
    arquivo_path TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.lead_cadencias (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    cadencia_id UUID NOT NULL REFERENCES public.cadencias(id) ON DELETE CASCADE,
    passo_atual_ordem INTEGER DEFAULT 0,
    status TEXT DEFAULT 'ativo',
    proxima_execucao TIMESTAMP WITH TIME ZONE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ultima_execucao TIMESTAMP WITH TIME ZONE,
    status_ultima_execucao TEXT,
    erro_log TEXT,
    CONSTRAINT lead_cadencia_unique UNIQUE (lead_id, cadencia_id)
);

CREATE TABLE IF NOT EXISTS public.cadencia_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    cadencia_id UUID NOT NULL REFERENCES public.cadencias(id) ON DELETE CASCADE,
    passo_ordem INTEGER NOT NULL,
    status TEXT NOT NULL,
    mensagem_erro TEXT,
    enviado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.25 CHAT INTERNO COM IA
-- ============================================================
CREATE TABLE IF NOT EXISTS public.internal_ai_chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    cadencia_gerada_id UUID REFERENCES public.cadencias(id) ON DELETE SET NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- 3.26 DOCUMENTOS (RAG para IA)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT,
    metadata JSONB,
    embedding vector(1536)
);

-- ============================================================
-- 3.27 CLIENTES (painel de gestão de contas, se usado)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.squads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    descricao TEXT,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT,
    tipo TEXT,
    segmento TEXT,
    documento TEXT,
    email TEXT,
    telefone TEXT,
    whatsapp TEXT,
    instagram TEXT,
    data_inicio DATE,
    duracao_meses INTEGER DEFAULT 3,
    mes_atual INTEGER DEFAULT 1,
    tem_bonus BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'prospeccao',
    endereco_completo TEXT,
    cidade TEXT,
    estado TEXT,
    cep TEXT,
    observacoes TEXT,
    particularidades TEXT,
    avatar_url TEXT,
    squad_id UUID REFERENCES public.squads(id),
    customer_success_id UUID REFERENCES auth.users(id),
    gestor_trafego_id UUID REFERENCES auth.users(id),
    dev_id UUID REFERENCES auth.users(id),
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletado_em TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS public.entregaveis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES public.clientes(id),
    pilar TEXT,
    categoria TEXT,
    subcategoria TEXT,
    titulo TEXT NOT NULL,
    descricao TEXT,
    responsavel_id UUID REFERENCES auth.users(id),
    status TEXT DEFAULT 'pendente',
    data_inicio DATE,
    data_prevista DATE,
    data_conclusao DATE,
    prioridade TEXT DEFAULT 'media',
    progresso INTEGER DEFAULT 0,
    mes_relacionado INTEGER,
    metadados JSONB DEFAULT '{}'::jsonb,
    observacoes TEXT,
    checklist JSONB DEFAULT '[]'::jsonb,
    criado_por UUID REFERENCES auth.users(id),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    deletado_em TIMESTAMP WITH TIME ZONE
);
```

---

### ETAPA 4 — ÍNDICES

```sql
-- Índice de performance para busca de mensagens por lead
CREATE INDEX IF NOT EXISTS idx_mensagens_lead_criado_at 
ON public.mensagens(lead_id, criado_em DESC);
```

---

### ETAPA 5 — FUNÇÕES PL/pgSQL

```sql
-- ============================================================
-- 5.1 Função: atualizar timestamp automático
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 5.2 Função: pegar org_id do usuário logado (usada nas RLS)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_org_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT organization_id FROM public.perfis WHERE id = auth.uid() LIMIT 1;
$$;

-- ============================================================
-- 5.3 Função: checar se usuário tem papel específico
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (SELECT 1 FROM public.usuarios_papeis WHERE usuario_id = _user_id AND papel = _role);
$$;

-- ============================================================
-- 5.4 Função: criação automática de org + perfil + papel admin
--     ao registrar novo usuário (trigger no auth.users)
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  target_org_id UUID;
BEGIN
  INSERT INTO public.organizations (name)
  VALUES (COALESCE(NEW.raw_user_meta_data->>'full_name', 'Minha') || '''s Clínica')
  RETURNING id INTO target_org_id;

  INSERT INTO public.perfis (id, nome_completo, organization_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'Novo Usuário'), target_org_id);

  INSERT INTO public.usuarios_papeis (usuario_id, papel)
  VALUES (NEW.id, 'admin');

  RETURN NEW;
END;
$$;

-- ============================================================
-- 5.5 Função: reordenar etapas do pipeline (admin only)
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_stages_order(stages_data JSONB)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  stage_record RECORD;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.usuarios_papeis
    WHERE usuario_id = auth.uid() AND papel = 'admin'
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores podem reordenar etapas.';
  END IF;

  FOR stage_record IN SELECT * FROM jsonb_to_recordset(stages_data) AS x(id INT, posicao_ordem INT)
  LOOP
    UPDATE public.etapas
    SET posicao_ordem = stage_record.posicao_ordem
    WHERE id = stage_record.id;
  END LOOP;
END;
$$;
```

---

### ETAPA 6 — TRIGGERS

```sql
-- ============================================================
-- 6.1 Trigger principal: criar org ao registrar usuário
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 6.2 Triggers de updated_at (mantém timestamps atualizados)
-- ============================================================
-- ATENÇÃO: execute apenas se a coluna 'atualizado_em' existir na tabela

CREATE OR REPLACE TRIGGER leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER cadencias_updated_at
  BEFORE UPDATE ON public.cadencias
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

---

### ETAPA 7 — ROW LEVEL SECURITY (RLS) COMPLETO

```sql
-- ============================================================
-- 7.1 Habilitar RLS em TODAS as tabelas
-- ============================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_papeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_clinica ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fontes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criativos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campanhas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates_mensagem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_message_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens_rapidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_ai_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_stage_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadencia_passos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_cadencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cadencia_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_ai_chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memoria_agente_moncao ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7.2 ORGANIZATIONS
-- ============================================================
DROP POLICY IF EXISTS "Org acesso" ON public.organizations;
CREATE POLICY "Org acesso" ON public.organizations
FOR ALL TO authenticated USING (id = get_my_org_id());

DROP POLICY IF EXISTS "Org insert service" ON public.organizations;
CREATE POLICY "Org insert service" ON public.organizations
FOR INSERT TO public WITH CHECK (true);

-- ============================================================
-- 7.3 PERFIS
-- ============================================================
DROP POLICY IF EXISTS "Ver perfis da organizacao" ON public.perfis;
CREATE POLICY "Ver perfis da organizacao" ON public.perfis
FOR SELECT TO public
USING ((id = auth.uid()) OR (organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "Perfil insert trigger" ON public.perfis;
CREATE POLICY "Perfil insert trigger" ON public.perfis
FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Perfil update proprio" ON public.perfis;
CREATE POLICY "Perfil update proprio" ON public.perfis
FOR UPDATE TO authenticated
USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- ============================================================
-- 7.4 USUÁRIOS PAPEIS
-- ============================================================
DROP POLICY IF EXISTS "Papeis ver propria org" ON public.usuarios_papeis;
CREATE POLICY "Papeis ver propria org" ON public.usuarios_papeis
FOR SELECT TO authenticated
USING (
  (usuario_id = auth.uid()) OR
  (usuario_id IN (SELECT p.id FROM perfis p WHERE p.organization_id = get_my_org_id()))
);

DROP POLICY IF EXISTS "Papeis admin gerencia" ON public.usuarios_papeis;
CREATE POLICY "Papeis admin gerencia" ON public.usuarios_papeis
FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- 7.5 CONFIGURAÇÕES CLÍNICA
-- ============================================================
DROP POLICY IF EXISTS "Configuracoes Clinica Org" ON public.configuracoes_clinica;
CREATE POLICY "Configuracoes Clinica Org" ON public.configuracoes_clinica
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.6 ETAPAS (pipeline stages)
-- ============================================================
DROP POLICY IF EXISTS "Leitura etapas" ON public.etapas;
CREATE POLICY "Leitura etapas" ON public.etapas
FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admin insert etapas" ON public.etapas;
CREATE POLICY "Admin insert etapas" ON public.etapas
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM usuarios_papeis WHERE usuario_id = auth.uid() AND papel = 'admin'::app_role)
);

DROP POLICY IF EXISTS "Admin update etapas" ON public.etapas;
CREATE POLICY "Admin update etapas" ON public.etapas
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM usuarios_papeis WHERE usuario_id = auth.uid() AND papel = 'admin'::app_role))
WITH CHECK (EXISTS (SELECT 1 FROM usuarios_papeis WHERE usuario_id = auth.uid() AND papel = 'admin'::app_role));

DROP POLICY IF EXISTS "Admin delete etapas" ON public.etapas;
CREATE POLICY "Admin delete etapas" ON public.etapas
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM usuarios_papeis WHERE usuario_id = auth.uid() AND papel = 'admin'::app_role));

-- ============================================================
-- 7.7 FONTES
-- ============================================================
DROP POLICY IF EXISTS "Fontes Org" ON public.fontes;
CREATE POLICY "Fontes Org" ON public.fontes
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.8 TAGS
-- ============================================================
DROP POLICY IF EXISTS "Tags Org" ON public.tags;
CREATE POLICY "Tags Org" ON public.tags
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.9 CRIATIVOS
-- ============================================================
DROP POLICY IF EXISTS "Criativos Org" ON public.criativos;
CREATE POLICY "Criativos Org" ON public.criativos
FOR ALL TO public USING (organization_id = get_my_org_id());

-- ============================================================
-- 7.10 LEADS
-- ============================================================
DROP POLICY IF EXISTS "Leads Org" ON public.leads;
CREATE POLICY "Leads Org" ON public.leads
FOR ALL TO public USING (organization_id = get_my_org_id());

-- ============================================================
-- 7.11 LEADS_TAGS
-- ============================================================
DROP POLICY IF EXISTS "Leads Tags Org" ON public.leads_tags;
CREATE POLICY "Leads Tags Org" ON public.leads_tags
FOR ALL TO authenticated
USING (lead_id IN (SELECT id FROM leads WHERE organization_id = get_my_org_id()));

-- ============================================================
-- 7.12 MENSAGENS
-- ============================================================
DROP POLICY IF EXISTS "Mensagens Org" ON public.mensagens;
CREATE POLICY "Mensagens Org" ON public.mensagens
FOR ALL TO authenticated
USING (
  (lead_id IN (SELECT id FROM leads WHERE organization_id = get_my_org_id()))
  OR (user_id = auth.uid())
)
WITH CHECK (
  (lead_id IN (SELECT id FROM leads WHERE organization_id = get_my_org_id()))
  OR (user_id = auth.uid())
);

-- ============================================================
-- 7.13 MESSAGE_ATTACHMENTS
-- ============================================================
DROP POLICY IF EXISTS "Message Attachments Org" ON public.message_attachments;
CREATE POLICY "Message Attachments Org" ON public.message_attachments
FOR ALL TO authenticated
USING (
  message_id IN (
    SELECT m.id FROM mensagens m JOIN leads l ON l.id = m.lead_id
    WHERE l.organization_id = get_my_org_id()
  )
);

-- ============================================================
-- 7.14 VENDAS
-- ============================================================
DROP POLICY IF EXISTS "Vendas Org" ON public.vendas;
CREATE POLICY "Vendas Org" ON public.vendas
FOR ALL TO public USING (organization_id = get_my_org_id());

-- ============================================================
-- 7.15 MARKETING_EXPENSES
-- ============================================================
DROP POLICY IF EXISTS "Marketing Expenses Org" ON public.marketing_expenses;
CREATE POLICY "Marketing Expenses Org" ON public.marketing_expenses
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.16 CAMPANHAS
-- ============================================================
DROP POLICY IF EXISTS "Campanhas Org" ON public.campanhas;
CREATE POLICY "Campanhas Org" ON public.campanhas
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.17 ATIVIDADES
-- ============================================================
DROP POLICY IF EXISTS "Atividades Org" ON public.atividades;
CREATE POLICY "Atividades Org" ON public.atividades
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.18 INTEGRAÇÔES
-- ============================================================
DROP POLICY IF EXISTS "Integracoes Org" ON public.integracoes;
CREATE POLICY "Integracoes Org" ON public.integracoes
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.19 TEMPLATES MENSAGEM
-- ============================================================
DROP POLICY IF EXISTS "Templates Org" ON public.templates_mensagem;
CREATE POLICY "Templates Org" ON public.templates_mensagem
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.20 QUICK MESSAGE FOLDERS
-- ============================================================
DROP POLICY IF EXISTS "Quick Folders Org" ON public.quick_message_folders;
CREATE POLICY "Quick Folders Org" ON public.quick_message_folders
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.21 MENSAGENS RÁPIDAS
-- ============================================================
DROP POLICY IF EXISTS "Mensagens Rapidas Org" ON public.mensagens_rapidas;
CREATE POLICY "Mensagens Rapidas Org" ON public.mensagens_rapidas
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.22 NOTIFICAÇÕES
-- ============================================================
DROP POLICY IF EXISTS "Notificacoes usuario" ON public.notificacoes;
CREATE POLICY "Notificacoes usuario" ON public.notificacoes
FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 7.23 ORGANIZATION AI PROMPTS
-- ============================================================
DROP POLICY IF EXISTS "AI Prompts Org" ON public.organization_ai_prompts;
CREATE POLICY "AI Prompts Org" ON public.organization_ai_prompts
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.24 LEAD STAGE HISTORY
-- ============================================================
DROP POLICY IF EXISTS "Lead Stage History Org" ON public.lead_stage_history;
CREATE POLICY "Lead Stage History Org" ON public.lead_stage_history
FOR ALL TO authenticated
USING (organization_id = get_my_org_id())
WITH CHECK (organization_id = get_my_org_id());

-- ============================================================
-- 7.25 CADÊNCIAS
-- ============================================================
DROP POLICY IF EXISTS "cadencias_org" ON public.cadencias;
CREATE POLICY "cadencias_org" ON public.cadencias
FOR ALL TO public USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "cadencia_passos_org" ON public.cadencia_passos;
CREATE POLICY "cadencia_passos_org" ON public.cadencia_passos
FOR ALL TO public
USING (cadencia_id IN (SELECT id FROM public.cadencias WHERE organization_id = get_my_org_id()));

DROP POLICY IF EXISTS "lead_cadencias_org" ON public.lead_cadencias;
CREATE POLICY "lead_cadencias_org" ON public.lead_cadencias
FOR ALL TO public USING (organization_id = get_my_org_id());

DROP POLICY IF EXISTS "cadencia_logs_org" ON public.cadencia_logs;
CREATE POLICY "cadencia_logs_org" ON public.cadencia_logs
FOR ALL TO public USING (organization_id = get_my_org_id());

-- ============================================================
-- 7.26 INTERNAL AI CHAT MESSAGES
-- ============================================================
DROP POLICY IF EXISTS "Acesso as mensagens da IA da organizacao" ON public.internal_ai_chat_messages;
CREATE POLICY "Acesso as mensagens da IA da organizacao" ON public.internal_ai_chat_messages
FOR ALL TO authenticated
USING (
  organization_id = (SELECT organization_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
)
WITH CHECK (
  organization_id = (SELECT organization_id FROM public.perfis WHERE id = auth.uid() LIMIT 1)
);

-- ============================================================
-- 7.27 DOCUMENTS (acesso total para autenticados)
-- ============================================================
DROP POLICY IF EXISTS "Documents acesso" ON public.documents;
CREATE POLICY "Documents acesso" ON public.documents
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7.28 CLIENTES / SQUADS / ENTREGÁVEIS (acesso total para autenticados)
-- ============================================================
DROP POLICY IF EXISTS "Clientes acesso" ON public.clientes;
CREATE POLICY "Clientes acesso" ON public.clientes
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Squads acesso" ON public.squads;
CREATE POLICY "Squads acesso" ON public.squads
FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Entregaveis acesso" ON public.entregaveis;
CREATE POLICY "Entregaveis acesso" ON public.entregaveis
FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7.29 MEMÓRIA DO AGENTE (acesso total para autenticados)
-- ============================================================
DROP POLICY IF EXISTS "Memoria Moncao acesso" ON public.memoria_agente_moncao;
CREATE POLICY "Memoria Moncao acesso" ON public.memoria_agente_moncao
FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

---

### ETAPA 8 — STORAGE BUCKETS

```sql
-- ============================================================
-- Criar buckets necessários (mídias do WhatsApp e campanhas)
-- ============================================================
INSERT INTO storage.buckets (id, name, "public")
VALUES 
  ('media-mensagens', 'media-mensagens', true),
  ('audio-mensagens', 'audio-mensagens', true),
  ('campaign-media',  'campaign-media',  true),
  ('avatars',         'avatars',         true)
ON CONFLICT (id) DO UPDATE SET "public" = true;

-- ============================================================
-- Políticas de Storage
-- ============================================================
DROP POLICY IF EXISTS "Allow Public Read Access" ON storage.objects;
CREATE POLICY "Allow Public Read Access"
ON storage.objects FOR SELECT
USING (bucket_id IN ('media-mensagens', 'audio-mensagens', 'campaign-media', 'avatars'));

DROP POLICY IF EXISTS "Allow Authenticated Full Access" ON storage.objects;
CREATE POLICY "Allow Authenticated Full Access"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id IN ('media-mensagens', 'audio-mensagens', 'campaign-media', 'avatars'))
WITH CHECK (bucket_id IN ('media-mensagens', 'audio-mensagens', 'campaign-media', 'avatars'));
```

---

### ETAPA 9 — DADOS INICIAIS DO PIPELINE

```sql
-- ============================================================
-- Etapas padrão do funil (inserção idempotente)
-- ============================================================
INSERT INTO public.etapas (nome, cor, posicao_ordem, em_funil)
SELECT * FROM (VALUES
  ('Novo Lead',         '#6B7280', 1, false),
  ('Em Atendimento',    '#3B82F6', 2, true),
  ('Proposta Enviada',  '#F59E0B', 3, true),
  ('Agendado',          '#8B5CF6', 4, true),
  ('Convertido',        '#10B981', 5, true),
  ('Perdido',           '#EF4444', 6, false)
) AS v(nome, cor, posicao_ordem, em_funil)
WHERE NOT EXISTS (SELECT 1 FROM public.etapas LIMIT 1);
```

---

### ETAPA 10 — REALTIME (necessário para updates em tempo real)

```sql
-- Habilitar realtime nas tabelas de alto uso
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_cadencias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads_tags;
```

---

## ⚡ EDGE FUNCTIONS — TODAS AS 11 FUNÇÕES

> **O código completo de todas as 11 Edge Functions está no arquivo separado:**
> **[edge_functions_completas.md](file:///C:/Users/Latitude/.gemini/antigravity/brain/069b2793-ee99-4675-aaa4-e4418973d75f/edge_functions_completas.md)**

### Resumo das Edge Functions

| # | Nome | Descrição |
|---|---|---|
| 1 | `create-user` | Cria novos usuários (admin only) |
| 2 | `delete-message` | Exclui mensagem + dispara webhook n8n |
| 3 | `get-media-url` | Gera URL assinada para mídia |
| 4 | `getSignedAudioUrl` | Gera URL assinada para áudio |
| 5 | `internal-ai-agent` | Chat IA interno (Grok/xAI) |
| 6 | `process-cadences` | Processador de cadências automáticas |
| 7 | `receive-message` | Recebe mensagens do WhatsApp (webhook) |
| 8 | `seed-stages` | Popula etapas padrão do pipeline |
| 9 | `seed-templates` | Popula templates de mensagem padrão |
| 10 | `toggle-ai-status` | Liga/desliga/pausa IA por lead |
| 11 | `trigger-campaign` | Dispara campanha de mensagens |

### Variáveis de Ambiente (Secrets)

Configure em **Settings → Edge Functions → Secrets**:

| Variável | Usada por | Descrição |
|---|---|---|
| `SUPABASE_URL` | Todas | Auto-configurada pelo Supabase |
| `SUPABASE_ANON_KEY` | Todas | Auto-configurada pelo Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas | Auto-configurada pelo Supabase |
| `XAI_API_KEY` | internal-ai-agent | Chave da API xAI (Grok) |

> [!WARNING]
> **URLs de Webhook que precisam ser atualizadas no código:**
> - `delete-message` → `N8N_WEBHOOK_URL` (webhook de exclusão)
> - `process-cadences` → `WEBHOOK_URL` (webhook de envio de cadência)
> - `trigger-campaign` → `WEBHOOK_URL` (webhook de campanhas)

---

## ⏰ CRON JOB — Executar Cadências a cada 1 minuto

> Execute este SQL **após** criar a Edge Function.  
> **SUBSTITUA a URL pela URL do seu NOVO projeto Supabase.**

```sql
-- ⚠️ SUBSTITUIR: izhbmjqyoglagooosmoc → ID do seu NOVO projeto
-- ⚠️ SUBSTITUIR: o Bearer token pelo ANON KEY do seu NOVO projeto

SELECT cron.schedule(
  'process-cadences-1min',
  '* * * * *',
  $$
    SELECT net.http_post(
        url:='https://SEU_NOVO_PROJECT_ID.supabase.co/functions/v1/process-cadences',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer SEU_NOVO_ANON_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);
```

> Para obter o **ANON KEY** do novo projeto: **Settings → API → anon public**

---

## 🎨 CONFIGURAÇÃO DO FRONTEND

Após criar o banco, atualize o arquivo de conexão do frontend:

**Arquivo:** `src/integrations/supabase/client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://SEU_NOVO_PROJECT_ID.supabase.co";
const SUPABASE_ANON_KEY = "SEU_NOVO_ANON_KEY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## ⚠️ PROBLEMAS CONHECIDOS E COMO EVITAR

### ❌ Problema 1: Tela Branca ao abrir LeadModal
**Causa:** `cn` (função utilitária) não importada no componente  
**Solução:** Garanta que `import { cn } from "@/lib/utils"` está no topo do arquivo

### ❌ Problema 2: Etapas do Pipeline — Não consegue editar/excluir
**Causa:** RLS bloqueando sem verificar papel admin corretamente  
**Solução:** As policies de 7.6 acima já corrigem isso. Use a função `has_role()` nas verificações.

### ❌ Problema 3: Realtime não funciona (mensagens não aparecem em tempo real)
**Causa:** Tabelas não adicionadas na publication do Realtime  
**Solução:** Execute a Etapa 10 acima

### ❌ Problema 4: Usuário criado, mas sem organização ou perfil
**Causa:** Trigger `on_auth_user_created` não foi criado  
**Solução:** Execute a Etapa 6 inteiramente antes de cadastrar qualquer usuário

### ❌ Problema 5: "Não é possível encontrar o nome 'get_my_org_id'"
**Causa:** RLS criada antes da função  
**Solução:** **Sempre** execute a Etapa 5 (Funções) antes da Etapa 7 (RLS)

### ❌ Problema 6: Cadências não disparam
**Causa:** Cron configurado com URL/token antigo  
**Solução:** Ao criar novo projeto, recrie o cron com a nova URL e novo ANON KEY

### ❌ Problema 7: Arquivos de mídia não carregam
**Causa:** Buckets sem policy pública  
**Solução:** Execute a Etapa 8 completa

---

## 📁 ARQUIVOS DO FRONTEND A ATUALIZAR

Após criar o novo projeto, atualize apenas:

| Arquivo | O que mudar |
|---|---|
| `src/integrations/supabase/client.ts` | `SUPABASE_URL` e `SUPABASE_ANON_KEY` |
| `.env` ou `.env.local` (se existir) | Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` |

---

## ✅ VALIDAÇÃO FINAL

Após executar tudo, verifique:

```sql
-- Verificar tabelas criadas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

-- Verificar funções criadas
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_definition IS NOT NULL ORDER BY routine_name;

-- Verificar policies
SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Verificar cron jobs
SELECT jobname, schedule, active FROM cron.job;

-- Verificar etapas do pipeline
SELECT * FROM public.etapas ORDER BY posicao_ordem;
```

**Todos devem retornar dados conforme esperado.** ✅
