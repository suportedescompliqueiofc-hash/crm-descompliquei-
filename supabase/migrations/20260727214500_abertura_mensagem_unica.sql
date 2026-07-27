-- Substitui a flag `dividir_mensagens` (que valia para a conversa inteira) por
-- `abertura_mensagem_unica`, que vale APENAS para a primeira mensagem enviada
-- pela IA a cada lead — a abertura.
--
-- false (padrão) = comportamento atual em toda a conversa, inclusive na abertura
-- true           = a abertura sai em UMA única mensagem; da segunda em diante a
--                  resposta volta a ser dividida pelo humanizador normalmente
--
-- Default false para não alterar nenhuma organização existente.

ALTER TABLE organization_ai_prompts
  DROP COLUMN IF EXISTS dividir_mensagens;

ALTER TABLE organization_ai_prompts
  ADD COLUMN IF NOT EXISTS abertura_mensagem_unica boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN organization_ai_prompts.abertura_mensagem_unica IS
  'Se true, a edge function whatsapp-ai-agent envia a PRIMEIRA mensagem da IA para cada lead (a abertura) em um bloco único, sem passar pelo divisor humanizado. As mensagens seguintes continuam sendo divididas.';
