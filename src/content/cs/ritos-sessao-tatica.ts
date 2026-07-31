// Fonte: 05-operacoes-e-cs/sistema/ritos/05-sessao-tatica-grupo.md
// A sessão tática semanal em grupo — já acontece na prática, mas irregular;
// este documento é o padrão a estabilizar, não um padrão novo.
export const SESSAO_TATICA_GRUPO = {
  diaHorario: 'Segunda-feira, 8h (decidido pelo João em 2026-07-30)',
  problemaAtual:
    'O conteúdo já está certo — o que falta é a mesma disciplina de calendário que os outros ' +
    'ritos já têm. Sem dia e horário fixos, a sessão falha: acontece em algumas semanas, é ' +
    'pulada em outras.',
  oQueE:
    'Uma aula prática, semanal, com toda a carteira PCA reunida ao mesmo tempo, aplicada a UM ' +
    'tema só, escolhido por dado da própria carteira. O momento em que o João ensina uma vez e ' +
    'resolve o mesmo problema em várias clínicas de uma vez só — a maior alavanca de escala do ' +
    'CS: uma hora atende 7 clientes hoje e vai atender 50 no mesmo custo.',
  oQueNaoE: [
    'Não é reunião de cliente individual — isso é a reunião mensal ou a reunião sob demanda.',
    'Não é suporte — dúvida de "como eu faço X na plataforma" não é pauta desta sessão.',
    'Não é call de dúvidas solta — nasce de um tema fixo, decidido antes, pelo dado da carteira.',
  ],
  comoOTemaEEscolhido:
    'O tema da semana é o elo-restrição mais frequente na carteira naquele momento — contagem ' +
    'sobre quantos clientes ativos têm cada elo como elo-restrição do mês corrente (não uma ' +
    'análise nova por cliente, nem o que o João acha mais interessante). Em caso de empate, o ' +
    'critério de desempate é o mesmo do elo-restrição individual: qual tema, ensinado agora, ' +
    'geraria o maior ganho de receita agregado na carteira.',
  blocos: [
    {
      numero: 1,
      titulo: 'Ensino do conceito',
      duracao: '15 min',
      descricao: 'O João ensina o conceito do elo da semana de forma geral, sem apontar para nenhuma clínica específica ainda — o que o elo é, por que importa, causas típicas.',
    },
    {
      numero: 2,
      titulo: 'Aplicação prática, assento quente',
      duracao: '30 min',
      descricao: 'Uma ou duas clínicas travadas no elo da semana têm o caso real analisado ao vivo, com o restante assistindo. Ver um caso real ensina mais que teoria abstrata.',
    },
    {
      numero: 3,
      titulo: 'Compromissos em voz alta',
      duracao: '15 min',
      descricao: 'Cada clínica presente diz, em voz alta, para o grupo, o que vai aplicar essa semana — mesma lógica de verbalização da reunião mensal (compromisso social, não só privado).',
    },
  ],
  oQueSobraDepois: [
    'Gravação da sessão (ferramenta a definir).',
    'O material do tema entra no catálogo — se a sessão gerou um roteiro/script/slide, isso passa a existir como material do elo, catalogado.',
    'Reaproveitamento no plano individual — quando outro cliente cair no mesmo elo num fechamento futuro, o material já existe. O trabalho de produção cai ao longo do tempo.',
  ],
  comoSeConectaAoIndividual:
    'Na reunião mensal (bloco 3, aderência), o que foi combinado na sessão de grupo entra na ' +
    'mesma lista de cobrança do plano individual — não é um compromisso à parte, esquecido.',
  regrasDeConducao: [
    'Quem fala: o João conduz os blocos 1 e 3 sempre. No bloco 2, conduz a análise, mas a clínica no assento quente participa ativamente.',
    'Como se evita virar suporte individual: se uma clínica fora do assento quente trouxer dúvida fora do tema, a resposta padrão é reconhecer e adiar para a reunião mensal ou reunião sob demanda — nunca resolver no ato.',
  ],
};
