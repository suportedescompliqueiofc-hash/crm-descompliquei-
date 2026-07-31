// Fonte: 05-operacoes-e-cs/sistema/ritos/04-reuniao-mensal.md
// O roteiro que o João abre antes de entrar na chamada com cada cliente PCA.
import type { BlocoReuniao, ConversaDificil } from './types';

export const REUNIAO_MENSAL_INTRO =
  'A reunião mensal é individual, por cliente, com cadência dupla: semanal no primeiro mês ' +
  '(intensivo de entrada) e mensal a partir do segundo mês. Se a régua de risco marcar o ' +
  'cliente como crítico, ele volta a semanal individual até estabilizar. Distinta da sessão ' +
  'tática em grupo (coletiva, tema de carteira) — aqui o assunto é um cliente só.';

export const PREPARACAO_ANTES_DA_CHAMADA = {
  quando: 'Começa no fechamento do mês (/cs-mes), não na véspera. A reunião é a apresentação de um trabalho já pronto, não o momento de produzi-lo.',
  itens: [
    'O número do mês, puxado ao vivo do CRM — a cadeia completa comparada ao mês anterior.',
    'A aderência do plano do mês que fechou — quais ações do cliente têm check marcado.',
    'A continuidade do cliente relida — em especial as últimas 2-3 entradas.',
    'O plano do mês seguinte já montado, semana por semana, com dono em cada ação — decidido e escrito ANTES da reunião, nunca ao vivo.',
    'O material do elo do mês já produzido ou já identificado no catálogo.',
    'Checar se o cliente ainda não usa Agenda e/ou Vendas de forma consistente — para não tentar montar um número que a base não sustenta.',
  ],
  seAlgoFaltar: 'A reunião não deveria acontecer ainda — adiar custa menos do que apresentar um plano frágil.',
};

export const BLOCOS_REUNIAO_MENSAL: BlocoReuniao[] = [
  {
    numero: 1,
    titulo: 'O combinado do mês passado',
    duracao: '5 min',
    oQueDizer:
      '"Antes de entrar no número, vou relembrar o que ficou combinado na nossa última conversa" ' +
      '— ler o combinado, literalmente, da continuidade. Não perguntar "lembra o que combinamos?" ' +
      '— isso transfere para o cliente um trabalho que é do sistema.',
    oQueMostrar: 'Nada ainda — é fala.',
    oQuePerguntar: 'Nada ainda — este bloco é afirmação, não diálogo.',
  },
  {
    numero: 2,
    titulo: 'O número do mês',
    duracao: '5-10 min',
    oQueDizer: '"Aqui está o número do mês, comparado com o mês anterior."',
    oQueMostrar: 'A cadeia de elos lado a lado, mês atual contra mês anterior, puxada ao vivo. Mostrar antes de narrar — narrar primeiro convida a interpretação a chegar antes do dado.',
    oQuePerguntar: 'Nada ainda — perguntas vêm no bloco 4.',
  },
  {
    numero: 3,
    titulo: 'A aderência',
    duracao: '5-10 min',
    oQueDizer:
      '"Do plano do mês passado, isso aqui foi feito, isso aqui não foi." Sem julgamento moral — ' +
      'a consequência é dita em voz alta sempre: "o que não foi executado não foi testado, e o ' +
      'que não foi testado não se sabe se funciona."',
    oQueMostrar: 'A lista de ações do plano anterior com o status de cada uma, puxado da plataforma.',
    oQuePerguntar: '"O que impediu de fazer [ação X]?" — só para as ações não feitas, e só depois de afirmar a lista inteira.',
  },
  {
    numero: 4,
    titulo: 'A leitura',
    duracao: '10-15 min',
    oQueDizer:
      '"Com base nesse número e nessa aderência, minha leitura é que o elo-restrição continua ' +
      'sendo [elo] / passa a ser [elo], pelo seguinte motivo." Declarar o grau de confiança em ' +
      'voz alta — reduzida quando a aderência foi baixa, ou quando o elo cai em Comparecimento/Fechamento sem base suficiente.',
    oQueMostrar: 'A simulação de ganho por elo, se for a primeira vez, ou um resumo se o cliente já a conhece.',
    oQuePerguntar:
      '"E do seu lado, o que você percebe? Bate com isso ou você está vendo outra coisa?" — não é ' +
      'cortesia, é fonte legítima de dado. Se divergir, registra-se como divergência (P2) — não se ' +
      'resolve elegendo uma versão como "a certa" ali na hora.',
  },
  {
    numero: 5,
    titulo: 'O plano do mês seguinte',
    duracao: '10-15 min',
    oQueDizer: 'Apresentar as 4 semanas, ação por ação, cada uma com dono e critério de sucesso.',
    oQueMostrar: 'O plano já publicado na plataforma (ou pronto para publicar), semana por semana.',
    oQuePerguntar:
      'Para cada ação do cliente: "me diz com suas palavras o que você vai fazer essa semana." O ' +
      'cliente precisa dizer em voz alta — um "ok, entendi" não é compromisso; uma frase na ' +
      'primeira pessoa, dita pelo cliente, é.',
  },
  {
    numero: 6,
    titulo: 'O que a Descompliquei entrega',
    duracao: '3-5 min',
    oQueDizer: 'Listar exatamente o que o João/a Descompliquei vai entregar neste ciclo e quando — com data, não "em breve".',
    oQueMostrar: 'A lista de entregas com prazo — a Descompliquei também tem dono e prazo, não só o cliente.',
    oQuePerguntar: 'Nada — é declaração de compromisso da Descompliquei, o espelho do bloco 5.',
  },
  {
    numero: 7,
    titulo: 'Fechamento e registro',
    duracao: '2-5 min',
    oQueDizer: 'Um resumo de uma frase do que foi decidido, e que o registro vai ser feito ainda hoje.',
    oQueMostrar: 'Nada — é declaração final.',
    oQuePerguntar:
      'Nada. Registrar no mesmo dia em continuidade.md — o detalhe fino de uma conversa se perde em horas, não em dias.',
  },
];

