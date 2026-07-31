// Fonte: 05-operacoes-e-cs/sistema/01-a-cadeia.md e proposta-novos-elos.md
// O modelo de diagnóstico: 4 camadas, 8 elos, o critério de elo-restrição.
// Estrutura aprovada pelo CEO em 2026-07-30, terceira rodada de revisão.
import type { Camada, Elo, EloId } from './types';

export const CRITERIO_DE_AGRUPAMENTO =
  'O que agrupa um elo numa camada é o tipo de trabalho que move o número, não o lugar que ' +
  'ele ocupa numa sequência de funil. Fazer o lead agendar e comparecer não é gerar demanda ' +
  '— é o mesmo trabalho de follow-up e persuasão que fecha a venda e define o ticket. O ' +
  'modelo anterior agrupava por posição no funil (Demanda → Agendamento → Comparecimento → ' +
  'Fechamento numa fila só); o CEO corrigiu isso explicitamente.';

export const CAMADAS: Camada[] = [
  {
    id: 0,
    nome: 'Adoção',
    ehElo: false,
    naturezaDoTrabalho: 'Configuração/hábito de uso da plataforma',
    oQueE:
      'Confirmação de que a plataforma está configurada e a clínica está de fato registrando ' +
      'o que faz nela. Não é etapa do funil comercial — é a pré-condição para que qualquer ' +
      'taxa medida signifique algo. Enquanto a Camada 0 não passa, o diagnóstico dos 8 elos ' +
      'não é confiável: a base de dado que sustenta o cálculo pode estar incompleta por falta ' +
      'de uso, não por resultado real da clínica.',
    elos: [],
    observacao:
      'Checklist: WhatsApp conectado, IA de recepção ativa, confirmação de consulta ativa, ' +
      'lembrete de consulta ativo, follow-up automático ligado, uso confiável de Agenda e Vendas. ' +
      'Portão do diagnóstico inicial, revisitado em todo fechamento mensal antes de olhar ' +
      'qualquer elo. Se um item crítico falha (registro de agendamento, registro de venda), a ' +
      'Camada 0 vira o trabalho do mês inteiro — não se calcula elo-restrição sobre dado que não existe.',
  },
  {
    id: 1,
    nome: 'Aquisição',
    ehElo: true,
    naturezaDoTrabalho: 'Geração de demanda — marketing, tráfego pago, indicação',
    oQueE:
      'Isto não é o foco da Descompliquei: o produto é assessoria comercial, não agência de ' +
      'tráfego. Aquisição termina no instante em que o lead existe no CRM — o que acontece ' +
      'depois é trabalho da Camada 2.',
    elos: ['demanda'],
  },
  {
    id: 2,
    nome: 'Comercial',
    ehElo: true,
    naturezaDoTrabalho: 'Follow-up, persuasão, processo, conversa',
    oQueE:
      'Tudo que acontece depois que o lead já existe: fazer ele responder, agendar, ' +
      'comparecer, fechar, pagar um ticket que valha a pena, e fechar rápido. É onde a ' +
      'Descompliquei entrega o produto e por isso concentra a maior camada — 6 dos 8 elos.',
    elos: ['agendamento', 'resgate_lead_frio', 'comparecimento', 'fechamento', 'ticket', 'ciclo_venda'],
  },
  {
    id: 3,
    nome: 'Retenção',
    ehElo: true,
    naturezaDoTrabalho: 'Processo de relacionamento pós-venda',
    oQueE:
      'Distinto de Comercial (fechar a primeira venda) e de Aquisição (gerar o lead). Tende a ' +
      'aparecer mais tarde no ciclo (capstone) ou já no 2º ciclo, se o contrato renovar.',
    elos: ['recompra'],
  },
];

