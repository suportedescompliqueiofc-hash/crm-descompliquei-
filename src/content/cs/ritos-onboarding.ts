// Fonte: 05-operacoes-e-cs/sistema/ritos/02-onboarding.md
// Onboarding de 2 semanas — decisão explícita do CEO em 2026-07-30.
export const ONBOARDING = {
  duracao: '2 semanas (não 30 dias — decisão explícita do CEO em 2026-07-30)',
  tese:
    'As duas semanas existem para o cliente aprender a usar a plataforma — não para o CS ' +
    'observar o cliente. O cliente tem que começar a semana 3 já sabendo usar o CRM, registrar ' +
    'um agendamento (marcar o desfecho) e registrar uma venda. "É o crivo mais básico de todos" ' +
    '(palavras do CEO).',
  handoffChecklist: [
    { item: 'A dor real', porQue: 'Sem ela, o plano ataca sintoma genérico, não o que motivou a compra.' },
    { item: 'A promessa específica', porQue: 'É a régua do fim de ciclo — sem ela, "cumprimos ou não" vira opinião.' },
    { item: 'O diagnóstico comercial levantado', porQue: 'Evita abrir o diagnóstico do zero ignorando expectativa já formada.' },
    { item: 'O que o cliente já tentou antes', porQue: 'Evita repetir abordagem já testada e descartada.' },
    { item: 'Quem decide e quem executa', porQue: 'Sem isso o CS não sabe com quem falar no kickoff nem quem registra dado.' },
    { item: 'O contrato', porQue: 'Ancora os 180 dias e a régua do fim de ciclo.' },
  ],
  semHandoffNaoComeca: 'Sem o handoff, o onboarding não começa — o CS reconstruiria de memória meses depois.',
  checklistAtivacaoAutomacoes: [
    { automacao: 'WhatsApp conectado', oQuePassaAFazer: 'Pré-requisito de tudo — sem conexão, nenhum lead entra pelo canal principal.' },
    { automacao: 'IA de pré-atendimento (Athos Recepção)', oQuePassaAFazer: 'Responde automaticamente toda mensagem, nunca fecha/agenda/informa preço.' },
    { automacao: 'IA de Triagem', oQuePassaAFazer: 'Classifica a 1ª mensagem de lead orgânico novo e decide se ativa a IA de recepção.' },
    { automacao: 'Follow-up automático (Athos Follow-Up)', oQuePassaAFazer: 'Resgata sozinho, por IA, lead que ficou em silêncio.' },
    { automacao: 'Confirmação de consulta', oQuePassaAFazer: 'Dispara WhatsApp de confirmação automático assim que o agendamento é criado.' },
    { automacao: 'Lembrete de consulta', oQuePassaAFazer: 'Dispara lembrete automático X min/dias antes da consulta.' },
  ],
  regraAbsoluta:
    'Nunca declarar ação que a plataforma já faz. O máximo permitido é mandar o cliente ' +
    'usar/ativar/configurar a ferramenta. O que o cliente ainda precisa fazer manualmente, mesmo ' +
    'com tudo ligado: interpretar a resposta do paciente a uma confirmação/lembrete e mudar o ' +
    'status do agendamento — a plataforma não lê "sim"/"não" automaticamente.',
  semana1: {
    objetivo:
      'Confirmar o handoff, alinhar expectativa, ativar o que já foi comprado, e o cliente ' +
      'demonstrar AO VIVO, pelo menos uma vez cada, os três registros básicos.',
    oQueOCsFaz: [
      'Confirma os seis campos do handoff (ou reconstrói com o João, se legado).',
      'Conduz o kickoff — expectativa vs. promessa, direção da meta, o que o cliente vai ter que fazer, cadência de conversa.',
      'Cria/confirma organização e usuários, conecta o WhatsApp se ainda não estiver conectado.',
      'Roda o checklist de ativação das automações inteiro, item a item.',
      'Ensina, tela a tela, com quem vai executar: registrar lead manual, marcar agendamento, registrar venda.',
    ],
    oQueOClienteFaz: [
      'Participa do kickoff com quem decide e quem executa.',
      'Fornece o acesso necessário.',
      'Executa, na frente do CS, cada um dos três registros básicos pelo menos uma vez.',
    ],
    criterioSaida: [
      'Handoff com os 6 campos preenchidos.',
      'Kickoff registrado em continuidade.md com os 4 pontos combinados.',
      'whatsapp_connections ativo e ao menos 1 login funcional confirmado.',
      'Checklist de automações rodado, com decisão registrada item a item e "ligar agora" refletido de fato no banco.',
      'Ao menos 1 agendamento com status alterado manualmente e 1 venda registrada, feitos pelo próprio cliente com o CS presente.',
    ],
  },
  semana2: {
    objetivo:
      'O cliente sustenta os três registros sozinho, sem precisar mais ser lembrado a cada caso ' +
      '— este é o crivo que decide se o onboarding fecha.',
    oQueOCsFaz: [
      'Acompanha à distância; intervém só se o registro parar.',
      'No meio da semana, checagem leve: os registros estão acontecendo?',
    ],
    oQueOClienteFaz: ['Registra todo lead novo, marca desfecho de todo agendamento, registra toda venda — sem o CS pedir.'],
    criterioSaida: [
      'Volume de leads registrados batendo com o volume relatado pelo cliente (divergência > ~20% é sinal de que não pegou).',
      'Ao menos 1 agendamento com desfecho marcado pelo próprio cliente, sem o CS ter pedido.',
      'Toda venda relatada com entrada correspondente em vendas.',
      'Automações decididas como "ligar agora" seguem ativas no banco.',
    ],
  },
  seCriterioNaoAtingido:
    'O onboarding se estende em blocos de +1 semana, repetindo o critério da semana 2. ' +
    'Simultaneamente, o cliente entra em Atenção na régua de risco — chegar ao fim das duas ' +
    'semanas sem os três registros rodando sozinhos é o sinal de risco mais forte que este rito ' +
    'produz. Se uma segunda extensão também falhar, o cliente sobe direto para Crítico.',
  semana3:
    'A partir da semana 3, o cliente entra no ciclo normal (rito do mês do CS). Duas ações abrem ' +
    'esse ciclo: (1) meta comercial empírica — levantada em conversa direta, não vem de série do ' +
    'CRM ainda; (2) primeiro diagnóstico e primeiro plano de ação — sem série mensal, vem de ' +
    'entrevista direta, com o elo-restrição entrando como HIPÓTESE, marcada explicitamente "a ' +
    'confirmar com o dado do mês seguinte".',
  criterioOnboardingConcluido: [
    'Handoff completo — os 6 campos preenchidos, sem PENDENTE.',
    'Kickoff registrado em continuidade.md com os 4 pontos combinados.',
    'whatsapp_connections ativo e ao menos 1 login funcional confirmado.',
    'Checklist de ativação das automações rodado, decisão registrada, "ligar agora" refletido no banco.',
    'Registro de lead ativo — volume da semana 2 batendo com o relatado.',
    'Registro de desfecho de agendamento ativo — pelo menos 1 caso na semana 2, sem o CS pedir.',
    'Registro de venda ativo — toda venda relatada com entrada em vendas.',
  ],
  correcaoDePremissaHerdada:
    'O rito anterior partia da premissa de que Comparecimento e Fechamento não têm medição ' +
    'direta. Isso está errado — a plataforma mede os dois corretamente (agendamentos.status e ' +
    'vendas); o que falta é adoção das telas, e é isso que o onboarding ataca desde a semana 1.',
};
