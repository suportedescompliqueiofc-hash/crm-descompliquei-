import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const templates = [
  { 
    nome: 'Confirmação de Consulta Jurídica', 
    categoria: 'Agendamento', 
    conteudo: 'Prezado(a) {{nome_lead}}, confirmamos sua consulta agendada com a Dra. Viviane Braga. Por favor, responda SIM para confirmar sua presença. Caso precise reagendar, nos avise com antecedência.', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Solicitação de Documentos', 
    categoria: 'Andamento Processual', 
    conteudo: 'Olá, {{nome_lead}}. Para darmos continuidade à análise do seu caso, precisamos que nos envie foto ou PDF dos seguintes documentos: RG, CPF e Comprovante de Residência. Pode enviar por aqui mesmo?', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Atualização do Processo', 
    categoria: 'Andamento Processual', 
    conteudo: 'Olá, {{nome_lead}}. Temos uma atualização importante sobre o andamento do seu processo. Gostaria de agendar uma breve ligação ou visita ao escritório para explicarmos os detalhes?', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Boas-vindas ao Escritório', 
    categoria: 'Boas-vindas', 
    conteudo: 'Seja bem-vindo(a) à {{nome_escritorio}}. Agradecemos a confiança. Nossa equipe já está analisando o seu caso e entraremos em contato em breve com os próximos passos.', 
    variaveis: ['nome_escritorio'] 
  },
  { 
    nome: 'Proposta de Honorários', 
    categoria: 'Comercial', 
    conteudo: 'Olá, {{nome_lead}}. Conforme conversamos, segue em anexo a proposta de honorários advocatícios para sua apreciação. Estamos à disposição para esclarecer qualquer dúvida.', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Retorno sobre Contato', 
    categoria: 'Comercial', 
    conteudo: 'Olá, {{nome_lead}}. Recebemos seu contato e gostaríamos de entender melhor sua situação para orientá-lo(a) juridicamente. Qual o melhor horário para falarmos?', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Lembrete de Vencimento', 
    categoria: 'Financeiro', 
    conteudo: 'Prezado(a) {{nome_lead}}, este é um lembrete cordial sobre o vencimento da parcela dos honorários amanhã. Caso já tenha efetuado o pagamento, por favor, desconsidere esta mensagem.', 
    variaveis: ['nome_lead'] 
  },
  { 
    nome: 'Aniversário do Cliente', 
    categoria: 'Relacionamento', 
    conteudo: 'Feliz aniversário, {{nome_lead}}! A equipe da {{nome_escritorio}} deseja a você um novo ciclo repleto de saúde, paz e justiça. Parabéns!', 
    variaveis: ['nome_lead', 'nome_escritorio'] 
  },
  { 
    nome: 'Reativação de Contato', 
    categoria: 'Retenção', 
    conteudo: 'Olá, {{nome_lead}}. Faz {{dias_sem_contato}} dias que não nos falamos. Gostaria de saber se ainda precisa de assistência jurídica em relação ao seu caso. Estamos à disposição.', 
    variaveis: ['nome_lead', 'dias_sem_contato'] 
  },
  { 
    nome: 'Pesquisa de Satisfação', 
    categoria: 'Qualidade', 
    conteudo: 'Olá, {{nome_lead}}. Sua opinião é fundamental para aprimorarmos nosso atendimento jurídico. Em uma escala de 0 a 10, como você avalia nossos serviços até o momento?', 
    variaveis: ['nome_lead'] 
  }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não encontrado');

    const { data: profile, error: profileError } = await supabaseClient
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.organization_id) throw new Error('Organização não encontrada para este usuário.');

    const orgId = profile.organization_id;

    const templatesWithIds = templates.map(t => ({ 
      ...t, 
      usuario_id: user.id,
      organization_id: orgId 
    }));

    const { error } = await supabaseClient.from('templates_mensagem').insert(templatesWithIds);

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Erro na função seed-templates:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});