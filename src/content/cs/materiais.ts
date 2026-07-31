// Fonte: 05-operacoes-e-cs/sistema/03-materiais-por-elo.md
// O catálogo de materiais — 50 entradas em 9 grupos (Camada 0 + 8 elos).
// O elo diagnosticado determina qual material será produzido; ninguém escolhe
// de um menu no ato do fechamento mensal (P5, ver principios.ts).
import type { Material, GrupoMaterialId } from './types';

export const COMO_O_CLAUDE_PRODUZ_MATERIAL =
  'Regra permanente: nenhum material nasce sem antes olhar o CRM daquele cliente específico. ' +
  'Um script, roteiro ou protocolo escrito sem essa análise é genérico. Antes de produzir ' +
  'qualquer material de atendimento, analisar: conversas reais da clínica (como ela responde ' +
  'hoje, tom de voz), objeções que aparecem de fato (não uma lista genérica), onde a conversa ' +
  'morre no funil, o que a IA já resolve e onde o humano precisa entrar, e os erros recorrentes ' +
  'do cliente na prática. Dois clientes com o mesmo elo-restrição recebem material com a ' +
  'mesma função, nunca com o mesmo texto.';

export const REGRA_DE_ENTREGA = {
  titulo: 'Produzir uma vez, entregar duas',
  texto:
    'Todo material produzido pelo Claude vai para as Notas da plataforma (versão viva — a ' +
    'clínica pode editar e adaptar). Material Operacional (o cliente usa no dia a dia, script, ' +
    'protocolo, checklist) fica só na Nota — não precisa de HTML premium porque não é ' +
    'apresentado, é usado. Material Estratégico (o cliente lê para entender/decidir, ou é ' +
    'apresentado na reunião mensal) recebe as duas versões: a Nota como referência viva, e o ' +
    'mesmo conteúdo também vira HTML premium, datado, entregue na reunião. A divergência entre ' +
    'as duas ao longo do tempo é informação (o que a clínica mudou por conta própria), não defeito.',
};

