import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const templates = [
  { nome: 'Lembrete de Retorno Semestral', categoria: 'Retorno Semestral', conteudo: 'Olá, {{nome_paciente}}! 😊 Passando para lembrar que já se passaram 6 meses desde sua última visita à {{nome_clinica}}. Que tal agendarmos sua consulta de rotina para manter seu sorriso sempre saudável?', variaveis: ['nome_paciente', 'nome_clinica'] },
  { nome: 'Feliz Aniversário!', categoria: 'Aniversário de Pacientes', conteudo: '🎉 Feliz aniversário, {{nome_paciente}}! A equipe da {{nome_clinica}} deseja a você um dia incrível e um ano cheio de sorrisos. Como presente, oferecemos um desconto especial em sua próxima consulta!', variaveis: ['nome_paciente', 'nome_clinica'] },
  { nome: 'Confirmação de Consulta', categoria: 'Confirmação de Consulta', conteudo: 'Olá, {{nome_paciente}}! Sua consulta na {{nome_clinica}} está confirmada para amanhã. Por favor, responda SIM para confirmar sua presença. Mal podemos esperar para vê-lo(a)!', variaveis: ['nome_paciente', 'nome_clinica'] },
  { nome: 'Reativação de Paciente Inativo', categoria: 'Reativação de Inativos', conteudo: 'Olá, {{nome_paciente}}! Sentimos sua falta na {{nome_clinica}}. Já faz {{dias_sem_contato}} dias desde nosso último contato. Gostaríamos de oferecer uma condição especial para você voltar a cuidar do seu sorriso conosco. Vamos agendar?', variaveis: ['nome_paciente', 'nome_clinica', 'dias_sem_contato'] },
  { nome: 'Divulgação de Clareamento Dental', categoria: 'Planos/Procedimentos Premium', conteudo: 'Olá, {{nome_paciente}}! Já pensou em ter um sorriso ainda mais branco e radiante? ✨ A {{nome_clinica}} está com condições especiais para clareamento dental este mês. Gostaria de saber mais?', variaveis: ['nome_paciente', 'nome_clinica'] },
  { nome: 'Lembrete de Continuidade de Tratamento', categoria: 'Continuidade de Tratamento', conteudo: 'Olá, {{nome_paciente}}. Como você está? Passando para lembrar da importância de dar continuidade ao seu tratamento de {{queixa_principal}}. Vamos agendar a próxima etapa e garantir o melhor resultado para o seu sorriso?', variaveis: ['nome_paciente', 'queixa_principal'] },
  { nome: 'Pesquisa de Satisfação', categoria: 'Pesquisa de Satisfação (NPS)', conteudo: 'Olá, {{nome_paciente}}! Agradecemos por escolher a {{nome_clinica}}. Em uma escala de 0 a 10, o quanto você nos recomendaria a um amigo ou familiar? Sua opinião é muito importante para nós!', variaveis: ['nome_paciente', 'nome_clinica'] },
  { nome: 'Promoção de Fim de Ano', categoria: 'Promoção Sazonal', conteudo: 'Olá, {{nome_paciente}}! O fim de ano está chegando! 🎄 Que tal deixar seu sorriso pronto para as festas? A {{nome_clinica}} preparou ofertas especiais em diversos tratamentos. Agende sua avaliação!', variaveis: ['nome_paciente', 'nome_clinica'] },
  { nome: 'Campanha de Indicação', categoria: 'Indicação de Amigos/Família', conteudo: 'Olá, {{nome_paciente}}! Você sabia que na {{nome_clinica}}, quem indica amigo é? Indique um amigo e, após a primeira consulta dele, ambos ganham um desconto especial no próximo tratamento!', variaveis: ['nome_paciente', 'nome_clinica'] },
  { nome: 'Lançamento de Alinhadores Invisíveis', categoria: 'Lançamento de Novo Procedimento', conteudo: '✨ Novidade na {{nome_clinica}}! Agora temos alinhadores invisíveis para deixar seu sorriso perfeito de forma discreta e confortável. Agende uma avaliação e descubra essa nova tecnologia! Olá, {{nome_paciente}}!', variaveis: ['nome_clinica', 'nome_paciente'] },
  { nome: 'Lembrete de Vencimento', categoria: 'Vencimento de Parcelas', conteudo: 'Olá, {{nome_paciente}}. Este é um lembrete amigável da {{nome_clinica}} sobre o vencimento da sua parcela amanhã. Se precisar de ajuda ou tiver alguma dúvida, estamos à disposição!', variaveis: ['nome_paciente', 'nome_clinica'] }
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

    // Busca o perfil do usuário para obter o ID da organização
    const { data: profile, error: profileError } = await supabaseClient
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.organization_id) throw new Error('Organização não encontrada para este usuário.');

    const orgId = profile.organization_id;

    // Adiciona o ID do usuário e da organização a cada template
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