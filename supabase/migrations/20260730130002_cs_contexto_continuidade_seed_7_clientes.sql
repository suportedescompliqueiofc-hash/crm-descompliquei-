-- Migração de dados: os 7 clientes PCA reais, lidos de
-- 05-operacoes-e-cs/clientes/<cliente>/contexto.md e continuidade.md em
-- 2026-07-30. Popula cs_contexto (1 linha/cliente), cs_percepcao (1 percepção
-- migrada/cliente) e cs_continuidade (1 entrada de observação/cliente, a
-- mesma que já existia nos arquivos).
--
-- Regra seguida: nada foi inventado. Campo sem informação no markdown entra
-- NULL aqui (não string vazia, não "N/A") — é uma lacuna conhecida, contada
-- no relatório desta squad. INSERT direto nas tabelas (não via
-- cs_salvar_contexto/cs_registrar_*): esta migration roda fora de uma sessão
-- autenticada, então is_super_admin()/is_admin() (que leem auth.uid()) não
-- teriam como validar — as funções SECURITY DEFINER continuam sendo o único
-- caminho de escrita para o app/Claude no dia a dia.

-- ═══════════════════════════════════════════════════════════════════
-- cs_contexto — 7 linhas
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.cs_contexto (
  organization_id, cidade, cliente_desde, promessa_venda, convenio_particular,
  quem_atende, quem_vende, tem_equipe, elo_restricao, elo_restricao_status,
  elo_restricao_desde, restricoes_conhecidas
) VALUES
  -- Clínica Lara Morgado
  ('ab4dcdc0-f313-4cef-b376-02c95c5ff4e2', NULL, '2026-04-16', NULL, NULL, NULL, NULL, NULL,
   NULL, NULL,
   'não se aplica ainda — nenhum fechamento (/cs-mes) rodou no sistema novo para este cliente',
   NULL),

  -- Doutora Anna Clara (Pliniodonto)
  ('93358e8b-b724-4cba-b477-b3646d9d0227', NULL, '2026-05-26', NULL,
   'Demanda vem majoritariamente de convênio; particular é quase zero — informação repassada pelo João em conversa sobre esta migração (não constava no dossiê antigo).',
   NULL, NULL, NULL,
   'Ticket', 'hipotese',
   'não se aplica — hipótese herdada da conversa com o CEO antes da migração para o sistema novo, ainda não confirmada por um fechamento formal (/cs-mes). Repassada pelo João: o convênio estrutura o preço por tabela baixa, o que pressiona o ticket médio para baixo mesmo com boa cadeira cheia.',
   NULL),

  -- Dr. Derek Gonçalves
  ('f1015744-992f-4db5-aac3-566e4cbd8d18', NULL, '2026-07-21', NULL, NULL, NULL, NULL, NULL,
   NULL, NULL,
   'não se aplica ainda — nenhum fechamento (/cs-mes) rodou no sistema novo para este cliente',
   NULL),

  -- Dr. Jhonatan Dutra
  ('271d81c4-a739-4059-9f55-14a490303fc3', NULL, '2026-07-06', NULL, NULL, NULL, NULL, NULL,
   NULL, NULL,
   'não se aplica ainda — nenhum fechamento (/cs-mes) rodou no sistema novo para este cliente',
   NULL),

  -- Dra. Juliana Lopes
  ('78144f3a-c6f3-4145-a027-534e6f622984', NULL, '2026-06-10', NULL, NULL, NULL, NULL, NULL,
   'Demanda', 'hipotese',
   'não se aplica — hipótese herdada da conversa com o CEO antes da migração para o sistema novo, ainda não confirmada por um fechamento formal (/cs-mes). Repassada pelo João: sem geração de demanda própria. Por isso recebeu mentoria de tráfego pago como bônus do PCA (fato, não hipótese).',
   NULL),

  -- Dra. Monção
  ('38d31fbd-59f3-4ade-99bb-28699279d913', NULL, '2026-06-25', NULL, NULL, NULL, NULL, NULL,
   NULL, NULL,
   'não se aplica ainda — nenhum fechamento (/cs-mes) rodou no sistema novo para este cliente',
   NULL),

  -- Dra. Tayane Rocha
  ('2780f688-e00d-4d22-a8c5-67cbaea77d24', NULL, '2026-05-04', NULL,
   'Atende só particular — informação repassada pelo João em conversa sobre esta migração (não constava no dossiê antigo).',
   NULL, NULL, NULL,
   'Agendamento / Fechamento', 'hipotese',
   'não se aplica — hipótese herdada da conversa com o CEO antes da migração para o sistema novo, ainda não confirmada por um fechamento formal (/cs-mes). Repassada pelo João: demanda forte, mas não tem atendimento padronizado nem estrutura de follow-up.',
   NULL);