export const MATERIAIS: Material[] = [
  // Camada 0 — Adoção
  {
    id: 'adocao-guia-configuracao-inicial',
    grupo: 'adocao',
    nome: 'Guia de configuração inicial (checklist personalizado)',
    oQueE: 'Passo a passo de exatamente quais itens do checklist de adoção estão desligados naquele cliente e como ativá-los.',
    quandoSeAplica: 'Todo cliente em onboarding ou com qualquer item do checklist desligado.',
    oQueAnalisarAntes: 'diagnostico-automacoes.md do cliente — quais dos 6 itens estão ativos hoje.',
    tipo: 'operacional',
  },
  {
    id: 'adocao-roteiro-agenda-vendas',
    grupo: 'adocao',
    nome: 'Roteiro de uso da Agenda e Vendas',
    oQueE: 'Instruções de quando e como marcar status de agendamento e registrar venda, com exemplos das telas reais.',
    quandoSeAplica: 'Cliente não registra de forma confiável (ex.: zero vendas com leads ativos, ou status sempre igual).',
    oQueAnalisarAntes: 'Taxa de preenchimento de agendamentos.status e vendas do cliente nos últimos 30 dias.',
    tipo: 'operacional',
  },
  {
    id: 'adocao-relatorio-adocao',
    grupo: 'adocao',
    nome: 'Relatório de adoção (apresentado na reunião)',
    oQueE: 'Retrato do checklist de adoção — o que está ligado/desligado — com o impacto estimado de ativar cada item pendente.',
    quandoSeAplica: 'Toda reunião mensal enquanto a Camada 0 não estiver completa.',
    oQueAnalisarAntes: 'diagnostico-automacoes.md e ranking de oportunidade do cliente.',
    tipo: 'estrategico',
  },
  {
    id: 'adocao-guia-resposta-handoff',
    grupo: 'adocao',
    nome: 'Guia de resposta ao handoff da IA',
    oQueE: 'O que fazer no exato momento em que a tool notificacao passa a conversa para o humano.',
    quandoSeAplica: 'Cliente não sabe como assumir a conversa após o handoff, ou demora a responder.',
    oQueAnalisarAntes: 'Conversas reais logo após um handoff — tempo até responder, se retoma o contexto.',
    tipo: 'operacional',
  },
  {
    id: 'adocao-guia-horario-ia',
    grupo: 'adocao',
    nome: 'Guia de configuração de horário de atendimento da IA',
    oQueE: 'Como ajustar horario_atendimento para a IA não operar (ou operar diferente) fora do expediente real.',
    quandoSeAplica: 'IA responde de forma inadequada fora do horário, ou clínica quer ajustar a janela.',
    oQueAnalisarAntes: 'Horário de fato praticado pela clínica vs. o configurado hoje.',
    tipo: 'operacional',
  },
  {
    id: 'adocao-checklist-reconexao',
    grupo: 'adocao',
    nome: 'Checklist de reconexão (WhatsApp/IA)',
    oQueE: 'Passo a passo para reconectar o WhatsApp e confirmar que a IA voltou a responder.',
    quandoSeAplica: 'Cliente sem WhatsApp conectado ou com gate de IA desligado sem querer.',
    oQueAnalisarAntes: 'Estado de whatsapp_connections e athos_agentes_org do cliente.',
    tipo: 'operacional',
  },

  // Camada 1 — Demanda
  {
    id: 'demanda-mensagem-reativacao',
    grupo: 'demanda',
    nome: 'Mensagem de reativação de base',
    oQueE: 'Texto para contatar pacientes inativos há 6+ meses e trazê-los de volta ao funil.',
    quandoSeAplica: 'Clínica com base grande de pacientes antigos nunca reativada e demanda nova cara ou escassa.',
    oQueAnalisarAntes: 'Volume de pacientes inativos, tom usado historicamente com paciente antigo.',
    tipo: 'operacional',
  },
  {
    id: 'demanda-estruturacao-oferta',
    grupo: 'demanda',
    nome: 'Estruturação de oferta',
    oQueE: 'Definição do que anunciar — qual procedimento, qual gancho, qual promessa.',
    quandoSeAplica: 'Demanda existe mas a oferta não converte atenção em lead.',
    oQueAnalisarAntes: 'Criativos/campanhas atuais e o que já foi testado.',
    tipo: 'estrategico',
  },
  {
    id: 'demanda-mentoria-trafego',
    grupo: 'demanda',
    nome: 'Mentoria / plano de tráfego pago',
    oQueE: 'Estrutura de campanha, segmentação, orçamento e cadência de anúncio.',
    quandoSeAplica: 'Clínica sem geração de demanda própria ou dependente de um canal só.',
    oQueAnalisarAntes: 'Canal de origem hoje (leads.origem), histórico de investimento se disponível.',
    tipo: 'estrategico',
  },
  {
    id: 'demanda-estrutura-indicacao',
    grupo: 'demanda',
    nome: 'Estrutura de indicação / parceria',
    oQueE: 'Programa formal de indicação (paciente indica paciente) ou parceria com outro negócio local.',
    quandoSeAplica: 'Demanda por indicação existe mas é informal e não escala.',
    oQueAnalisarAntes: 'Se a clínica já recebe indicação orgânica hoje e como trata isso.',
    tipo: 'estrategico',
  },
  {
    id: 'demanda-calendario-conteudo',
    grupo: 'demanda',
    nome: 'Calendário de conteúdo orgânico',
    oQueE: 'Pauta de postagem para redes sociais própria da clínica, sem depender de tráfego pago.',
    quandoSeAplica: 'Demanda baixa e sem orçamento de mídia paga disponível.',
    oQueAnalisarAntes: 'Perfil e histórico de postagem da clínica, se existir.',
    tipo: 'estrategico',
  },
  {
    id: 'demanda-script-pedido-indicacao',
    grupo: 'demanda',
    nome: 'Script de pedido de indicação pós-atendimento',
    oQueE: 'Mensagem enviada ao paciente satisfeito, logo após o fechamento, pedindo indicação direta.',
    quandoSeAplica: 'Clínica com boa recompra/satisfação mas sem processo formal de pedir indicação.',
    oQueAnalisarAntes: 'Momento em que o paciente demonstra satisfação nas conversas reais.',
    tipo: 'operacional',
  },

  // Camada 2 — Agendamento
  {
    id: 'agendamento-guia-conducao-pos-handoff',
    grupo: 'agendamento',
    nome: 'Guia de condução pós-handoff',
    oQueE: 'Como o humano conduz a conversa a partir do momento em que a IA passa o bastão, com oferta de horários fechados.',
    quandoSeAplica: 'Contato Efetivo alto (a maioria responde) mas Agendamento baixo — o gargalo é pós-resposta.',
    oQueAnalisarAntes: 'Conversas reais pós-handoff — em que ponto elas esfriam.',
    tipo: 'operacional',
  },
  {
    id: 'agendamento-roteiro-qualificacao',
    grupo: 'agendamento',
    nome: 'Roteiro de qualificação',
    oQueE: 'Perguntas-padrão para separar lead com potencial real do que não vai fechar.',
    quandoSeAplica: 'Clínica perde tempo com lead errado ou trata todos os leads igual.',
    oQueAnalisarAntes: 'Perfil dos leads que historicamente agendaram vs. os que sumiram.',
    tipo: 'operacional',
  },
  {
    id: 'agendamento-guia-botao-qualificado',
    grupo: 'agendamento',
    nome: 'Guia de uso do botão QUALIFICADO',
    oQueE: 'Quando e como marcar um lead como qualificado na conversa, e por que substitui controle manual paralelo.',
    quandoSeAplica: 'Clínica mantém planilha ou registro manual de MQL fora da plataforma.',
    oQueAnalisarAntes: 'Se a clínica já usa o botão hoje ou mantém controle externo.',
    tipo: 'operacional',
  },
  {
    id: 'agendamento-checklist-triagem',
    grupo: 'agendamento',
    nome: 'Checklist de configuração da IA de Triagem',
    oQueE: 'Como ajustar triagem_regras_extras para a IA de triagem não deixar de ativar em casos específicos.',
    quandoSeAplica: 'Leads legítimos não recebem resposta automática por regra de triagem mal calibrada.',
    oQueAnalisarAntes: 'Casos reais em que a triagem decidiu não ativar a IA e não deveria.',
    tipo: 'operacional',
  },
  {
    id: 'agendamento-guia-priorizacao-fila',
    grupo: 'agendamento',
    nome: 'Guia de priorização de fila de handoff',
    oQueE: 'Como decidir quem responder primeiro quando o volume de handoffs supera a capacidade humana do momento.',
    quandoSeAplica: 'Clínica com volume alto de handoff e equipe pequena, atraso perceptível.',
    oQueAnalisarAntes: 'Volume de handoffs por dia e tempo médio de retomada atual.',
    tipo: 'operacional',
  },
  {
    id: 'agendamento-estrutura-oferta-horario',
    grupo: 'agendamento',
    nome: 'Estrutura de oferta de horário (calendário-modelo)',
    oQueE: 'Um formato-padrão de como apresentar 2-3 opções de horário, com dia/período.',
    quandoSeAplica: 'Conversas mostram pergunta aberta ("quando você pode?") sem sucesso de agendamento.',
    oQueAnalisarAntes: 'Conversas reais em que a oferta de horário aparece e não avança.',
    tipo: 'operacional',
  },

  // Camada 2 — Resgate de Lead Frio
  {
    id: 'resgate-mensagem-leads-pausados',
    grupo: 'resgate_lead_frio',
    nome: 'Mensagem de resgate para leads pausados',
    oQueE: 'Texto dirigido a leads com followup_pausado=true — sequência automática esgotada sem resposta.',
    quandoSeAplica: 'Taxa de resgate baixa apesar do follow-up automático ligado e configurado.',
    oQueAnalisarAntes: 'Conteúdo e tom das tentativas automáticas já enviadas, para não repetir.',
    tipo: 'operacional',
  },
  {
    id: 'resgate-criterio-priorizacao',
    grupo: 'resgate_lead_frio',
    nome: 'Critério de priorização de leads frios',
    oQueE: 'Regra de qual lead frio resgatar primeiro (tempo de pausa, valor potencial, origem).',
    quandoSeAplica: 'Volume de leads pausados maior do que a capacidade de resgate manual da semana.',
    oQueAnalisarAntes: 'Volume e distribuição de followup_pausado=true por tempo de pausa.',
    tipo: 'operacional',
  },
  {
    id: 'resgate-oferta-reabertura',
    grupo: 'resgate_lead_frio',
    nome: 'Oferta de reabertura de conversa',
    oQueE: 'Uma novidade ou condição especial (não desconto genérico) que justifique o lead voltar a responder.',
    quandoSeAplica: 'Mensagem de resgate simples já testada e sem efeito.',
    oQueAnalisarAntes: 'O que a clínica tem disponível para oferecer sem descaracterizar o posicionamento de preço.',
    tipo: 'estrategico',
  },
  {
    id: 'resgate-checklist-sequencia',
    grupo: 'resgate_lead_frio',
    nome: 'Checklist de ajuste da sequência automática',
    oQueE: 'Revisão de tentativas/intervalos do Athos Follow-Up antes de complementar com resgate manual.',
    quandoSeAplica: 'Sequência automática configurada de forma genérica desde a ativação.',
    oQueAnalisarAntes: 'Configuração atual (ia_followup_config.sequencia) comparada ao padrão de resposta real.',
    tipo: 'operacional',
  },

  // Camada 2 — Comparecimento
  {
    id: 'comparecimento-texto-confirmacao-lembrete',
    grupo: 'comparecimento',
    nome: 'Texto de confirmação e lembrete',
    oQueE: 'Template usado pela automação de confirmação imediata e lembrete de consulta.',
    quandoSeAplica: 'Confirmação/lembrete nunca configurados, ou configurados com texto genérico.',
    oQueAnalisarAntes: 'Tom de comunicação da clínica com o paciente, procedimento típico agendado.',
    tipo: 'operacional',
  },
  {
    id: 'comparecimento-protocolo-resposta-manual',
    grupo: 'comparecimento',
    nome: 'Protocolo de resposta manual à confirmação',
    oQueE: 'Como interpretar a resposta do paciente ("sim"/"não"/silêncio) e atualizar o status do agendamento.',
    quandoSeAplica: 'Confirmação/lembrete já ativos, mas ninguém trata a resposta de forma sistemática.',
    oQueAnalisarAntes: 'Volume de respostas não tratadas hoje, tempo entre resposta e atualização do status.',
    tipo: 'operacional',
  },
  {
    id: 'comparecimento-preparacao-pre-consulta',
    grupo: 'comparecimento',
    nome: 'Preparação de pré-consulta',
    oQueE: 'O que comunicar ao paciente antes da consulta para reduzir ansiedade ou desistência.',
    quandoSeAplica: 'Comparecimento cai entre marcação e data da consulta, especialmente com intervalo longo.',
    oQueAnalisarAntes: 'Procedimentos com maior taxa de falta, e o que a clínica já comunica hoje.',
    tipo: 'operacional',
  },
  {
    id: 'comparecimento-politica-noshow',
    grupo: 'comparecimento',
    nome: 'Política de no-show e reagendamento',
    oQueE: 'Regra de como tratar quem falta — quando reagenda automaticamente, quando sai do funil.',
    quandoSeAplica: 'No-show recorrente sem processo de recuperação.',
    oQueAnalisarAntes: 'Histórico de reagendamento vs. abandono após falta.',
    tipo: 'operacional',
  },
  {
    id: 'comparecimento-roteiro-ligacao',
    grupo: 'comparecimento',
    nome: 'Roteiro de ligação de confirmação',
    oQueE: 'Script para confirmar por telefone os pacientes que não respondem por WhatsApp.',
    quandoSeAplica: 'Parcela relevante dos pacientes não responde a mensagens de confirmação.',
    oQueAnalisarAntes: 'Perfil dos pacientes sem resposta (idade, procedimento, origem).',
    tipo: 'operacional',
  },
  {
    id: 'comparecimento-guia-config-lembretes',
    grupo: 'comparecimento',
    nome: 'Guia de configuração dos lembretes',
    oQueE: 'Como decidir entre lembrete relativo (X min antes) e fixo (N dias antes), e quantos disparos configurar.',
    quandoSeAplica: 'Cliente ativou lembrete mas não sabe calibrar a cadência.',
    oQueAnalisarAntes: 'Padrão de agendamento com antecedência da clínica.',
    tipo: 'operacional',
  },

  // Camada 2 — Fechamento
  {
    id: 'fechamento-roteiro-consulta',
    grupo: 'fechamento',
    nome: 'Roteiro de consulta',
    oQueE: 'Estrutura de como conduzir a consulta até a proposta.',
    quandoSeAplica: 'Sem processo comercial padronizado na cadeira.',
    oQueAnalisarAntes: 'Conversas e relatos reais de como a consulta hoje é conduzida.',
    tipo: 'operacional',
  },
  {
    id: 'fechamento-tratamento-objecoes',
    grupo: 'fechamento',
    nome: 'Tratamento das objeções mais comuns',
    oQueE: 'Respostas prontas para as objeções que de fato aparecem naquele cliente.',
    quandoSeAplica: 'Objeção recorrente identificada nas conversas ou em relato do João.',
    oQueAnalisarAntes: 'Objeções reais registradas nas conversas — nunca uma lista genérica.',
    tipo: 'operacional',
  },
  {
    id: 'fechamento-apresentacao-plano-tratamento',
    grupo: 'fechamento',
    nome: 'Apresentação de plano de tratamento',
    oQueE: 'Como apresentar o plano de forma que o paciente entenda valor, não só preço.',
    quandoSeAplica: 'Fechamento baixo mesmo com boa comparecimento.',
    oQueAnalisarAntes: 'O que hoje é dito na consulta ao apresentar o orçamento.',
    tipo: 'estrategico',
  },
  {
    id: 'fechamento-modelo-proposta-formal',
    grupo: 'fechamento',
    nome: 'Modelo de proposta formal',
    oQueE: 'Documento que o paciente leva/recebe com o orçamento, para ancorar a decisão.',
    quandoSeAplica: 'Proposta informal ou verbal, sem registro que ancore a decisão.',
    oQueAnalisarAntes: 'Se valor_orcado está sendo preenchido e onde a proposta hoje é só falada.',
    tipo: 'operacional',
  },
  {
    id: 'fechamento-guia-valor-orcado',
    grupo: 'fechamento',
    nome: 'Guia de preenchimento de valor orçado',
    oQueE: 'Passo a passo de onde e quando registrar o valor orçado no CRM, mesmo quando o paciente não fecha na hora.',
    quandoSeAplica: 'vendas.valor_orcado quase sempre vazio (hoje 3 de 555 vendas na carteira).',
    oQueAnalisarAntes: 'Ponto do fluxo onde o campo deveria ser preenchido e não é.',
    tipo: 'operacional',
  },
  {
    id: 'fechamento-roteiro-telefone',
    grupo: 'fechamento',
    nome: 'Roteiro de fechamento por telefone/vídeo',
    oQueE: 'Script para retomar e fechar com quem não decidiu na cadeira, por outro canal.',
    quandoSeAplica: 'Paciente sai da consulta sem decidir e a clínica não tem processo de retomada.',
    oQueAnalisarAntes: 'Casos reais de decisão adiada e como (ou se) a clínica retomou contato.',
    tipo: 'operacional',
  },
  {
    id: 'fechamento-script-reforco-pos-consulta',
    grupo: 'fechamento',
    nome: 'Script de reforço pós-consulta imediato',
    oQueE: 'Mensagem enviada logo após a consulta, antes da cadência formal, reforçando o que foi conversado.',
    quandoSeAplica: 'Paciente sai da consulta e não recebe nenhum contato até o follow-up padrão.',
    oQueAnalisarAntes: 'Intervalo hoje entre fim da consulta e primeiro contato pós-consulta.',
    tipo: 'operacional',
  },

  // Camada 2 — Ticket
  {
    id: 'ticket-tabela-valor-ancoragem',
    grupo: 'ticket',
    nome: 'Tabela de valor e ancoragem',
    oQueE: 'Estrutura de preço que ancora o paciente num valor de referência antes de mostrar o real.',
    quandoSeAplica: 'Ticket baixo sem estrutura de preço clara.',
    oQueAnalisarAntes: 'Ticket médio atual, mix de procedimentos vendidos.',
    tipo: 'estrategico',
  },
  {
    id: 'ticket-plano-completo-vs-isolado',
    grupo: 'ticket',
    nome: 'Plano de tratamento completo vs. procedimento isolado',
    oQueE: 'Material que orienta a clínica a vender o plano inteiro, não o item que o paciente pediu.',
    quandoSeAplica: 'Clínica vende reativamente o que o paciente pede, não o que resolve o caso dele.',
    oQueAnalisarAntes: 'Histórico de vendas — concentração em item avulso vs. pacote.',
    tipo: 'estrategico',
  },
  {
    id: 'ticket-protocolo-upgrade',
    grupo: 'ticket',
    nome: 'Protocolo de upgrade e pacote',
    oQueE: 'Como oferecer plano maior/pacote em vez do procedimento isolado.',
    quandoSeAplica: 'Venda concentrada em item avulso de baixo valor.',
    oQueAnalisarAntes: 'Casos reais em que o upgrade poderia ter sido oferecido e não foi.',
    tipo: 'operacional',
  },
  {
    id: 'ticket-estrategia-mix',
    grupo: 'ticket',
    nome: 'Estratégia de mix convênio vs. particular',
    oQueE: 'Como equilibrar volume de convênio (ticket baixo) com captação de particular (ticket alto).',
    quandoSeAplica: 'Convênio domina o mix e derruba o ticket médio.',
    oQueAnalisarAntes: 'Proporção convênio/particular e ticket de cada segmento.',
    tipo: 'estrategico',
  },
  {
    id: 'ticket-parcelamento',
    grupo: 'ticket',
    nome: 'Estrutura de parcelamento e condições de pagamento',
    oQueE: 'Formas de reduzir a objeção de preço sem baixar o valor de tabela.',
    quandoSeAplica: 'Objeção de preço recorrente mesmo com ancoragem aplicada.',
    oQueAnalisarAntes: 'Formas de pagamento hoje aceitas e objeções de preço registradas.',
    tipo: 'operacional',
  },
  {
    id: 'ticket-guia-pacote-multisessao',
    grupo: 'ticket',
    nome: 'Guia de apresentação de pacote multi-sessão',
    oQueE: 'Como apresentar um procedimento de várias sessões como pacote de valor fechado.',
    quandoSeAplica: 'Procedimento de múltiplas sessões vendido sessão a sessão.',
    oQueAnalisarAntes: 'Procedimentos da clínica que naturalmente têm múltiplas sessões.',
    tipo: 'estrategico',
  },

  // Camada 2 — Ciclo de Venda
  {
    id: 'ciclo-cadencia-pos-orcamento',
    grupo: 'ciclo_venda',
    nome: 'Cadência de follow-up pós-orçamento',
    oQueE: 'Sequência de contato específica para propostas em aberto, distinta da automática de pré-atendimento.',
    quandoSeAplica: 'Ciclo de venda longo mesmo com boa taxa de fechamento eventual.',
    oQueAnalisarAntes: 'Intervalo real entre orçamento e decisão, e se algum follow-up já acontece.',
    tipo: 'operacional',
  },
  {
    id: 'ciclo-regra-prazo-validade',
    grupo: 'ciclo_venda',
    nome: 'Regra de prazo de validade da proposta',
    oQueE: '"Esta condição vale até tal data" para criar urgência de decisão sem parecer pressão.',
    quandoSeAplica: 'Propostas sem prazo, decisão se arrasta indefinidamente.',
    oQueAnalisarAntes: 'Se a clínica já usa algum prazo hoje e como o paciente reage.',
    tipo: 'operacional',
  },
  {
    id: 'ciclo-roteiro-urgencia',
    grupo: 'ciclo_venda',
    nome: 'Roteiro de reforço de urgência/escassez',
    oQueE: 'Script para comunicar limitação real (agenda, condição, disponibilidade) sem soar agressivo.',
    quandoSeAplica: 'Paciente demora a decidir e a clínica não tem linguagem para criar urgência genuína.',
    oQueAnalisarAntes: 'Linguagem já usada pela clínica e o que soa natural para o tom dela.',
    tipo: 'operacional',
  },
  {
    id: 'ciclo-checklist-motivos-demora',
    grupo: 'ciclo_venda',
    nome: 'Checklist de motivos de demora',
    oQueE: 'Roteiro de perguntas para entender por que o paciente está enrolando.',
    quandoSeAplica: 'Ciclo longo e a causa da demora não está clara.',
    oQueAnalisarAntes: 'Casos reais de propostas que demoraram e o desfecho de cada uma.',
    tipo: 'operacional',
  },

  // Camada 3 — Recompra
  {
    id: 'recompra-regua-manutencao',
    grupo: 'recompra',
    nome: 'Régua de recompra / manutenção periódica',
    oQueE: 'Sequência de mensagens configurada em Cadências, disparada quando o paciente completa o intervalo de retorno.',
    quandoSeAplica: 'Nenhuma das 7 clínicas PCA usa hoje a régua de recompra que a plataforma já suporta.',
    oQueAnalisarAntes: 'Intervalo médio de retorno por tipo de procedimento, se algum contato já existe.',
    tipo: 'operacional',
  },
  {
    id: 'recompra-script-check-in',
    grupo: 'recompra',
    nome: 'Script de contato pós-tratamento (check-in)',
    oQueE: 'Mensagem de acompanhamento logo após o procedimento, antes da régua de recompra propriamente dita.',
    quandoSeAplica: 'Paciente termina o procedimento e não recebe nenhum contato até muito depois.',
    oQueAnalisarAntes: 'Intervalo hoje entre fim do tratamento e qualquer contato seguinte.',
    tipo: 'operacional',
  },
  {
    id: 'recompra-programa-manutencao',
    grupo: 'recompra',
    nome: 'Programa de manutenção/retorno periódico',
    oQueE: 'Estrutura comercial de pacote de manutenção (ex.: retorno trimestral, plano anual).',
    quandoSeAplica: 'Procedimento vendido como evento único quando naturalmente pede manutenção.',
    oQueAnalisarAntes: 'Tipo de procedimento predominante e se ele tem lógica de manutenção.',
    tipo: 'estrategico',
  },
  {
    id: 'recompra-oferta-fidelidade',
    grupo: 'recompra',
    nome: 'Oferta de fidelidade/benefício de retorno',
    oQueE: 'Condição especial para quem já é paciente, distinta da oferta de captação de paciente novo.',
    quandoSeAplica: 'Clínica trata paciente antigo e novo com a mesma oferta.',
    oQueAnalisarAntes: 'Se existe hoje qualquer diferenciação de oferta entre paciente novo e antigo.',
    tipo: 'estrategico',
  },
  {
    id: 'recompra-guia-config-regua',
    grupo: 'recompra',
    nome: 'Guia de configuração da régua nas Cadências',
    oQueE: 'Passo a passo de como montar a régua de recompra no módulo de Cadências da plataforma.',
    quandoSeAplica: 'Primeira vez que o cliente vai configurar a régua.',
    oQueAnalisarAntes: 'Estrutura de cadencias já existente na conta do cliente, se houver.',
    tipo: 'operacional',
  },
];

