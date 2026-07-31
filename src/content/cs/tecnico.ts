// Fonte: 05-operacoes-e-cs/sistema/05-publicar-plano.md e 06-painel.md.
// Condensado — cobre o schema e as regras que mais importam para quem publica
// um plano ou lê o painel. Não substitui os documentos-fonte para quem for
// escrever SQL ou regenerar o painel; mapa-do-crm.md (schema geral da
// plataforma) não foi trazido para cá — é referência de baixo nível fora do
// escopo de uma tela de consulta do método (ver relatório do agente que
// construiu esta seção).
export const SCHEMA_JORNADAS = {
  jornadas: [
    'id, user_id (NOT NULL, FK)',
    'organization_id (nullable, SEM FK declarada — preencher sempre, é o que dá visibilidade a toda a equipe da clínica)',
    'titulo, status (rascunho | ativa | concluida)',
    'tipo (onboarding | mensal)',
    'periodo_ref (date — o par com tipo=mensal que faz o rótulo "Agosto de 2026" aparecer)',
    'gerada_por (ia | admin)',
  ],
  jornada_estagios: ['jornada_id, titulo, ordem (Semana 1 = ordem 0), prazo_dias, data_inicio', 'Convenção: cada estágio é uma semana.'],
  jornada_passos: [
    'estagio_id, titulo, ordem',
    "tipo: 'acao_livre' | 'material' | 'ferramenta_arsenal' | 'categoria_arsenal'",
    'obrigatorio, concluido, concluido_em, concluido_por',
  ],
  jornada_subtarefas: ['passo_id, titulo, ordem, concluido, concluido_em, concluido_por'],
};

export const REGRAS_DE_VISIBILIDADE = {
  rascunhoInvisivel:
    'status=rascunho NÃO aparece para o cliente — garantido pelo filtro .in(\'status\', ' +
    "['ativa','concluida']) no hook do frontend, NÃO pela RLS (a policy de SELECT não filtra " +
    'por status). Publicar com segurança: manter rascunho até revisar, mudar para ativa só ao publicar.',
  organizationIdSempre:
    'jornadas.organization_id é opcional no banco mas obrigatório na prática — sem ele, a ' +
    'jornada só fica visível para o user_id específico, não para toda a equipe da clínica.',
  duasJornadasAtivas:
    'Não há trava de unicidade — se existirem duas jornadas ativa na mesma org, as duas ' +
    'aparecem, sem erro. Prática recomendada: marcar a jornada mensal do mês anterior como ' +
    'concluida antes de publicar a do mês novo.',
};

export const PROCEDIMENTO_DE_PUBLICACAO = [
  '0. (opcional) Descobrir organization_id e um user_id válido da clínica.',
  '0.5. Fechar a jornada mensal ativa do mês anterior, se existir.',
  '1. INSERT em jornadas com status=rascunho, tipo=mensal, periodo_ref preenchido.',
  '2. INSERT dos jornada_estagios (Semana 1-4, ordem 0-3).',
  '3. INSERT dos jornada_passos de cada estágio.',
  '4. UPDATE jornadas SET status=ativa — só este passo publica de fato, torna visível ao cliente.',
];

export const QUERY_DE_ADERENCIA =
  'Passos concluídos / passos totais de uma jornada tipo=mensal no mês de referência, com ' +
  'quebra por semana (estágio). Testada com dado real: jornada de julho/2026 com 15 passos, 1 ' +
  'concluído, 6,7% — o caso que motiva o rigor de 04-plano-de-acao.md.';

export const LIMITES_DO_MODELO_DE_DADOS = [
  'Nenhuma trava de unicidade impede duas jornadas ativa do mesmo tipo=mensal na mesma org ao mesmo tempo.',
  'organization_id não tem FK — nada impede um uuid inexistente e a jornada ficar órfã, sem erro no INSERT.',
  'A trava de "rascunho é invisível" vive só na query do frontend, não na RLS.',
  'Não existe snapshot de aderência histórica isolado — reabrir/editar passos de um mês já fechado muda o resultado retroativamente.',
  'Não há campo para distinguir "check no prazo" de "check tardio".',
  'A tool criar_jornada do admin-os nasce ATIVA direto, sem organization_id/tipo/periodo_ref, e dispara efeito colateral de onboarding — não foi desenhada para publicar plano mensal recorrente. PENDENTE decidir com o João se ela deve ser desligada.',
];

export const PAINEL = {
  oQueE:
    'O painel (05-operacoes-e-cs/painel/index.html) é um snapshot descartável, não um app — não ' +
    'busca dado sozinho, não tem credencial embutida, é regravado inteiro a cada regeneração.',
  quandoRegenerar: 'No início de cada rodada de /cs semanal, ou sob pedido explícito. Não existe cron.',
  comparecimentoFechamentoNoPainelAntigo:
    'O painel ainda marca Comparecimento e Fechamento como "SEM MEDIÇÃO" por decisão de uma ' +
    'versão anterior da investigação — decisão que a correção de comparecimento-e-fechamento.md ' +
    '(2026-07-30) tornou desatualizada. Ver o relatório consultivo desta entrega.',
  restricoes: [
    'Arquivo único, autocontido, zero requisição externa.',
    'Nenhuma credencial embutida — não é cliente Supabase, é uma foto.',
    'Nenhum dado inventado — o que a consulta não retornar aparece como "sem dado".',
    'Zero emoji.',
  ],
};