-- ═══════════════════════════════════════════════════════════════════
-- cs_percepcao — 7 percepções migradas, uma por cliente. Todas com
-- data_percepcao NULL + data_aproximada=true: os dossiês antigos não
-- registravam a data em que a percepção foi formada.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.cs_percepcao (
  organization_id, data_percepcao, data_aproximada, texto, diverge_do_dado, divergencia_nota
) VALUES
  ('ab4dcdc0-f313-4cef-b376-02c95c5ff4e2', NULL, true,
   'O dossiê antigo descrevia a clínica como ativa e conversando (mensagens recentes e leads novos entrando), mas sem nenhuma venda registrada no CRM ao longo de meses de operação. A leitura do modelo antigo era de que as vendas provavelmente aconteciam e não eram registradas no sistema — não uma ausência real de vendas — e recomendava abordar o assunto como conversa sobre registro, não sobre desempenho.',
   false, NULL),

  ('93358e8b-b724-4cba-b477-b3646d9d0227', NULL, true,
   'Era descrita como a clínica de maior volume de vendas da base, mas com o ticket muito abaixo das demais. O modelo antigo tinha uma dúvida em aberto e não resolvida: se isso é um modelo legítimo de alto volume/baixo valor por venda, ou se é erro de registro (parcela sendo lançada como se fosse uma venda inteira). Enquanto essa dúvida não for esclarecida, o dossiê antigo orientava não usar os números dela como referência de benchmark para outras clínicas.',
   true, 'Dúvida não resolvida herdada do modelo antigo: o ticket baixo pode ser um modelo legítimo de alto volume, ou um erro de registro (parcela lançada como venda inteira). Não usar como benchmark de outras clínicas até esclarecer com o CRM.'),

  ('f1015744-992f-4db5-aac3-566e4cbd8d18', NULL, true,
   'O dossiê antigo registrava preocupação de onboarding — cliente entrou recentemente, já com leads no funil mas nenhuma venda registrada até então. Prioridade apontada era acompanhar os primeiros dias e garantir que o registro de venda estivesse de fato acontecendo.',
   false, NULL),

  ('271d81c4-a739-4059-9f55-14a490303fc3', NULL, true,
   'O dossiê antigo registrava preocupação de onboarding — cliente entrou recentemente e, na leitura da época, praticamente não havia começado a operar de fato. Prioridade apontada era confirmar que estava usando o CRM e recebendo leads de verdade.',
   false, NULL),

  ('78144f3a-c6f3-4145-a027-534e6f622984', NULL, true,
   'O dossiê antigo notava que ela usava a plataforma majoritariamente para registrar fechamento de venda, não para gerir o funil de entrada — leitura na época era de hábito de uso ainda em formação por ser cliente recente, não resistência.',
   false, NULL),

  ('38d31fbd-59f3-4ade-99bb-28699279d913', NULL, true,
   'O dossiê antigo a descrevia como cliente que fatura bem mas sub-usa o funil da plataforma — registrava agendamento e venda sem registrar a origem do lead. Leitura na época era de hábito de onboarding que não pegou (cliente relativamente recente à época), não resistência.',
   false, NULL),

  ('2780f688-e00d-4d22-a8c5-67cbaea77d24', NULL, true,
   'Era tida como a melhor clínica da base no modelo antigo de CS, com a operação de conversão mais eficiente da carteira. Candidata natural a virar referência de benchmark e a dar depoimento de caso de sucesso.',
   false, NULL);

