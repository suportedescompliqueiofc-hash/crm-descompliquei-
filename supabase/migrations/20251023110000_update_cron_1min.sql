-- Atualização da frequência do Cron para 1 minuto usando os nomes exatos do banco
-- Isso garante que cadências ativadas via chat sejam processadas quase em tempo real

-- 1. Reprogramar Processamento de Cadências
SELECT cron.unschedule('process-cadence-flows');
SELECT cron.schedule(
  'process-cadence-flows',
  '* * * * *', -- Executa a cada minuto
  $$
  SELECT net.http_post(
    url := 'https://guotjrwrnpsclfemwjql.supabase.co/functions/v1/process-cadences',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b3RqcndybnBzY2xmZW13anFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMDY2NDcsImV4cCI6MjA4Njg4MjY0N30.NPlanpggFSc4o-o3cPjZT2aXpsBPv_cl8nm18NymME4"}'::jsonb
  )
  $$
);

-- 2. Reprogramar Mensagens Agendadas (Quick Messages)
SELECT cron.unschedule('process-quick-messages');
SELECT cron.schedule(
  'process-quick-messages',
  '* * * * *', -- Executa a cada minuto
  $$
  SELECT net.http_post(
    url := 'https://guotjrwrnpsclfemwjql.supabase.co/functions/v1/process-scheduled-messages',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b3RqcndybnBzY2xmZW13anFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEzMDY2NDcsImV4cCI6MjA4Njg4MjY0N30.NPlanpggFSc4o-o3cPjZT2aXpsBPv_cl8nm18NymME4"}'::jsonb
  )
  $$
);