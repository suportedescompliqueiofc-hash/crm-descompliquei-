// Fonte: o-que-a-plataforma-ja-faz.md, comparecimento-e-fechamento.md,
// quem-atende-o-lead.md, diagnostico-automacoes.md.
// "A realidade da operação" — o que é mecanismo estável da plataforma (vale
// para qualquer cliente, não muda com o tempo) versus o que é retrato de
// carteira datado (amostra 2026-07-30, 7 clínicas PCA — vai ficar velho;
// para o estado atual de um cliente real, sempre puxar o CRM ao vivo).
import type { ErradoCerto } from './types';

export const AMOSTRA_DATADA_AVISO =
  'Todo número de cliente citado nesta seção é amostra datada de 2026-07-30, extraída dos ' +
  'documentos de investigação do manual. Não mora em arquivo como verdade permanente — serve ' +
  'só para ilustrar e justificar as regras. Para o estado atual de qualquer cliente, puxar ao ' +
  'vivo via /cs-cliente.';

export const IA_PRE_ATENDIMENTO = {
  nome: 'Athos Recepção',
  oQueE:
    'Um agente de IA que responde automaticamente a mensagens de WhatsApp recebidas.',
  limiteDuro:
    'Escrito no próprio prompt-base: "Nunca informe preços, nunca invente dados e nunca tente ' +
    'agendar. A IA não fecha, não negocia e não agenda."',
  quandoEntra:
    'Dispara sempre em mensagem de entrada quando ia_ativa=true (automático para leads de ' +
    'origem marketing). Para lead orgânico, só entra se a IA de Triagem decidir ativar. Depois ' +
    'de um handoff humano, nunca mais dispara para aquele lead.',
  oQueNaoFaz: 'Não agenda, não fecha venda, não negocia preço, não faz triagem de qualificação formal (isso é o botão QUALIFICADO, ação humana).',
};

export const FOLLOW_UP_AUTOMATICO = {
  nome: 'Athos Follow-Up',
  comoFunciona:
    'Classifica leads em silêncio (10+ min) como PRECISA_FOLLOW via IA, e dispara mensagens ' +
    'geradas por IA (não template fixo) numa sequência configurável por org (número de ' +
    'tentativas e intervalo não são fixos no código). Após a última tentativa, o lead é pausado ' +
    '(followup_pausado=true) e não recebe mais follow-up automático até responder — reset ' +
    'automático se o lead volta a responder.',
  distintoDeCadencias:
    'Cadências são sequências pré-escritas pela clínica (não geradas por IA), disparadas por um ' +
    'cron nos passos e horários configurados — servem para campanhas/nutrição manual, não para ' +
    '"resgatar silêncio".',
  amostra2026_07_30: 'Só 6 de 96 organizações do banco inteiro têm follow-up automático ativo.',
};

export const CONFIRMACAO_E_LEMBRETE = {
  confirmacaoImediata:
    'Ao criar um agendamento, se notif_confirmacao_ativa=true, dispara WhatsApp de confirmação ' +
    'com template fixo da clínica (não gerado por IA).',
  lembretes:
    'Duas modalidades: relativo (X min antes) ou fixo (N dias antes, horário fixo do dia). ' +
    'Dedup por chave própria.',
  oQueNaoExiste:
    'Não há confirmação/cancelamento automático a partir do texto do lead — a resposta do ' +
    'paciente vira só uma mensagem normal na conversa. Ler a resposta e mudar o status é sempre ' +
    'trabalho humano.',
  amostra2026_07_30: 'Só 2 de 96 organizações do banco inteiro têm confirmação e lembrete ativos.',
};

export const FUNIL_KANBAN = {
  removido: true,
  texto:
    'O Pipeline (Kanban, etapas, drag-and-drop de funil) foi completamente removido do produto. ' +
    'A tabela etapas ainda existe no banco mas não é mais usada por nenhuma tela. O que existe ' +
    'no lugar são os cards de Funil de Conversão no Dashboard (Leads → MQL → Reuniões → ' +
    'Fechamentos), números calculados automaticamente — nunca proponha "arrastar o lead" em nenhuma hipótese.',
};

export const REGISTRO_VENDA_DESFECHO = {
  venda: 'Manual, via VendaModal (cliente, procedimento, valor, data, forma de pagamento). Única via alternativa: tool registrar_venda do Athos GS, quando o próprio usuário pede por texto — ainda não é automação, é entrada por outro canal.',
  desfechoDeConsulta: 'Manual, via tela Agendamentos, mudando status para realizado/nao_compareceu/cancelado/remarcado. Sem detecção automática.',
};

