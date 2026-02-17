-- Habilitar a extensão pg_net necessária para o cron realizar chamadas HTTP para as Edge Functions
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Garantir que as permissões de uso do schema net existam para o usuário de manutenção do banco
GRANT USAGE ON SCHEMA net TO postgres;
GRANT ALL ON SCHEMA net TO postgres;