-- Adiciona flag para desconsiderar lead das métricas do painel
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS excluir_metricas BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.leads.excluir_metricas IS 'Quando true, o lead é ignorado em todas as métricas do painel (leads de teste, spam, etc.)';