export const METAS = {
  automatico: 'A plataforma calcula sozinha, a partir do que já foi lançado: progresso acumulado, Ritmo Necessário (R$/dia, R$/semana) e o Simulador "E se?" (sliders de leads/dia, taxas, ticket → receita projetada).',
  manual: 'O alvo da meta (meta_receita) é definido pelo cliente/CS. Desde 2026-07-16, meta é só receita — os campos de funil existem no schema mas não são mais editáveis na UI.',
};

export const NOTAS_PAGINAS = {
  oQueSao: 'Um sistema tipo Notion dentro da plataforma, com dois tipos: pasta (container) e nota (folha, conteúdo rico).',
  flagDisponivelAtendimento: 'Marca a página como material de consulta rápida durante o atendimento — alimenta o painel lateral da tela de conversa, só leitura/consulta.',
  formatacaoSuportada: 'Títulos, negrito, itálico, listas, citação, código, tabelas completas, cor de texto. Não suporta imagem embutida nem marca-texto/destaque.',
};

export const OUTRAS_AUTOMACOES_ENCONTRADAS = [
  'Alertas de inatividade — regras configuráveis por org que geram notificações internas para o time quando um lead ativo fica sem contato além do limite. Não contata o lead sozinho.',
  'Análise de não-leads — classificação em lote por IA que sinaliza contatos que não são pacientes reais.',
  'Pausa automática de cadência ao responder — se um lead em cadência manual responde, a cadência é pausada sozinha.',
  'CTWA/criativo tracking automático — vínculo de lead a anúncio/criativo específico sem digitação.',
];

export const NUNCA_DECLARAR_ACAO_QUE_JA_EXISTE: ErradoCerto[] = [
  { errado: 'Responder todo lead em até 10 minutos.', certo: 'Revisar diariamente os leads que a IA marcou para atendimento humano (handoff) e assumir a conversa a partir dali — a IA já responde sozinha enquanto ia_ativa=true.' },
  { errado: 'Enviar mensagem de lembrete/confirmação X horas antes da consulta.', certo: 'Ativar a confirmação imediata e os lembretes automáticos em Configurações de Agendamento.' },
  { errado: 'Mandar mensagem de reengajamento para lead que sumiu/parou de responder.', certo: 'Ativar o Follow-up automático (Athos Follow-Up) em Configurações de IA e definir a sequência.' },
  { errado: 'Marcar manualmente quando um lead vira MQL/qualificado com base no funil.', certo: 'Usar o botão QUALIFICADO na conversa — a plataforma já registra o evento com timestamp exato.' },
  { errado: 'Arrastar o card do lead para a próxima etapa do funil.', certo: 'Não existe kanban na plataforma hoje — não peça isso; a métrica de funil já é calculada automaticamente.' },
  { errado: 'Confirmar por telefone/WhatsApp manual se o paciente confirmou, quando a clínica já tem o fluxo ativo.', certo: 'Revisar as respostas dos pacientes às mensagens de confirmação/lembrete — a plataforma NÃO lê a resposta automaticamente.' },
];

export const TRABALHO_HUMANO_LEGITIMO = [
  'Interpretar a resposta do paciente a uma confirmação/lembrete e mudar o status do agendamento — não há leitura automática de "sim"/"não".',
  'Negociar, fechar e agendar de fato — a IA é proibida disso pelo próprio prompt.',
  'Configurar e ativar os recursos automáticos que hoje estão desligados na maioria da carteira.',
  'Definir o alvo de meta de receita e a estratégia por trás dele.',
  'Escrever e manter o conteúdo das Notas/Páginas — quem escreve script de atendimento é o Claude (P8), não a IA de recepção.',
  'Decidir a sequência e o texto das Cadências manuais.',
  'Marcar os passos da Jornada/Plano de Ação como concluídos — sempre um clique humano.',
  'Configurar regras de alerta de inatividade.',
  'Revisar e agir sobre os handoffs da IA.',
  'Preencher origem de leads capturados fora do WhatsApp e fora do Meta Ads da própria Descompliquei.',
];

