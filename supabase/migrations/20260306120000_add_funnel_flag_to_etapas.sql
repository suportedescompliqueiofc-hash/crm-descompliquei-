-- Adiciona a coluna para controle do funil
ALTER TABLE public.etapas ADD COLUMN incluir_no_funil BOOLEAN DEFAULT FALSE;

-- Define as etapas padrão iniciais baseadas no fluxo jurídico
UPDATE public.etapas SET incluir_no_funil = TRUE 
WHERE nome IN (
  'Novo Lead', 
  'Qualificação', 
  'Coletando Informações', 
  'Agendamento Solicitado', 
  'Reunião Agendada', 
  'Contrato Fechado',
  'Procedimento Fechado'
);