// Fonte: 05-operacoes-e-cs/sistema/00-como-funciona.md
// Os princípios que sustentam o sistema, os 3 rituais e o ciclo mensal fechado.
import type { Principio, Ritual } from './types';

export const O_QUE_E_O_SISTEMA =
  'O sistema de Customer Success da Descompliquei para a carteira do produto PCA ' +
  '(Performance Comercial Avançada) — ciclo de 180 dias, R$18.000, entrega de CRM ' +
  'próprio com IA de pré-atendimento + processo comercial + acompanhamento consultivo. ' +
  'Quem opera: o João, sozinho, com o Claude. Não existe equipe de CS. A meta é sustentar ' +
  '30-50 clientes na carteira sem contratar ninguém.';

export const POR_QUE_EXISTE =
  'Este é o segundo sistema de CS da empresa. O primeiro morreu porque guardava número ' +
  'em arquivo markdown — o número nascia velho no dia seguinte, e o dossiê virava ficção. ' +
  'Cada princípio abaixo existe para que este não morra do mesmo jeito.';

export const PRINCIPIOS: Principio[] = [
  {
    id: 'P1',
    titulo: 'Nenhum número mora em arquivo',
    texto:
      'Números vêm do CRM no instante da pergunta, nunca são salvos em markdown. O que mora ' +
      'em arquivo é contexto, percepção e decisão. Única exceção documentada: a aderência ao ' +
      'plano do mês é congelada no fechamento mensal (/cs-mes) — ali o número é resultado de ' +
      'um julgamento sobre o mês que fechou, não um dado vivo que se atualiza sozinho.',
  },
  {
    id: 'P2',
    titulo: 'Duas verdades, nunca misturadas',
    texto:
      'Sobre cada cliente existem os números (CRM) e a percepção do CEO (o que ele sente/observa ' +
      'e nenhuma query mostra). Ambas valem. Quando divergem, a divergência é o sinal mais ' +
      'valioso do sistema e deve ser registrada explicitamente, não resolvida na força.',
  },
  {
    id: 'P3',
    titulo: 'Continuidade',
    texto:
      'Nada recomeça do zero. Cada cliente tem um arquivo cumulativo de continuidade que só ' +
      'cresce, nunca é sobrescrito. Qualquer sessão nova, em qualquer chat, retoma exatamente ' +
      'de onde parou.',
  },
  {
    id: 'P4',
    titulo: 'Um elo por mês',
    texto:
      'O padrão é atacar um gargalo por vez. O cliente não executa duas mudanças simultâneas, ' +
      'e sem isolar a variável é impossível saber o que causou o resultado.',
  },
  {
    id: 'P5',
    titulo: 'Material é consequência, não escolha',
    texto:
      'O elo diagnosticado determina qual material será produzido. Ninguém escolhe de um menu.',
  },
  {
    id: 'P6',
    titulo: 'Escrita restrita e aprovada',
    texto:
      'O CS lê o CRM livremente, mas só escreve em jornadas/jornada_estagios/jornada_passos/' +
      'jornada_subtarefas — nunca em leads, agendamentos, vendas, mensagens, metas ou qualquer ' +
      'tabela que meça o resultado do cliente. Nada é publicado no cliente sem aprovação ' +
      'explícita do João: gerar o plano e os materiais é análise; publicar só acontece depois ' +
      'de ele aprovar o conteúdo especificamente.',
  },
  {
    id: 'P7',
    titulo: 'Nunca esquecer o que a plataforma já faz',
    texto:
      'Todo plano, rito e material se apoia no que a plataforma entrega hoje. Nunca dar ao ' +
      'cliente uma ação que a plataforma já executa — o máximo permitido é mandar o cliente ' +
      'usar/configurar/ativar a ferramenta. O modelo anterior chegou a escrever ação operacional ' +
      'como se a plataforma não existisse — mandar o cliente responder lead em 10 minutos ' +
      'quando a IA já responde, por exemplo.',
  },
  {
    id: 'P8',
    titulo: 'Todo material é produzido pelo Claude',
    texto:
      'Nem o João nem ninguém da equipe produz material de CS. Todo material é personalizado ' +
      'por cliente, depois de analisar o atendimento real daquela clínica — como ela atende, o ' +
      'tom de voz, os erros, o que precisa ser omitido.',
  },
  {
    id: 'P9',
    titulo: 'Adoção antes de performance',
    texto:
      'Enquanto a Camada 0 não passa (plataforma configurada, clínica registrando o que faz), ' +
      'o diagnóstico dos elos das camadas 1 a 3 não é confiável — uma taxa ruim pode significar ' +
      '"a clínica não usa a ferramenta", não "a clínica tem um problema comercial ali".',
  },
];

export const TRES_RITUAIS: Ritual[] = [
  {
    comando: '/cs',
    nome: 'O painel de controle da carteira',
    descricao:
      'Puxa números da carteira toda, cruza com os planos do mês em curso (um por cliente), ' +
      'devolve a lista ordenada de ações que são do João: mandar mensagem para X, marcar ' +
      'reunião com Y, produzir material Z. Não analisa um cliente em profundidade, agrega.',
  },
  {
    comando: '/cs-cliente <nome>',
    nome: 'A mesa de trabalho',
    descricao:
      'Abre a mesa de trabalho de um cliente: números ao vivo, série mês a mês, a cadeia de ' +
      '8 elos em 4 camadas, o elo-restrição, a continuidade, o plano corrente. Não é um ' +
      'relatório que termina — é uma sessão de trabalho consultiva que continua em conversa.',
  },
  {
    comando: '/cs-mes <nome>',
    nome: 'O fechamento mensal',
    descricao:
      'Mede o mês contra os anteriores, avalia se o elo do mês melhorou, mede aderência, ' +
      'define o elo do mês seguinte, gera o plano das 4 semanas e os materiais, e grava tudo ' +
      'em continuidade.md e plano-atual.md. Publica no CRM só depois de aprovação explícita do João.',
  },
];

export const REGISTRAR_NAO_E_COMANDO =
  'Quando o João conta no chat o que conversou com um cliente — fora de qualquer ritual ' +
  'formal — o Claude grava na continuidade e atualiza o plano se algo combinado mudar. É o ' +
  'que fecha qualquer ritual: nenhuma sessão termina sem que o que foi decidido vire uma ' +
  'entrada em continuidade.md. Se não foi registrado, para o sistema não aconteceu.';

export const CICLO_MENSAL_FECHADO = [
  'fim do mês',
  '→ fechamento (/cs-mes): mede, decide o próximo elo, gera plano e materiais',
  '→ reunião com o cliente: resultado do mês + plano novo apresentado',
  '→ 4 semanas de execução, com o João sabendo todo dia o que fazer (via /cs)',
  '→ fim do mês, de novo',
];

export const COMPARECIMENTO_FECHAMENTO_NAO_HA_CEGUEIRA =
  'Versões anteriores deste sistema declaravam que agendamentos.resultado está NULL em ' +
  '100% dos registros e que, por isso, Comparecimento e Fechamento não teriam medição ' +
  'direta. Essa premissa é falsa e foi corrigida em 2026-07-30: Comparecimento mora em ' +
  'agendamentos.status (coluna 100% preenchida no banco inteiro); Fechamento mora na ' +
  'tabela vendas (100% preenchida quando uma venda é criada). O que de fato limita a ' +
  'leitura desses dois elos em algumas clínicas não é ausência de coluna — é adoção ' +
  '(Camada 0), não limitação de schema. Ver a seção "A realidade da operação".';
