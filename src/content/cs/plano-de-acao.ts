// Fonte: 05-operacoes-e-cs/sistema/04-plano-de-acao.md
// O entregável central do sistema — a anatomia de um plano de ação mensal.
import type { ParDeAcao, ErradoCerto } from './types';

export const O_QUE_E_UM_PLANO =
  'A tradução de um elo diagnosticado em ações executáveis dentro de um mês, calibradas à ' +
  'capacidade real de uma clínica específica. Se um plano não permite responder, ao final do ' +
  'mês, "essa hipótese de causa estava certa ou errada", ele não é um plano de ação — é uma ' +
  'lista de tarefas com aparência de plano.';

export const O_QUE_NAO_E_UM_PLANO = [
  'Lista de desejos — se uma ação não serve para mover o critério de sucesso do elo do mês, não entra, mesmo que seja uma boa prática em si.',
  'Checklist genérico de boas práticas — cada ação nasce do diagnóstico específico daquele cliente naquele mês.',
  'O mesmo plano para todo mundo — duas clínicas com o mesmo elo-restrição recebem planos parecidos em estrutura, nunca idênticos em conteúdo.',
  'Uma tarefa que a plataforma já faz sozinha, reescrita como se fosse trabalho do cliente.',
  'Um material que o João, a equipe ou o próprio cliente produzem.',
];

export const EVIDENCIA_QUE_MOTIVA_O_RIGOR =
  'Existe no CRM um plano mensal real de julho/2026 com 15 passos e 1 concluído — 6,7% de ' +
  'aderência. Gerado por IA sem curadoria humana. Um plano com 6,7% de aderência não mediu ' +
  'nada — não confirmou nem refutou a hipótese do elo, só queimou um mês. Todo plano novo é ' +
  'comparado mentalmente contra esse caso.';

export const UM_ELO_POR_PLANO = {
  regra:
    'O padrão continua sendo 1 elo por plano — deixou de ser regra rígida. Palavras do CEO: ' +
    '"um elo só é o ideal, porém se tiver mais também não tem problema." O motivo do padrão não ' +
    'mudou: o cliente não executa duas mudanças simultâneas com a mesma qualidade.',
  quandoAExcecaoEAceitavel: [
    'Justificativa registrada em continuidade.md antes de o plano ser publicado — os dois elos compartilham a mesma causa raiz e a mesma ação os resolve, ou o cliente já está saudável num elo e sobra capacidade real para um segundo mais leve.',
    'Declarar a perda de atribuição — se os dois elos melhorarem no mesmo mês, não se sabe qual ação causou qual resultado, e isso precisa estar escrito, não escondido.',
    'Continua valendo o teto de 3 ações/semana somando os dois elos.',
  ],
};

export const REGRA_PERMANENTE_PLATAFORMA_JA_FAZ = {
  titulo: 'Nunca dar ao cliente uma ação que a plataforma já faz',
  citacaoDoCeo:
    '"Nunca, jamais deve ter uma ação declarada por cliente de alguma função e ferramenta que a ' +
    'plataforma já possui." O máximo permitido é mandar o cliente usar, ativar ou configurar a ' +
    'ferramenta que já existe — nunca reescrever à mão o que ela automatiza.',
  errosEcorrecoes: [
    { errado: 'Responder todo lead novo em até 10 minutos', certo: 'Assumir toda conversa que a IA passar para humano (handoff) dentro do mesmo turno de atendimento' },
    { errado: 'Enviar mensagem de confirmação 24h antes da consulta', certo: 'Ativar a confirmação imediata e o lembrete automático em Configurações de Agendamento' },
    { errado: 'Script de primeiro atendimento (posicionado em Agendamento)', certo: 'O script que faz sentido é o de fechamento — a IA já faz o pré-atendimento' },
    { errado: 'Cadência de follow-up genérica pedida ao cliente', certo: 'Só cabe uma cadência paralela e complementar — ex.: resgate manual de quem já esgotou a sequência automática' },
    { errado: 'Arrastar o lead para a próxima etapa do funil', certo: 'Não existe kanban na plataforma — o Pipeline foi removido. A métrica de funil já é calculada automaticamente no Dashboard' },
  ] as ErradoCerto[],
  evidenciaQueSustenta:
    'Confirmação de consulta ligada em 0 de 7 clientes PCA, lembrete em 0 de 7, follow-up ' +
    'automático em 4 de 7. Antes de qualquer ação nova de processo, o primeiro passo de quase ' +
    'todo plano é checar se o recurso equivalente já existe desligado.',
  oQueContinuaSendoTrabalhoHumanoLegitimo: [
    'Interpretar a resposta do paciente a uma confirmação/lembrete e mudar o status do agendamento.',
    'Negociar, fechar venda e agendar de fato — a IA é proibida disso pelo próprio prompt.',
    'Definir o alvo de meta de receita e a estratégia por trás dele.',
    'Decidir a sequência e o texto das Cadências manuais.',
    'Marcar os passos do plano como concluídos — sempre um clique humano.',
    'Preencher origem de leads capturados fora do WhatsApp e do Meta Ads da própria Descompliquei.',
  ],
};

