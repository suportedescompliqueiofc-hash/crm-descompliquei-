// Fonte: 05-operacoes-e-cs/sistema/ritos/01-regua-de-risco.md
// Os 6 sinais, os 4 níveis, as regras de transição e a ordenação da fila.
// Calibração inicial (30%, 50%, 60%, 21 dias etc.) — ajustável após 1-2 ciclos
// reais, nunca decidida caso a caso na conversa (isso quebraria a reprodutibilidade).
import type { SinalRisco, NivelRisco, RegraTransicao } from './types';

export const SINAIS_RISCO: SinalRisco[] = [
  {
    numero: 1,
    nome: 'Camada 0 — Adoção',
    oQueMede:
      'Se a plataforma está configurada e a clínica está de fato registrando o que faz nela — ' +
      'pré-condição para que os outros cinco sinais sejam confiáveis. Checado ANTES dos outros ' +
      'cinco, não somado a eles.',
    comoSeMede:
      'Checklist por cliente: WhatsApp conectado, IA de recepção ativa, confirmação e lembrete ' +
      'ativos, follow-up automático ligado, desfecho de consulta e venda registrados de forma confiável.',
    porQueImporta:
      'Sem esta camada, um cliente pode ser lido como Saudável só porque falta dado para provar ' +
      'o contrário. É sinal de precondição, não de mérito.',
    detalhe:
      'Duas categorias: A — Estrutural (sem canal de entrada / sem registro confiável de venda ' +
      'com 30+ dias de casa) força Crítico por si só, porque torna TODA a leitura comercial sem ' +
      'base. B — Configuração de automação (confirmação/lembrete desligados quando isso já é a ' +
      'norma da carteira; desfecho com padrão implausível de preenchimento) não força Crítico, ' +
      'mas vira "revisão manual necessária" — trava de posição no topo do próprio nível de fila.',
  },
  {
    numero: 2,
    nome: 'Relógio do contrato',
    oQueMede: 'Quanto do ciclo de 180 dias já foi consumido.',
    comoSeMede: '(hoje - data de entrada do cliente no PCA) / 180, em percentual.',
    porQueImporta:
      'É o único sinal que representa um recurso que não se recupera. Aderência pode melhorar ' +
      'mês que vem; tempo de contrato consumido, não.',
  },
  {
    numero: 3,
    nome: 'Aderência ao plano do mês',
    oQueMede: 'Percentual de passos do plano do mês corrente marcados como concluídos.',
    comoSeMede:
      'Passos/subtarefas concluídos ÷ totais, em jornada_passos/jornada_subtarefas vinculados à ' +
      'jornada ativa. Durante o mês é leitura viva e parcial; no fechamento é congelada.',
    porQueImporta:
      'É o sinal que decide se um resultado ruim é problema de plano ou problema de execução. ' +
      'Sem ele, qualquer outro sinal ruim seria mal interpretado.',
  },
  {
    numero: 4,
    nome: 'Movimento do elo-restrição, lido pela camada',
    oQueMede: 'Se o elo-restrição diagnosticado melhorou, ficou estável ou piorou frente ao mês anterior.',
    comoSeMede: 'Comparação do valor do elo do mês corrente com o do mês anterior, na série desde o cadastro.',
    porQueImporta:
      'É o sinal mais próximo do diagnóstico em si — mostra se o tratamento do mês está fazendo ' +
      'efeito, distinto de aderência (que mostra se o tratamento foi aplicado).',
    detalhe:
      'Elo-restrição na Camada 1 (Demanda) é entrada excepcional. Na Camada 2 (Comercial) é a ' +
      'situação normal e esperada. Na Camada 3 (Recompra) tende a aparecer mais tarde no ciclo ' +
      'ou já no 2º ciclo.',
  },
  {
    numero: 5,
    nome: 'Tempo desde o último contato registrado',
    oQueMede: 'Dias corridos desde a última entrada de contato real em continuidade.md.',
    comoSeMede: 'Data de hoje menos a data da entrada de contato mais recente.',
    porQueImporta:
      'É o sinal mais barato de corrigir (um contato resolve) e o que mais deteriora em silêncio ' +
      'se ninguém olhar.',
  },
  {
    numero: 6,
    nome: 'Resultado absoluto',
    oQueMede: 'Existe venda? Existe receita registrada no ciclo até agora?',
    comoSeMede: 'count(vendas) e sum(vendas.valor_fechado) do cliente, desde a entrada no PCA até hoje.',
    porQueImporta:
      'É o sinal que a clínica sente no bolso, independente de qualquer taxa da cadeia estar ' +
      'melhorando. Existe para não deixar receita zero escondida atrás de taxas relativas.',
  },
];

