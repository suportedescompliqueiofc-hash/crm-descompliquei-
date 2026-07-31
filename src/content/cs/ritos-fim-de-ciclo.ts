// Fonte: 05-operacoes-e-cs/sistema/ritos/03-fim-de-ciclo.md
// Os últimos 30 dias dos 180. A decisão comercial sobre o "depois" (renovar,
// encerrar, mensalidade) NÃO foi tomada — pendente até 2026-10-13 (Lara Morgado
// é o 1º cliente a completar 180 dias).
export const FIM_DE_CICLO = {
  restricaoDoDocumento:
    'A decisão comercial sobre o que acontece depois dos 180 dias (renovar, encerrar, migrar ' +
    'para mensalidade) não foi tomada, e o CEO pediu explicitamente para não decidir agora. Este ' +
    'rito funciona nas duas hipóteses sem assumir nenhuma — onde dependeria da decisão, o texto ' +
    'diz PENDENTE.',
  prazo:
    'Clínica Lara Morgado é o 1º cliente a completar 180 dias, em 2026-10-13. A decisão comercial ' +
    'precisa existir antes dessa data.',
  quandoComeca: 'Dia 150 — 30 dias antes do fim do ciclo (nunca no dia 175).',
  porQueNao175: [
    'A prestação de contas exige revisão, não improviso — puxar a série completa, reler todos os fechamentos, é trabalho de preparação.',
    'A reunião precisa ser agendada com o cliente, que tem agenda própria — 5 dias de antecedência frequentemente não encontra horário.',
    'Se a decisão for renovar, um contrato novo precisa ser negociado e assinado antes do fim do ciclo atual.',
    'Se a decisão for encerrar, o cliente precisa de tempo para assumir sozinho o que a Descompliquei vinha operando.',
  ],
  prestacaoDeContas: {
    colunas: [
      { nome: 'Prometido', fonte: 'contexto.md, campo "a promessa feita na venda" (handoff).' },
      { nome: 'Entregue', fonte: 'A lista dos processos instalados, materiais produzidos e diagnósticos feitos mês a mês, lida de continuidade.md.' },
      { nome: 'Alcançado', fonte: 'Os números reais da cadeia, puxados ao vivo do CRM — cada elo comparando o mês 1 contra o mês final.' },
    ],
    regraDura:
      'Isso se apresenta MESMO QUANDO O RESULTADO É RUIM. Não existe versão em que a prestação ' +
      'de contas é pulada ou suavizada porque o número não ajuda — apresentar só quando o número ' +
      'favorece é o oposto do produto que foi vendido.',
    comoConduzirQuandoAPromessaNaoFoiCumprida: [
      'Apresentar os números sem filtro, elo por elo, comparando início e fim — antes de qualquer explicação.',
      'Se a causa foi falta de execução do cliente, apresentar a aderência mês a mês (já congelada em cada fechamento) como evidência objetiva, não como acusação verbal.',
      'A aderência é congelada, não recalculada retroativamente, justamente para não sofrer o viés de memória de nenhum dos dois lados.',
      'Não resolver por decreto — nem o CS assume toda a culpa quando a aderência mostra que o plano não foi testado, nem transfere toda a culpa para o cliente sem reconhecer onde o processo pode ter falhado.',
      'Registrar a reação do cliente em continuidade.md, como percepção, com data (P2 — duas verdades).',
    ],
  },
  oQueOClienteLeva: {
    processosInstalados: 'Os materiais Operacionais entregues ao longo do ciclo — scripts, cadências, protocolos, roteiros.',
    materiaisProduzidos: 'Os documentos Estratégicos entregues, mesmo os consumidos uma vez e não usados no dia a dia.',
    oQueContinuaFuncionando:
      'A clínica mantém o CRM, a equipe treinada sabe registrar lead/desfecho/venda, e os ' +
      'processos instalados continuam rodando enquanto a clínica mantiver a disciplina.',
    oQuePara:
      'O diagnóstico mensal do elo-restrição, a curadoria de novo plano, a produção de material ' +
      'novo, o acompanhamento consultivo. Tudo isso é o que compõe especificamente o produto PCA ' +
      '— para sem uma decisão de continuidade.',
  },
  conversaSobreODepois: {
    objetivo: 'Não é fechar uma venda nem confirmar uma saída — é ouvir o cliente e registrar o que ele diz.',
    perguntas: [
      'Como você avalia esses 180 dias — o que funcionou e o que não funcionou, na sua percepção?',
      'O que você imagina para os próximos meses da clínica?',
      'Você sente que precisa continuar tendo esse tipo de acompanhamento, ou consegue manter sozinho o que foi instalado?',
      'Existe algum elo da cadeia que você sente que ainda precisa de trabalho?',
    ],
    oQueSeRegistra:
      'Em continuidade.md, tipo fim-de-ciclo, a resposta o mais próxima possível das palavras ' +
      'literais do cliente — nunca já traduzida em decisão. A entrada termina explicitamente com ' +
      '"decisão comercial: PENDENTE — decidir com o João".',
  },
  oQueOCsAprendeDeCadaCicloEncerrado: [
    'Qual elo foi atacado mês a mês, e qual efetivamente melhorou com aderência real, versus qual não melhorou apesar de aderência real (sinal de que o material precisa mudar, não o diagnóstico).',
    'Isso alimenta o catálogo de materiais diretamente — um material com aderência real e resultado é candidato a padrão do elo; sem resultado, é candidato a revisão.',
    'Isso alimenta o tema das sessões táticas em grupo — um padrão que se repete entre clientes vira tema de sessão, beneficiando toda a carteira.',
  ],
};
