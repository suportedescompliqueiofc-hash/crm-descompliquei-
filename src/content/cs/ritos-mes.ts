// Fonte: 05-operacoes-e-cs/sistema/ritos/00-o-mes-do-cs.md
// O calendário operacional: rito diário, semanal, as 4 semanas do MÊS DO
// CALENDÁRIO (compartilhado pela carteira inteira, não o ciclo de cada
// cliente) e a cadência individual.
//
// CORREÇÃO DE CONCEITO (2026-07-31): este arquivo definia o "mês do CS" como
// o mês de ciclo de CADA CLIENTE (ancorado em `cliente_desde`), com cada
// cliente na sua própria semana 1-4 num dado momento. Estava errado. O CEO
// corrigiu: "A gente tinha falado que todos os clientes iam seguir a mesma
// ideia de carteira: toda semana, todo mundo tá na semana 1, todo mundo tá na
// semana 2, todo mundo tá na semana 3, todo mundo tá na semana 4. Essa
// divisão não faz muito sentido. Todos os clientes vão viver a mesma semana,
// até porque a gente tem 4 semanas no mês, as semanas são sequenciais." As
// quatro semanas são as semanas do MÊS CORRENTE e a carteira inteira vive a
// mesma semana ao mesmo tempo — é isso que sustenta a sessão tática em grupo
// existir. O que NÃO muda: o ciclo individual de 180 dias de cada cliente
// (`dias_de_ciclo`, ancorado em `cliente_desde`) continua existindo — é o
// relógio do CONTRATO (quanto falta, em que mês do PCA o cliente está), não
// o ritmo semanal do rito. Ver também o cabeçalho de
// `src/components/cs/semana/ritoDoMes.ts`, que implementa o cálculo.
import type { SemanaDoMes } from './types';

/**
 * Nome do export mantido por compatibilidade — é importado por
 * `src/components/cs/metodo/RitosView.tsx` (tela de Método, fora do escopo
 * desta correção). O CONTEÚDO abaixo já está corrigido; só o identificador
 * ficou desatualizado. Quem editar RitosView.tsx deveria renomear para algo
 * como `MES_E_DA_CARTEIRA_NAO_DE_CADA_CLIENTE` e também corrigir os títulos
 * hardcoded "O mês é do cliente, não da empresa" e "As quatro semanas do mês
 * (de cada cliente)" que aparecem nesse arquivo.
 */
export const O_MES_E_DO_CLIENTE_NAO_DA_EMPRESA =
  'O "mês" de que este rito fala é o mês do CALENDÁRIO, não o mês de ciclo de cada cliente. A ' +
  'carteira inteira vive a mesma semana ao mesmo tempo: numa dada segunda-feira, todo cliente ' +
  'está na semana 1, ou todo cliente está na semana 2, e assim por diante — as quatro semanas ' +
  'são sequenciais dentro do mês corrente (decisão do CEO, 2026-07-31: "todos os clientes vão ' +
  'viver a mesma semana"). É essa sincronia que sustenta a sessão tática em grupo existir. O ' +
  'ciclo individual de 180 dias de cada cliente (ancorado em `cliente_desde`) continua ' +
  'existindo, mas é o relógio do CONTRATO — quanto falta, em que mês do PCA o cliente está —, ' +
  'não o ritmo semanal do rito.';

export const RITO_DIARIO = {
  duracao: '15 minutos',
  passos: [
    'Rodar /cs — puxa a fila da carteira inteira já ordenada pela régua de risco. Único passo que dá visão da carteira inteira.',
    'Checar pedidos fora do rito — mensagem, ligação ou pedido de reunião sob demanda tem prioridade sobre a fila ordenada.',
    'Checar se algum cliente cruzou um gatilho de Crítico desde ontem — muda a cadência de contato imediatamente, não espera a varredura semanal.',
    'Checar a agenda do dia — reunião individual marcada ou sessão tática em grupo, se cair hoje.',
    'Executar o topo da fila, se houver algo pendente.',
    'Registrar — qualquer contato, decisão ou fato do dia vira uma entrada em continuidade.md antes de fechar o rito. Se não foi registrado, para o sistema não aconteceu.',
  ],
  diaSemAcao:
    'É legítimo e esperado, boa parte dos dias, que não haja nada a executar — isso não é o ' +
    'rito falhando, é o rito funcionando: ele existe para achar os dias em que HÁ algo a ' +
    'fazer, não para inventar trabalho. O erro seria pular o rito diário nesses dias.',
};

export const RITO_SEMANAL = {
  descricao: 'Uma vez por semana, tempo maior e mais deliberado que o diário.',
  oQueSeDecide: [
    'Quem sobe para cadência semanal individual e quem volta para mensal, aplicando os critérios da régua de risco.',
    'Em que semana do mês do calendário a carteira inteira está — as quatro semanas são sequenciais e compartilhadas, não por cliente.',
    'O tema da sessão tática em grupo da semana.',
    'Aderência agregada da carteira, como leitura de saúde do próprio sistema de CS.',
  ],
};