export const O_QUE_NAO_VIRA_MATERIAL: string[] = [
  'Responder o lead rapidamente — a IA de recepção já responde sozinha enquanto ia_ativa=true. O que existe é o guia de condução pós-handoff.',
  'Escrever e enviar confirmação/lembrete de consulta como rotina manual — a plataforma já tem essa sistemática; o material certo é o guia de configuração.',
  'Cadência de follow-up que duplica o Athos Follow-Up — só entra material quando é complementar e explicitamente fora do alcance da automação (resgate de leads já pausados, follow-up pós-orçamento).',
  'Controle manual de MQL/qualificação em planilha ou nota à parte — a plataforma já registra o evento com timestamp automático via botão QUALIFICADO.',
  'Qualquer material de "arrastar o lead pela etapa do funil" — não existe kanban na plataforma, o Pipeline foi removido do produto.',
  'Roteiro de negociação/fechamento para a IA seguir — a IA é proibida por desenho de negociar, fechar venda e agendar.',
  'Interpretação automática de resposta de paciente — a plataforma não lê "sim"/"não" de uma resposta de confirmação sozinha.',
];

export const PENDENCIA_MATERIAL_GESTAO_EQUIPE =
  'PENDENTE — decidir com o João: possibilidade de um material padrão sobre gestão de equipe e ' +
  'cultura de vendas, não ligado a um elo específico da cadeia comercial. O próprio CEO levantou ' +
  'que pode virar produto separado, oferecido como bônus do PCA, em vez de item deste catálogo.';

export function getMateriaisPorGrupo(grupo: GrupoMaterialId): Material[] {
  return MATERIAIS.filter((m) => m.grupo === grupo);
}

export function getMaterial(id: string): Material | undefined {
  return MATERIAIS.find((m) => m.id === id);
}