export const NIVEIS_RISCO: NivelRisco[] = [
  {
    nivel: 'critico',
    definicao: 'Basta UM dos gatilhos abaixo, não é preciso somar todos.',
    gatilhos: [
      'Camada 0 estrutural — sem canal de entrada (WhatsApp não conectado).',
      'Camada 0 estrutural — sem registro confiável de venda, com volume de leads relevante e 30+ dias de casa.',
      'Relógio do contrato acima de 50% consumido sem elo-restrição formalmente diagnosticado ainda.',
      'Resultado absoluto zero — nenhuma venda no ciclo inteiro — com relógio do contrato acima de 25%.',
      'Aderência ao plano do mês abaixo de 30%, em dois meses seguidos.',
      'Elo-restrição piorando (não apenas estável) por dois meses seguidos.',
      'Tempo desde o último contato acima de 21 dias, sem nenhuma tentativa registrada.',
      'Camada 0 categoria B ausente ao ponto de os sinais 3-6 não serem calculáveis, e percepção do CEO já registrada como negativa.',
    ],
    cadenciaContato: 'Individual semanal.',
    acaoObrigatoria:
      'Ligação, nunca mensagem, como primeiro contato depois da promoção. Se o gatilho foi Camada ' +
      '0 estrutural, a ação imediata é destravar exatamente esse ponto antes de qualquer plano ' +
      'comercial. Se foi elo piorando dois meses seguidos, reabrir o diagnóstico completo fora do ' +
      'calendário normal de fechamento.',
    oQueMudaNoPlano:
      'O plano é reduzido, não aprofundado — menos passos, mais fáceis, foco em recuperar ' +
      'qualquer execução real. Quando o gatilho é Camada 0 estrutural, o plano do mês é, na ' +
      'prática, um único passo: destravar a Camada 0.',
  },
  {
    nivel: 'atencao',
    definicao: 'Qualquer um dos sinais abaixo presente, sem ainda cruzar o gatilho de Crítico correspondente.',
    gatilhos: [
      'Aderência entre 30% e 60% no mês corrente.',
      'Elo-restrição estável (nem piora nem melhora) por dois meses seguidos.',
      'Tempo desde o último contato entre 14 e 21 dias.',
      'Relógio do contrato entre 40% e 50% consumido sem revisão de diagnóstico recente.',
    ],
    cadenciaContato: 'Mensal (padrão), com um toque intermediário leve na semana 2.',
    acaoObrigatoria:
      'Mandar a mensagem de checagem da semana 2 mesmo que o cliente não peça nada. Vigiar os ' +
      'checks marcados nas semanas 1 e 2 com mais atenção do que um cliente Saudável exigiria.',
    oQueMudaNoPlano: 'Mesmo elo, mesmo plano — a mudança é de vigilância do CS sobre a execução.',
  },
  {
    nivel: 'saudavel',
    definicao:
      'Nenhum sinal de Atenção ou Crítico presente — Camada 0 sem achado estrutural, aderência ' +
      'acima de 60%, elo-restrição estável ou melhorando, contato recente dentro do ciclo mensal natural.',
    cadenciaContato: 'Mensal padrão.',
    acaoObrigatoria: 'Nenhuma além do rito padrão do mês.',
    oQueMudaNoPlano: 'Nada além do próprio ciclo normal — inclui a possibilidade de a semana 3 aprofundar a exigência.',
  },
  {
    nivel: 'referencia',
    definicao:
      'Saudável sustentado por três ou mais meses consecutivos, com resultado absoluto consistente ' +
      '(não só um pico isolado) e elo-restrição em progressão real através das camadas.',
    cadenciaContato: 'Mensal, mesma base do Saudável.',
    acaoObrigatoria: 'Nenhuma adicional do ponto de vista de risco.',
    oQueMudaNoPlano: 'O elo do mês pode ser mais ambicioso — testar patamares de melhoria mais agressivos.',
  },
];

export const REGRAS_TRANSICAO: RegraTransicao[] = [
  {
    de: 'qualquer nível',
    para: 'Crítico',
    regra: 'A qualquer momento, se um gatilho for cruzado — inclui regressão direta de Referência para Crítico.',
  },
  {
    de: 'Crítico',
    para: 'Atenção',
    regra:
      'Dois meses consecutivos sem nenhum gatilho de Crítico ativo (incluindo os estruturais de ' +
      'Camada 0 de fato resolvidos) e com aderência acima de 60% nesses dois meses.',
    porQue:
      'Um mês bom logo depois de um mês crítico pode ser resposta à pressão pontual da própria ' +
      'promoção, não mudança estrutural. Só um segundo mês sustentado mostra que o padrão se ' +
      'mantém. Sai para Atenção, não direto para Saudável, porque dois meses estáveis não provam ' +
      'ainda maturidade sustentada sem vigilância extra.',
  },
  {
    de: 'Atenção',
    para: 'Saudável',
    regra: 'Basta um mês sem nenhum sinal de Atenção presente.',
    porQue: 'Atenção não é emergência contratual — o custo de sair cedo demais é baixo comparado ao de sair cedo demais de Crítico.',
  },
  {
    de: 'Saudável',
    para: 'Referência',
    regra: 'Três meses consecutivos saudáveis, conforme definição do nível.',
  },
];

export const ORDENACAO_DA_FILA = {
  chavePrimaria: 'Nível: Crítico primeiro, depois Atenção, depois Saudável, depois Referência.',
  travaAntesDoDesempate:
    'Dentro de cada nível, clientes com achado de Camada 0 categoria B pendente sobem para o ' +
    'topo do próprio nível, com a etiqueta "revisão manual necessária" — se a confiabilidade do ' +
    'registro não é boa, os números que ordenariam pelos critérios seguintes também não são.',
  desempateNumerico: [
    '1. Relógio do contrato — do mais avançado para o menos avançado (recurso irrecuperável).',
    '2. Tempo desde o último contato — do maior para o menor (sinal mais barato de resolver).',
    '3. Resultado absoluto — receita zero antes de receita existente.',
    '4. Aderência ao plano do mês — da menor para a maior.',
    '5. Movimento do elo-restrição — piorando antes de estável, estável antes de melhorando (mais lento a responder).',
  ],
};