export const ELOS: Elo[] = [
  {
    id: 'demanda',
    nome: 'Demanda',
    camada: 1,
    oQueE: 'Volume de lead novo entrando no funil no período.',
    formula: 'count(leads) no período, por origem',
    origemBanco: ['leads.criado_em', 'leads.origem'],
    oQueSignificaEstarQuebrado:
      'Poucos leads chegando, independente de quão bem a clínica converte o que já tem. Um ' +
      'funil comercial eficiente com pouca entrada ainda gera pouca receita — mas a correção ' +
      'não é comercial, é de aquisição (fora do produto principal).',
    causasTipicas: [
      'Sem investimento em tráfego',
      'Campanha mal segmentada',
      'Dependência de indicação orgânica que não escala',
      'Canal de convênio saturado',
      'Base de pacientes inativos nunca reativada',
    ],
    faixaReferenciaMercado:
      'Nenhuma faixa específica de clínica encontrada com confiança — declarado. A única ' +
      'referência indireta é velocidade de resposta ao lead (marketing/vendas em geral), mas ' +
      'isso já está resolvido pela automação da plataforma e pertence à Camada 0.',
  },
  {
    id: 'agendamento',
    nome: 'Agendamento',
    camada: 2,
    oQueE: 'Taxa de leads que viram agendamento marcado.',
    formula: 'count(agendamentos distintos por lead) / count(leads)',
    origemBanco: ['agendamentos.criado_em', 'leads.criado_em'],
    oQueSignificaEstarQuebrado:
      'A clínica recebe o lead e não consegue marcar horário com ele — o lead esfria, não ' +
      'responde a tempo, ou nunca é abordado com convicção.',
    causasTipicas: [
      'Demora no primeiro contato',
      'Ausência de script de primeiro atendimento pós-handoff',
      'Sem cadência de follow-up',
      'Sem critério de qualificação',
    ],
    faixaReferenciaMercado:
      'Velocidade de resposta ao lead já coberta na Camada 0/1 — não repetida aqui porque já ' +
      'está resolvida pela automação (IA de recepção).',
    notaDeReclassificacao:
      'Reclassificado da Camada Aquisição (modelo anterior) para Comercial: as causas típicas ' +
      'são de follow-up e persuasão sobre lead que já existe, nunca de gerar mais lead.',
    leituraComplementar: {
      nome: 'Contato Efetivo (não é elo próprio)',
      texto:
        'A proporção de leads que responderam ao menos 1 mensagem está saturada entre 83,7% e ' +
        '95,3% em 6 das 7 clínicas — quase todo mundo responde ao menos uma vez, porque a IA ' +
        'insiste. Não vira elo com painel próprio, mas serve como leitura de causa dentro de ' +
        'Agendamento: se a resposta está saturada e o Agendamento ainda assim está baixo, a ' +
        'causa não é "ninguém responde" — é o que acontece depois da resposta.',
    },
  },
  {
    id: 'resgate_lead_frio',
    nome: 'Resgate de Lead Frio',
    camada: 2,
    oQueE:
      'Entre os leads que já trocaram pelo menos duas mensagens com a clínica, qual proporção ' +
      'teve um hiato de silêncio (sem mensagem do lead) de 7 dias ou mais e depois voltou a ' +
      'mandar mensagem.',
    formula:
      'tx_resgate_7d = count(leads com hiato >=7 dias entre mensagens de entrada, seguido de ' +
      'nova mensagem de entrada) / count(leads com 2+ mensagens de entrada)',
    origemBanco: ['mensagens.lead_id', "mensagens.direcao='entrada'", 'mensagens.criado_em'],
    oQueSignificaEstarQuebrado:
      'Lead esfria e não volta — mesmo tendo demonstrado interesse real, a clínica perde um ' +
      'contato que já custou o CPL e já teve conversa iniciada.',
    causasTipicas: [
      'Sequência de follow-up automático mal configurada ou inexistente (Camada 0)',
      'Sem resgate manual dirigido a leads antigos parados',
      'Mensagem de reengajamento genérica ou ausente',
      'Sem oferta de reabertura de conversa',
    ],
    faixaReferenciaMercado: 'Não encontrada com confiança — declarado.',
    notaDeReclassificacao:
      'Elo novo (aceito na 3ª rodada de revisão), testado com SQL real nas 7 clínicas PCA. Não ' +
      'é o mesmo que "reativação de base" (depende de marcação manual que quase ninguém usa: ' +
      '1 caso em 6.955 leads) nem o mesmo que Ciclo de Venda (que mede tempo até fechar, não ' +
      'se o lead voltou a interagir). Prova de que mede eficácia, não presença de automação: ' +
      'Anna Clara tem a 2ª maior taxa (29,6%) com follow-up automático desligado; Juliana tem ' +
      'follow-up ligado e a 2ª menor taxa (10,7%).',
    leituraComplementar: {
      nome: 'Ressalva de confiabilidade — cliente recente',
      texto:
        'Clientes com menos de 30-60 dias de operação não têm calendário suficiente para um ' +
        'hiato de 7+ dias existir. Taxa de 0% nesse caso não é "resgate ruim", é "amostra ' +
        'impossível dado o tempo de casa".',
    },
  },
  {
    id: 'comparecimento',
    nome: 'Comparecimento',
    camada: 2,
    oQueE: 'Taxa de agendamentos marcados que efetivamente compareceram.',
    formula: "status='realizado' / (status in ('realizado','nao_compareceu'))",
    origemBanco: ['agendamentos.status', 'agendamentos.data_hora_inicio'],
    oQueSignificaEstarQuebrado:
      'A clínica marca o horário mas o paciente não aparece — o problema não é atrair nem ' +
      'convencer, é fazer a pessoa chegar.',
    causasTipicas: [
      'Confirmação de consulta desligada (item de Camada 0)',
      'Sem lembrete no dia',
      'Sem política de reagendamento',
      'Consulta marcada longe demais no tempo sem contato intermediário',
    ],
    faixaReferenciaMercado:
      'No-show odontológico varia por fonte — 7,4% (Planet DDS 2025), 15% média geral, top ' +
      '10% dos consultórios em ~1%. Mercado americano — usar como ordem de grandeza, não meta rígida.',
    notaDeReclassificacao:
      'Reclassificado da Camada Aquisição para Comercial. agendamentos.resultado é coluna ' +
      'morta (100% NULL, nunca escrita por nenhuma tela) — o dado real sempre esteve em ' +
      'agendamentos.status, 100% preenchida onde a clínica usa a tela de Agenda. Não há ' +
      'cegueira neste elo; havia consulta na coluna errada. A plataforma não lê automaticamente ' +
      'a resposta do paciente à confirmação/lembrete — mudar o status é sempre clique humano.',
  },
  {
    id: 'fechamento',
    nome: 'Fechamento',
    camada: 2,
    oQueE: 'Taxa de comparecimentos que viraram venda.',
    formula: "count(vendas) / count(agendamentos com status='realizado'), por mês-calendário",
    origemBanco: ['vendas.data_fechamento', 'agendamentos.status'],
    oQueSignificaEstarQuebrado:
      'O paciente chega até a cadeira, ouve a proposta, e não fecha ali nem depois.',
    causasTipicas: [
      'Sem roteiro de consulta',
      'Apresentação de orçamento fraca',
      'Sem tratamento de objeção',
      'Sem proposta formal',
      'Sem follow-up pós-consulta',
    ],
    faixaReferenciaMercado:
      'Aceitação de plano de tratamento (case acceptance) reportada entre 42% e 60% em média, ' +
      '70-85% em alta performance, ADA recomenda 75-80%. Mercado americano — e hoje não ' +
      'medimos aceitação de orçamento no CRM (valor_orcado preenchido em só 3 de 555 vendas); ' +
      'usar só como ordem de grandeza.',
    notaDeReclassificacao:
      'Fechamento nunca dependeu de agendamentos.resultado (morta) — mora numa tabela própria, ' +
      'vendas, com valor_fechado/data_fechamento 100% preenchidos quando a venda existe. ' +
      'vendas.agendamento_id é quase sempre NULL (28/586 no banco inteiro) — a venda é ' +
      'registrada como evento independente, nem sempre amarrado a uma consulta específica.',
  },
  {
    id: 'ticket',
    nome: 'Ticket',
    camada: 2,
    oQueE: 'Valor médio fechado por venda. Não é taxa — é grandeza monetária.',
    formula: 'avg(vendas.valor_fechado)',
    origemBanco: ['vendas.valor_fechado'],
    oQueSignificaEstarQuebrado:
      'A clínica fecha vendas, mas de baixo valor — procedimento isolado em vez de plano ' +
      'completo, ou mix de convênio dominando sobre particular.',
    causasTipicas: [
      'Venda de procedimento avulso em vez de plano de tratamento completo',
      'Ausência de tabela de valor e ancoragem',
      'Sem oferta de upgrade/pacote',
      'Dependência de convênio que estrutura o preço por tabela baixa',
    ],
    faixaReferenciaMercado: 'Nenhuma faixa específica de ticket encontrada com confiança — declarado.',
    leituraComplementar: {
      nome: 'Concentração de receita (Pareto de pacientes)',
      texto:
        'Amostra 2026-07-30: Anna Clara 65,8%, Tayane 52,4%, Juliana 45,3%, Monção 41,4% da ' +
        'receita nos 20% de pacientes de maior valor. Não é elo novo, é leitura dentro de ' +
        'Ticket — a ação corretiva (upsell/mix na base ampla) é a mesma.',
    },
  },
  {
    id: 'ciclo_venda',
    nome: 'Ciclo de Venda',
    camada: 2,
    oQueE: 'Quanto tempo leva, desde a entrada do lead, até a primeira venda dele fechar.',
    formula: 'data_fechamento (1ª venda do lead) - leads.criado_em',
    origemBanco: ['vendas.data_fechamento', 'vendas.lead_id', 'leads.criado_em'],
    oQueSignificaEstarQuebrado:
      'O ciclo se arrasta — o lead demora demais entre existir e comprar, o que empata ' +
      'capital de aquisição e atenção da equipe por mais tempo que o necessário.',
    causasTipicas: [
      'Sem follow-up pós-consulta estruturado',
      'Sem prazo/gatilho de decisão oferecido ao paciente',
      'Negociação arrastada sem critério de fechamento',
    ],
    faixaReferenciaMercado:
      'Ciclo de venda odontológico americano costuma ficar entre 30 e 90 dias — não comparável ' +
      '1:1 ao que medimos aqui (nosso ciclo mede tempo até a primeira venda registrada, não até ' +
      'a aceitação eventual de um orçamento formal).',
  },
  {
    id: 'recompra',
    nome: 'Recompra',
    camada: 3,
    oQueE: 'Proporção de pacientes com venda que voltaram a comprar.',
    formula: 'tx_recompra = count(pacientes com >1 venda) / count(pacientes com >=1 venda)',
    origemBanco: ['vendas.lead_id', 'vendas.valor_fechado', 'vendas.data_fechamento'],
    oQueSignificaEstarQuebrado:
      'A clínica atende, fecha, e o paciente nunca mais volta — toda a receita depende de ' +
      'captação nova, mês após mês.',
    causasTipicas: [
      'Sem programa de manutenção/retorno periódico',
      'Sem contato pós-tratamento',
      'Procedimento vendido como evento único',
      'Ausência de régua de recompra (a plataforma tem os recursos — cadências e follow-up — ' +
        'mas nenhuma das 7 clínicas os usa direcionados a paciente já-cliente)',
    ],
    faixaReferenciaMercado:
      'Nenhuma confiável e específica de odontologia/estética encontrada. Referência geral de ' +
      'negócios (Reichheld/Bain via HBR): +5 pontos de retenção pode significar +25% de lucro ' +
      '— não é benchmark de taxa de recompra em clínica, citado só como ordem de grandeza.',
  },
];