export const REGRAS_DURAS_DA_REUNIAO = [
  'Nunca apresentar plano novo sem antes apresentar a aderência do plano velho.',
  'Nunca trocar de elo por falta de resultado sem antes olhar aderência.',
  'Um elo por mês, nunca dois.',
  'Nunca apresentar número que a base ainda não sustenta — se a Agenda/Vendas não está sendo usada de forma consistente, dizer explicitamente que o assunto de hoje é adoção da plataforma, não o elo em si.',
];

export const CONVERSAS_DIFICEIS: ConversaDificil[] = [
  {
    caso: 'O cliente não executou nada',
    comoConduzir:
      'Não abrir com cobrança — abrir com constatação e pergunta de causa: "Isso significa que, ' +
      'por enquanto, a gente não testou se o plano funciona — não é que ele falhou, é que ele não ' +
      'rodou. O que aconteceu no seu lado esse mês?" Se a causa for prioridade/tempo, reduzir o ' +
      'escopo do plano seguinte ao mínimo executável. Se repetir por 2 meses seguidos, nomear o padrão.',
  },
  {
    caso: 'O resultado não veio apesar de o cliente ter executado',
    comoConduzir:
      'A conversa mais importante para a credibilidade do João — prova que o sistema é também ' +
      'responsabilização da própria Descompliquei. "Você fez sua parte, isso está claro no check. ' +
      'O número não veio como a gente esperava. Isso pode significar duas coisas: ou o elo que eu ' +
      'apontei não era o elo certo, ou a ação certa para esse elo era outra." Não trocar de elo na ' +
      'hora — isso é trabalho do próximo /cs-mes.',
  },
  {
    caso: 'O cliente discorda do diagnóstico',
    comoConduzir:
      'Não empurrar o número contra o cliente — voltar ao bloco 4 e tratar a divergência como ' +
      'dado. Se genuína e relevante, registrar como divergência e considerar no próximo ' +
      'fechamento — não "vencer" a discussão citando a query.',
  },
  {
    caso: 'O cliente quer atacar outro elo que não o eleito',
    comoConduzir:
      '"Se a gente mexer em dois elos ao mesmo tempo, no fechamento do mês que vem eu não vou ' +
      'conseguir te dizer qual dos dois causou o resultado." Se a vontade persistir e for bem ' +
      'fundamentada, registrar como divergência para reconsideração no próximo fechamento — não ' +
      'mudar o plano do mês em curso por pressão na reunião.',
  },
  {
    caso: 'O cliente está insatisfeito e menciona o contrato',
    comoConduzir:
      'Não reagir na defensiva, não fazer promessa nova para acalmar. Voltar ao que está ' +
      'factualmente registrado — mostrar exatamente o que foi entregue e o que foi combinado. ' +
      'Registrar a insatisfação como divergência/observação no mesmo dia, com detalhe do que foi dito.',
  },
];