-- ═══════════════════════════════════════════════════════════════════
-- cs_continuidade — 7 entradas de observação (a mesma entrada já registrada
-- em cada continuidade.md em 2026-07-29), tipo='observacao',
-- origem='registro_manual', combinado_com='João'.
-- ═══════════════════════════════════════════════════════════════════
INSERT INTO public.cs_continuidade (
  organization_id, data_evento, tipo, o_que_aconteceu, ficou_combinado, combinado_com, origem
) VALUES
  ('ab4dcdc0-f313-4cef-b376-02c95c5ff4e2', '2026-07-29', 'observacao',
   'Cliente migrada do modelo antigo de CS (dossiê em produtos/pca/clientes/clinica-lara-morgado/dossie.md) para o sistema novo. No modelo antigo era descrita como clínica ativa e conversando, mas sem nenhuma venda registrada no CRM ao longo de meses de operação — hipótese era de venda acontecendo fora do sistema/não registrada, não ausência real de venda. Elo-restrição ainda não diagnosticado no sistema novo.',
   'Nenhuma ação combinada ainda — aguardando primeiro /cs-cliente para diagnóstico completo no sistema novo, incluindo esclarecer o registro de venda.',
   'João', 'registro_manual'),

  ('93358e8b-b724-4cba-b477-b3646d9d0227', '2026-07-29', 'observacao',
   'Cliente migrada do modelo antigo de CS (dossiê em produtos/pca/clientes/doutora-anna-clara/dossie.md) para o sistema novo. No modelo antigo era descrita como a clínica de maior volume de vendas da base, mas com ticket muito abaixo das demais, e havia uma dúvida não resolvida sobre se isso reflete um modelo legítimo de alto volume/baixo valor ou um erro de registro (parcela lançada como venda). Elo-restrição de entrada no sistema novo (Ticket) é hipótese repassada pelo João, ligada ao mix forte de convênio, ainda sem diagnóstico formal.',
   'Nenhuma ação combinada ainda — aguardando primeiro /cs-cliente para diagnóstico completo no sistema novo, incluindo esclarecer a forma de registro de venda.',
   'João', 'registro_manual'),

  ('f1015744-992f-4db5-aac3-566e4cbd8d18', '2026-07-29', 'observacao',
   'Cliente migrado do modelo antigo de CS (dossiê em produtos/pca/clientes/dr-derek-goncalves/dossie.md) para o sistema novo. No modelo antigo era tratado como cliente recém-entrado, com leads já entrando no funil mas nenhuma venda registrada até então — prioridade apontada era acompanhar os primeiros dias e confirmar o registro de venda. Elo-restrição ainda não diagnosticado no sistema novo.',
   'Nenhuma ação combinada ainda — aguardando acompanhamento de onboarding e primeiro /cs-cliente para diagnóstico completo no sistema novo.',
   'João', 'registro_manual'),

  ('271d81c4-a739-4059-9f55-14a490303fc3', '2026-07-29', 'observacao',
   'Cliente migrado do modelo antigo de CS (dossiê em produtos/pca/clientes/dr-jhonatan-dutra/dossie.md) para o sistema novo. No modelo antigo era tratado como cliente recém-entrado, com onboarding urgente sinalizado — leitura da época era de que praticamente não havia começado a operar. Elo-restrição ainda não diagnosticado no sistema novo.',
   'Nenhuma ação combinada ainda — aguardando confirmação de onboarding e primeiro /cs-cliente para diagnóstico completo no sistema novo.',
   'João', 'registro_manual'),

  ('78144f3a-c6f3-4145-a027-534e6f622984', '2026-07-29', 'observacao',
   'Cliente migrada do modelo antigo de CS (dossiê em produtos/pca/clientes/dra-juliana-lopes/dossie.md) para o sistema novo. No modelo antigo era notada por usar a plataforma majoritariamente para registrar fechamento, não para gerir o funil de entrada — leitura de hábito ainda em formação, cliente recente. Elo-restrição de entrada no sistema novo (Demanda) é hipótese repassada pelo João; recebeu mentoria de tráfego pago como bônus do PCA.',
   'Nenhuma ação combinada ainda — aguardando primeiro /cs-cliente para diagnóstico completo no sistema novo.',
   'João', 'registro_manual'),

  ('38d31fbd-59f3-4ade-99bb-28699279d913', '2026-07-29', 'observacao',
   'Cliente migrada do modelo antigo de CS (dossiê em produtos/pca/clientes/dra-moncao/dossie.md) para o sistema novo. No modelo antigo era descrita como cliente que fatura bem mas sub-usa o funil da plataforma — registra agendamento e venda sem registrar a origem do lead, o que cegava o topo do funil. Elo-restrição ainda não diagnosticado no sistema novo.',
   'Nenhuma ação combinada ainda — aguardando primeiro /cs-cliente para diagnóstico completo no sistema novo.',
   'João', 'registro_manual'),

  ('2780f688-e00d-4d22-a8c5-67cbaea77d24', '2026-07-29', 'observacao',
   'Cliente migrado do modelo antigo de CS (dossiê em produtos/pca/clientes/dra-tayane-rocha/dossie.md) para o sistema novo. No modelo antigo era tratada como a melhor clínica da base, com a operação de conversão mais eficiente da carteira, e cotada como candidata a benchmark e a depoimento. Elo-restrição de entrada no sistema novo (Agendamento/Fechamento) é hipótese repassada pelo João, ainda sem diagnóstico formal.',
   'Nenhuma ação combinada ainda — aguardando primeiro /cs-cliente para diagnóstico completo no sistema novo.',
   'João', 'registro_manual');