export const COMPARECIMENTO_E_FECHAMENTO = {
  veredito:
    'O dado existe, para os dois elos, e mora em dois lugares diferentes. Uma versão anterior ' +
    'do sistema declarava que agendamentos.resultado está NULL em 100% dos registros e que, ' +
    'por isso, não haveria medição direta — essa premissa é falsa, foi corrigida em 2026-07-30.',
  comparecimentoMoraEm:
    'agendamentos.status (CHECK com 6 valores: agendado, confirmado, realizado, ' +
    'nao_compareceu, cancelado, remarcado) — 100% preenchida no banco inteiro onde a clínica ' +
    'usa a tela de Agenda.',
  fechamentoMoraEm:
    'A tabela vendas (valor_fechado, data_fechamento) — 100% preenchida quando uma venda é ' +
    'criada. Nunca dependeu de agendamentos.',
  colunaMorta:
    'agendamentos.resultado é uma coluna text sem CHECK, sem nenhuma escrita em nenhuma tela, ' +
    'hook, edge function ou trigger — código morto no schema, do tipo "ficou mas o time migrou ' +
    'para outro campo".',
  ondeATelaGrava: {
    comparecimento: 'Tela de Agendamentos (menu de ações do card, select inline) — ação manual do dono da clínica, sem IA nem trigger de banco envolvidos.',
    fechamento: 'VendaModal (botão "Nova Venda" ou automaticamente ao marcar "Realizado" com toggle "fechou procedimento") — ação manual (formulário "Salvar").',
  },
  problemaRealEAdocaoNaoSchema:
    'O que de fato limita a leitura desses dois elos em algumas clínicas não é ausência de ' +
    'coluna — é adoção: das 7 clínicas PCA, 2 (amostra 2026-07-30) têm zero agendamentos e zero ' +
    'vendas registrados (ainda não usam essas telas), e 1 usa Agenda mas nunca registrou venda. ' +
    'Isso é diagnóstico de Camada 0 (P9), não limitação de schema.',
  vendaAgendamentoIdQuaseSempreNulo:
    'vendas.agendamento_id é quase sempre NULL no banco inteiro — a venda é registrada como ' +
    'evento independente, não como desfecho amarrado 1:1 a uma consulta específica. Fechamento ' +
    'não é "um agendamento que virou venda", é um registro próprio que só ocasionalmente ' +
    'referencia o agendamento de origem.',
  acaoDeOnboardingDerivada:
    'Para clínicas com dado zero/incompleto: orientar o uso de duas telas concretas — Agenda ' +
    '(marcar todo agendamento como Realizado ou Não Compareceu assim que a consulta acontecer) ' +
    'e Vendas (registrar todo fechamento com valor e data).',
};

export const QUEM_ATENDE_O_LEAD = {
  veredito:
    'O campo mensagens.remetente="humano" está morto — é lixo de teste de abril/2026, sem ' +
    'organization_id, nunca usado em produção. O valor real usado pela produção para "mensagem ' +
    'humana" é remetente="agente", e ele NÃO é zero: humanos respondem entre 10,7% e 86,6% das ' +
    'mensagens de saída, variando muito por clínica.',
  achadoCentral:
    'Entre 87% e 100% dessas mensagens humanas foram enviadas direto do WhatsApp conectado ' +
    '(celular/WhatsApp Web), não pela tela de conversa do CRM — a equipe conversa por fora da ' +
    'ferramenta, mas a plataforma captura o eco dessas mensagens via webhook (fromMe=true), ' +
    'então o dado comercial não está "faltando pela metade", só sob um nome de coluna diferente ' +
    'e majoritariamente fora da tela de atendimento.',
  implicacaoParaOCS:
    'A pergunta que o CS precisa fazer não é mais "um humano conversa com o lead?" (a resposta é ' +
    'sim, na maioria das clínicas) — é "por que a equipe não usa a tela de atendimento do CRM?". ' +
    'Isso é Camada de Adoção (P9), e precisa ser resolvido antes de qualquer leitura fina de ' +
    'tempo de resposta, handoff ou qualidade de atendimento.',
  acaoDeOnboarding:
    'Quando o elo cair em Fechamento/Atendimento: "a equipe responde direto pelo ' +
    'celular/WhatsApp Web — migrar para a tela /conversas do CRM" para ganhar o que só a tela ' +
    'oferece (histórico centralizado, materiais de apoio, indicadores de tempo de resposta ' +
    'corretos, jornada do paciente completa). Isso não é "fazer à mão o que a plataforma já faz" ' +
    '— é o oposto: fazer pela plataforma o que já se faz à mão.',
};

export const DIAGNOSTICO_AUTOMACOES_RANKING_OPORTUNIDADE =
  'O ranking de oportunidade de ativação de automação (amostra 2026-07-30) não é a contagem de ' +
  'itens desligados — é o ganho provável estimado a partir do dado real da clínica (base de ' +
  'leads, volume de vendas já comprovado, receita perdida por confirmação/lembrete desligados). ' +
  'Ver diagnostico-automacoes.md para o levantamento cliente a cliente — não replicado aqui ' +
  'porque é retrato pontual da carteira de 7 clientes, não uma regra do método.';