export const SEMANAS_DO_MES: SemanaDoMes[] = [
  {
    numero: 1,
    titulo: 'Instalar',
    objetivo: 'Garantir que o mês começou de fato. Um plano entregue numa reunião não é um plano em execução.',
    oQueOCsFaz: [
      'Ponto de checagem no MEIO da semana (não no fim): o cliente viu o plano? A primeira ação já saiu do papel?',
      'Se não houve nenhum check até o meio da semana, contato reforçando o plano e perguntando qual é o obstáculo.',
      'Confirmar que o cliente efetivamente abriu/leu o plano na plataforma.',
    ],
    oQueOCsNaoFaz: [
      'Não julga a aderência do mês ainda — uma semana não é amostra suficiente.',
      'Não muda o elo nem o plano — ainda não há dado para justificar mudança.',
      'Não trata a semana 1 como leitura diagnóstica. É checagem de instalação, não medição.',
    ],
    porQue:
      'Se o CS esperar até o fim da semana 1 para descobrir que o mês não instalou, não sobra ' +
      'tempo dentro da própria semana para corrigir — o problema só seria descoberto na semana 2.',
  },
  {
    numero: 2,
    titulo: 'Corrigir',
    objetivo:
      'Primeira leitura de dado real do mês, e o PONTO DE RECUPERAÇÃO do ciclo mensal — depois ' +
      'da semana 2, um mês com aderência baixa está perdido.',
    oQueOCsFaz: [
      'Lê a aderência acumulada (checks marcados) das semanas 1 e 2.',
      'Se a aderência está fraca: intervém com contato mais forte — ligação, não mensagem.',
      'Na ligação, identifica a causa concreta: falta de tempo, falta de clareza, falta de convicção.',
    ],
    oQueOCsNaoFaz: [
      'Não troca de elo aqui. Aderência fraca não é sinal de que o elo está errado — é sinal de que o plano não foi testado ainda.',
      'Não fica passivo esperando a semana melhorar sozinha.',
    ],
  },
  {
    numero: 3,
    titulo: 'Aprofundar ou escalar',
    objetivo: 'Bifurcação com base na leitura da semana 2.',
    oQueOCsFaz: [
      'Se a aderência está boa: subir a exigência e entregar a segunda camada de material do mesmo elo — nunca abrir um elo novo.',
      'Se a aderência continua ruim: escalar — conversa direta sobre compromisso (não mais sobre a tarefa específica), e registrar a divergência em continuidade.md como fato administrado.',
    ],
    oQueOCsNaoFaz: [
      'Não troca de elo mesmo na escalada — a decisão de elo é exclusiva da semana 4.',
      'Não evita a conversa de escalada por educação ou constrangimento.',
    ],
  },
  {
    numero: 4,
    titulo: 'Fechar e planejar',
    objetivo: 'Fechar o mês que termina e abrir o mês seguinte na mesma reunião (via /cs-mes).',
    oQueOCsFaz: [
      'Mede o mês contra a série completa desde o cadastro do cliente.',
      'Congela a aderência do mês — a única exceção documentada ao princípio de que nenhum número mora em arquivo.',
      'Diagnostica o elo do mês seguinte.',
      'Produz o plano de 4 semanas e o material do novo elo.',
      'Agenda e realiza a reunião mensal com o cliente.',
    ],
    oQueOCsNaoFaz: [
      'Não começa a execução do mês novo ainda — isso é semana 1 do próximo ciclo.',
      'Não pula a reunião mesmo quando o mês foi ruim — pelo contrário, é exatamente quando o mês foi ruim que a reunião presencial precisa acontecer.',
    ],
  },
];

export const SESSAO_TATICA_CALENDARIO = {
  quandoCai: 'Segunda-feira, 8h (decidido pelo CEO em 2026-07-30)',
  porNaoPertenceASemanaDeNenhumCliente:
    'Ela é possível exatamente porque a carteira inteira vive a mesma semana ao mesmo tempo — ' +
    'não haveria sessão de grupo se cada cliente estivesse numa fase diferente do próprio ciclo.',
  comoOTemaEEscolhido:
    'O tema sai do elo-restrição mais frequente entre os diagnósticos ativos da carteira ' +
    'naquela semana — apurado na varredura semanal, contando quantos clientes têm hoje aquele ' +
    'elo como elo do mês corrente. Se três clientes estão travados em Agendamento, ensinar o ' +
    'roteiro uma vez em grupo resolve os três de uma vez — três reuniões individuais gastariam ' +
    'três vezes o tempo do João para entregar o mesmo valor.',
};

export const CADENCIA_INDIVIDUAL = {
  primeiros30dias: 'Reunião individual semanal, independente do que a régua de risco diria depois — intensivo de entrada, sempre.',
  depoisDe30dias: 'Reunião individual mensal, alinhada à semana 4 (fechamento).',
  sobDemanda: 'A qualquer momento, se o cliente ou o CS julgar necessário — não espera nenhum calendário.',
  reguaDeRisco:
    'A régua de risco pode promover um cliente de mensal para semanal a qualquer momento ' +
    '(cliente entra em Crítico), e devolve para mensal quando ele estabiliza pelo critério de saída.',
};

export const CALENDARIO_DE_FECHAMENTO =
  'Decisão do CEO (2026-07-29): hoje, com 7 clientes, todos fecham em mês-calendário — a ' +
  'semana 4 de cada cliente cai na última semana do mês corrente. O gatilho de migração é a ' +
  'carteira passar de ~15 clientes: a partir daí, o fechamento passa a rodar em 4 coortes ' +
  'semanais escalonadas, para distribuir o volume ao longo do mês.';

export function getSemanaDoMes(numero: 1 | 2 | 3 | 4): SemanaDoMes | undefined {
  return SEMANAS_DO_MES.find((s) => s.numero === numero);
}
