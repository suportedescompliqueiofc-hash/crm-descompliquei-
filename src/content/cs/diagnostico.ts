// Fonte: 05-operacoes-e-cs/sistema/02-diagnostico.md
// O protocolo de diagnóstico, passo a passo — como a cadeia (cadeia.ts) e o
// elo-restrição são de fato apurados dentro de /cs-cliente ou /cs-mes.
export const PASSOS_DO_DIAGNOSTICO = [
  {
    numero: 1,
    titulo: 'Portão da Camada 0',
    texto:
      'Antes de calcular qualquer taxa dos 8 elos, verificar o checklist de adoção. Os itens ' +
      'críticos são registro de desfecho de consulta e registro de venda: se a clínica tem zero ' +
      '(ou volume irrisório), o diagnóstico de Comparecimento, Fechamento, Ticket e Ciclo de ' +
      'Venda é declarado não confiável. Se o portão falha, a Camada 0 vira o trabalho do mês — ' +
      'isso é onboarding, não diagnóstico comercial. Revisitar este portão em todo fechamento ' +
      'mensal, mesmo para clientes já maduros — configuração pode regredir.',
  },
  {
    numero: 2,
    titulo: 'Puxar a série mês a mês desde o cadastro',
    texto:
      'Não uma janela fixa — desde o mês do cadastro até o mês corrente, para os 8 elos ' +
      'aplicáveis. Por quê: a cadeia é tendência, não foto. Um mês ruim isolado pode ser ' +
      'sazonalidade; um mês bom isolado pode ser um paciente grande fora da curva. Só a série ' +
      'mostra se um elo está estruturalmente fraco ou apenas oscilando dentro do normal.',
  },
  {
    numero: 3,
    titulo: 'Calcular o ganho simulado por elo e eleger o elo-restrição',
    texto:
      'Aplicar o método do critério de elo-restrição para cada um dos 6 elos da Camada ' +
      'Comercial, usando a média (ou a tendência recente) da série do passo 2 como o "valor ' +
      'atual" — não só o último mês isolado.',
  },
  {
    numero: 4,
    titulo: 'Ler a continuidade e a percepção registrada do CEO',
    texto:
      'Antes de formar qualquer conclusão, ler continuidade.md inteiro (ou desde o último ' +
      'fechamento) e o campo de percepção em contexto.md. O diagnóstico numérico dos passos 2-3 ' +
      'não é o diagnóstico final — é metade dele.',
  },
  {
    numero: 5,
    titulo: 'Confrontar as duas verdades',
    texto:
      'Quando número e percepção concordam, o diagnóstico está reforçado. Quando divergem: (1) ' +
      'registrar a divergência explicitamente, tipo divergência, com data; (2) formular a ' +
      'hipótese de cada lado, sem escolher uma; (3) o mês seguinte serve de teste para ' +
      'desempatar — não decidir no calor da divergência.',
  },
  {
    numero: 6,
    titulo: 'Medir aderência antes de culpar o plano',
    texto:
      'Antes de concluir que o elo não melhorou porque o plano estava errado, checar se o plano ' +
      'foi executado. Se o cliente não executou, o plano não foi testado — não há base para ' +
      'trocar de elo. Nunca trocar de elo por falta de resultado sem antes olhar aderência: ' +
      'trocar de elo reinicia a curva de aprendizado do cliente e queima um mês do ciclo de 180 dias.',
  },
];

export const O_QUE_NUNCA_FAZER_NO_DIAGNOSTICO = [
  'Diagnosticar por foto de um mês — um mês isolado não distingue tendência de ruído.',
  'Confiar em taxa calculada sobre volume ínfimo — piso de volume mínimo: 10 casos no elo no período analisado. Abaixo disso, o elo é "sem dado suficiente", a decisão se apoia nos demais elos e na percepção do CEO.',
  'Ignorar a Camada 0 — calcular elo-restrição sobre uma clínica que não passou o portão produz diagnóstico sobre dado incompleto.',
  'Atacar dois elos ao mesmo tempo, sem justificativa registrada — o padrão é um elo por plano.',
];