export const CRITERIO_ELO_RESTRICAO = {
  definicao:
    'O elo-restrição não é o elo com a pior taxa. É o elo cuja melhoria realista produz o ' +
    'maior ganho de receita simulado. Um elo pode ter a taxa mais baixa da cadeia e ainda ' +
    'assim não valer a pena atacar primeiro, porque melhorá-lo até um patamar realista gera ' +
    'menos receita adicional do que melhorar outro elo.',
  metodo:
    'Para cada um dos 6 elos comerciais, simular "se este elo subisse até um patamar ' +
    'realista, quanta receita a mais isso geraria, mantendo os outros 5 fixos no valor ' +
    'atual?". Patamar realista é o que uma mudança de processo (não um milagre) plausivelmente ' +
    'entrega em 30-60 dias. O elo de maior ganho simulado é o elo-restrição do mês. Ticket ' +
    'entra na simulação como grandeza monetária (multiplica a receita final), os outros cinco ' +
    'como taxa de conversão.',
  camada0EhPortao:
    'A Camada 0 não compete no ganho simulado — é verificada antes, como portão. Só se ' +
    'calcula elo-restrição depois que a Camada 0 está minimamente passada. Se a Camada 0 ' +
    'falha, ela é o trabalho do mês, não um item que concorre no ranking de ganho.',
  exemploIlustrativo: {
    aviso: 'Exemplo numérico ilustrativo — não é dado de cliente real.',
    tabela: [
      ['Demanda', '200 leads'],
      ['Taxa Agendamento', '40% → 80 agendamentos'],
      ['Taxa Comparecimento', '50% → 40 comparecimentos'],
      ['Taxa Fechamento', '60% → 24 vendas'],
      ['Ticket médio', 'R$ 2.000'],
      ['Receita do mês', '24 × 2.000 = R$ 48.000'],
    ],
    conclusao:
      'A pior taxa é Agendamento (40%). Simulando o ganho realista de cada elo: Demanda +20% ' +
      '→ +R$ 9.600; Agendamento 40%→50% → +R$ 12.000; Comparecimento 50%→65% → +R$ 14.400; ' +
      'Fechamento 60%→70% → +R$ 8.000; Ticket R$2.000→R$2.700 → +R$ 16.800. O maior ganho é ' +
      'Ticket (+R$ 16.800), não Agendamento, que tinha a pior taxa. O elo-restrição do mês é Ticket.',
  },
  porQueARegraExiste:
    'Taxa ruim chama atenção visualmente, mas receita não se mede em atenção — se mede em ' +
    'reais. Quem diagnostica pela pior taxa está resolvendo o problema mais visível, não o mais caro.',
  excecaoCamada1e3:
    'Quando o gargalo real do cliente está em Demanda (poucos leads entrando, nenhuma ' +
    'quantidade de melhoria comercial resolve) ou quando os 6 elos comerciais já estão ' +
    'saudáveis e o uso natural do tempo restante é Recompra, o elo-restrição sai da Camada 2 ' +
    'e vai para a camada correspondente. Isso é raro (5 das 7 clínicas da carteira têm o ' +
    'gargalo dentro de Comercial), mas precisa ser reconhecido, não forçado a caber em ' +
    'Comercial só porque é onde a maioria está.',
  aritmeticaDoCiclo:
    'O ciclo do PCA é de 180 dias — 6 planos mensais. Com a Camada Comercial concentrando ' +
    'exatamente 6 elos, o encaixe é 1:1 para o cliente comercial-padrão: um elo comercial por ' +
    'mês, sem Demanda nem Recompra disputando espaço — enquanto Demanda e Recompra não ' +
    'competirem pelos mesmos 6 meses (caso real: Dra. Juliana, elo-restrição Demanda, recebeu ' +
    'mentoria de tráfego pago como bônus do PCA, fora do ciclo comercial padrão).',
};

export function getElo(id: EloId): Elo | undefined {
  return ELOS.find((e) => e.id === id);
}

export function getCamada(id: 0 | 1 | 2 | 3): Camada | undefined {
  return CAMADAS.find((c) => c.id === id);
}

export function getElosDaCamada(id: 0 | 1 | 2 | 3): Elo[] {
  const camada = getCamada(id);
  if (!camada) return [];
  return ELOS.filter((e) => camada.elos.includes(e.id));
}