export const ANATOMIA_DO_PLANO = {
  tetoDeAcoesPorSemana: {
    limite: 'No máximo 3 ações de dono Cliente por semana.',
    porQue:
      'A taxa de execução cai com a carga — acima de 3 pedidos simultâneos, o cliente não ' +
      'executa todas, executa a que lembra ou a mais fácil. Acima do teto, nada é testado de ' +
      'verdade. O teto é por semana, não por mês (4 semanas × 3 = até 12 ações no mês). Ações de ' +
      'dono João não têm o mesmo teto — o limitador dele é a agenda operando a carteira inteira.',
    quandoPareceCabemMais: [
      'Agrupar em subtarefas de uma ação-mãe (jornada_subtarefas) — conta como uma ação para o teto, mas mede granularmente por dentro.',
      'Adiar o excedente para a semana ou o mês seguinte.',
      'Cortar, não espremer — priorize as ações que mais diretamente movem o critério de sucesso.',
    ],
  },
  anatomiaDeUmaAcao: {
    titulo: 'Toda ação, de qualquer dono, tem cinco componentes — faltando qualquer um, não está pronta.',
    componentes: [
      'Verbo de ação específico — "responder", "aplicar", "ativar", nunca "melhorar", "otimizar", "cuidar de".',
      'Objeto específico — não "o atendimento", mas "toda conversa que a IA passar para humano".',
      'Prazo dentro da semana.',
      'Dono — Cliente ou João, nunca "a equipe" ou "a clínica" de forma genérica.',
      'Evidência verificável — um dado objetivo que qualquer pessoa, olhando de fora, consegue confirmar.',
    ],
  },
  criterioDeSucessoDoMes:
    'Uma métrica só, do elo atacado, com um alvo numérico único — nunca uma lista de KPIs ' +
    'secundários. O alvo é definido a partir da série histórica do próprio cliente, não de um ' +
    'benchmark genérico de mercado.',
};

export const ACOES_DO_JOAO = {
  oQueMudou: 'O João não produz material — essa ação saiu da lista dele. Quem produz é sempre o Claude.',
  oQueSobra: [
    'Conduzir conversa — check-in de meio de mês, reunião de fechamento, aprovação de material.',
    'Cobrar — quando uma ação de Cliente não tem check marcado no prazo esperado.',
    'Revisar registro — conferir se o cliente está de fato preenchendo o que foi pedido.',
    'Ativar configuração junto com o cliente — o João conduz a ativação numa call ou mensagem dirigida.',
    'Apresentar — levar o plano e o material para a reunião mensal.',
    'Revisar e aprovar material com o cliente — o Claude produz, o João e o cliente validam.',
  ],
  comoAlimentaListaDiaria:
    'O ritual /cs agrega, entre TODOS os clientes da carteira, as ações de dono João pendentes na ' +
    'semana corrente de cada plano-atual.md. Não existe, em paralelo, uma lista de tarefas ' +
    'escrita à mão — a tarefa é consequência de o plano existir com aquele campo de dono preenchido.',
};

export const PROGRESSAO_DENTRO_DO_MES = [
  { semana: 1, resumo: 'Instala o básico, deliberadamente leve — no máximo 1-2 ações de Cliente, as mais simples de adotar. O grosso é trabalho de João.' },
  { semana: '2 e 3', resumo: 'Aprofundam — o teto de 3 ações é usado com folga, aplica-se o processo a 100% dos casos, e a semana 3 inclui revisão de meio-de-percurso.' },
  { semana: 4, resumo: 'Consolida e mede, nunca introduz — a única novidade permitida é a própria medição. Nenhuma ação nova contaminaria a leitura do resultado.' },
];

export const TESTE_DE_QUALIDADE_DE_UMA_ACAO = [
  'Está ligada ao elo do mês, e só a ele (ou aos dois elos declarados na exceção)?',
  'Tem verbo e objeto específicos, não um adjetivo de intenção?',
  'É executável dentro da própria semana, com os recursos que a clínica já tem?',
  'Não é algo que a plataforma já faz sozinha?',
  'Tem dono único e claro?',
  'Tem evidência verificável, não dependente da palavra de quem executou?',
  'É realista para a capacidade real daquela clínica — equipe, volume, ritmo?',
  'Teste decisivo: se essa ação não for cumprida, dá para saber se o problema foi a execução ou a hipótese do elo?',
];

