-- Flag por organização: controla se a resposta da IA de pré-atendimento é
-- quebrada em várias mensagens de WhatsApp antes do envio.
--
-- true  (padrão) = comportamento atual — humanizeAndSplit divide a resposta
-- false           = a resposta sai em UMA única mensagem, sem divisão
--
-- Default true para não alterar nenhuma organização existente.

ALTER TABLE organization_ai_prompts
  ADD COLUMN IF NOT EXISTS dividir_mensagens boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN organization_ai_prompts.dividir_mensagens IS
  'Se false, a edge function whatsapp-ai-agent envia a resposta da IA em uma única mensagem, sem passar pelo divisor humanizado.';
