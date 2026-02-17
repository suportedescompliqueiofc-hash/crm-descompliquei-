-- Adiciona colunas para feedback de execução na interface
ALTER TABLE public.lead_cadencias 
ADD COLUMN IF NOT EXISTS ultima_execucao TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_ultima_execucao TEXT, -- 'sucesso' ou 'erro'
ADD COLUMN IF NOT EXISTS erro_log TEXT;