export const PARES_ACAO_RUIM_BOA: ParDeAcao[] = [
  { elo: 'demanda', eloNome: 'Demanda', ruim: '"Aumentar o tráfego."', boa: 'Disparar a mensagem de reativação (preparada pelo Claude) para todos os pacientes inativos há mais de 6 meses até quinta-feira, registrando quantos responderam.', dono: 'Cliente' },
  { elo: 'agendamento', eloNome: 'Agendamento', ruim: '"Responder todo lead em até 10 minutos" / "melhorar o atendimento."', boa: 'Assumir toda conversa que a IA passar para humano dentro do mesmo turno, e oferecer 2-3 horários fechados já na primeira mensagem, usando o botão QUALIFICADO quando o lead confirmar intenção real.', dono: 'Cliente' },
  { elo: 'resgate_lead_frio', eloNome: 'Resgate de Lead Frio', ruim: '"Mandar mensagem para quem sumiu" (vago, sem lista nem critério).', boa: 'Disparar a mensagem de resgate para todo lead com sequência automática esgotada (followup_pausado=true) há mais de 14 dias, registrando quantos responderam.', dono: 'Cliente' },
  { elo: 'comparecimento', eloNome: 'Comparecimento', ruim: '"Enviar mensagem de confirmação 24h antes de cada consulta" (a plataforma já faz isso quando ligada).', boa: 'Ativar a confirmação imediata e o lembrete automático em Configurações de Agendamento, e responder manualmente a cada paciente que confirmar ou recusar, atualizando o status.', dono: 'Cliente / João na ativação' },
  { elo: 'fechamento', eloNome: 'Fechamento', ruim: '"Vender melhor" / "ter mais jogo de cintura na consulta."', boa: 'Usar o roteiro de consulta (preparado pelo Claude) em 100% das consultas de orçamento da semana, e preencher o valor orçado no CRM mesmo nas que não fecharem na hora.', dono: 'Cliente' },
  { elo: 'ticket', eloNome: 'Ticket', ruim: '"Aumentar o ticket médio."', boa: 'Apresentar a opção de plano de tratamento completo (não só o procedimento avulso pedido) em toda consulta de orçamento acima de R$1.500 da semana, usando a tabela de ancoragem, e registrar qual opção o paciente escolheu.', dono: 'Cliente' },
  { elo: 'ciclo_venda', eloNome: 'Ciclo de Venda', ruim: '"Cobrar a decisão do paciente" (vago, sem prazo nem critério).', boa: 'Aplicar a cadência de follow-up pós-orçamento a toda proposta em aberto da semana, com prazo de validade explícito, e registrar a data em que o paciente decidiu.', dono: 'Cliente' },
  { elo: 'recompra', eloNome: 'Recompra', ruim: '"Manter contato com paciente antigo" (vago, sem mecanismo).', boa: 'Configurar, junto com o João, a régua de recompra no módulo de Cadências para todo paciente que completar o intervalo de retorno do procedimento feito.', dono: 'Cliente / João na configuração' },
  { elo: 'instrumentacao', eloNome: 'Instrumentação (transversal a todo plano)', ruim: '"Acompanhar o resultado das consultas" / usar o campo resultado (coluna morta, 100% NULL).', boa: 'Marcar Realizado/Não Compareceu em 100% dos agendamentos com data já passada, todos os dias, na tela de Agenda, e registrar toda venda fechada na tela de Vendas.', dono: 'Cliente' },
];

export const COMO_O_MATERIAL_SE_ACOPLA_AO_PLANO = {
  regraDePrazo:
    'Material que o cliente precisa na semana 1 tem que estar pronto ANTES da reunião do mês ' +
    'anterior — nunca depois. Nunca entregar plano prometendo material que ainda não existe.',
  distribuicao: [
    'Material Operacional necessário na semana 1: pronto antes da reunião de fechamento do mês anterior.',
    'Material Operacional necessário nas semanas 2-4: pode ser finalizado durante o próprio mês, desde que pronto antes do início daquela semana.',
    'Material Estratégico: tem mais folga de prazo, mas deve estar pronto quando a ação do plano que depende dele é esperada.',
  ],
};

export const CICLO_DE_VIDA_DO_PLANO = [
  'fechamento do mês anterior (/cs-mes)',
  '→ plano das 4 semanas gerado (dado ao vivo do CRM + diagnóstico do elo)',
  '→ material produzido pelo Claude, personalizado ao atendimento real do cliente',
  '→ aprovação explícita do João (nada é publicado sem isso)',
  '→ apresentado na reunião mensal com o cliente',
  '→ publicado no CRM (jornadas: rascunho → ativa)',
  '→ acompanhado semanalmente (check das ações de Cliente, tarefas do João via /cs)',
  '→ congelado no fechamento seguinte (aderência fotografada)',
  '→ fechamento do mês seguinte, o ciclo recomeça',
];

export const MUDANCA_DE_PLANO_NO_MEIO_DO_MES = {
  regra: 'Editar o plano no meio do mês destrói a medição, porque o mês deixa de ser um teste limpo de uma hipótese.',
  condicaoExcepcional:
    'Um evento externo que invalida a execução do plano como estava — o sistema caiu por dias, ' +
    'um profissional-chave saiu, a clínica mudou de endereço. NÃO é condição válida: "o plano ' +
    'parece fraco", "o cliente reclamou que é difícil" (problema de dose, não motivo para trocar), ' +
    'ou "o João mudou de ideia" sem evento concreto.',
};
