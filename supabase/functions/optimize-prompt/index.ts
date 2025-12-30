import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL do seu webhook no N8N
const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/assistente-prompt-viviane';

serve(async (req) => {
  // Tratamento de CORS para requisições do navegador
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Autenticação do Usuário (Verifica quem está chamando)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header is missing');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado ou token inválido.');
    }

    // 2. Inicializa Admin Client (Para operações de banco sem restrição de RLS dentro da função)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 3. Busca a organização do usuário
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.organization_id) {
      console.error('Erro ao buscar perfil:', profileError);
      throw new Error('Organização não encontrada para este usuário.');
    }

    // 4. Recebe dados da requisição
    const { message, currentPrompt } = await req.json();

    if (!message) throw new Error('Mensagem não fornecida.');

    // 5. Salva a mensagem do usuário no histórico
    const { error: insertUserError } = await supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'user',
      content: message
    });

    if (insertUserError) {
      console.error('Erro ao salvar msg usuario:', insertUserError);
      throw new Error('Falha ao salvar histórico da mensagem.');
    }

    // 6. Envia para o N8N
    console.log('Enviando para N8N:', N8N_WEBHOOK_URL);
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_message: message,
        current_prompt: currentPrompt || '',
        organization_id: profile.organization_id,
        user_id: user.id
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro N8N:', response.status, errorText);
      throw new Error(`Erro na IA (N8N): ${response.status} - ${errorText}`);
    }

    // PARSING ROBUSTO DA RESPOSTA DO N8N
    let aiResponse = await response.json();
    console.log('Resposta bruta do N8N:', JSON.stringify(aiResponse));

    // Normaliza: Se for array (All Incoming Items), pega o primeiro item
    let outputItem = aiResponse;
    if (Array.isArray(aiResponse)) {
        outputItem = aiResponse[0] || {};
    }

    // Busca a mensagem de texto em 'output' (conforme seu print) ou 'message' (fallback)
    const aiMessage = outputItem.output || outputItem.message || outputItem.response || "A IA processou a solicitação, mas não retornou uma mensagem de texto clara.";
    
    // Busca o novo prompt se houver
    const newPrompt = outputItem.new_prompt || outputItem.newPrompt || null;

    // 7. Salva a resposta da IA no histórico
    const { error: insertAiError } = await supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'assistant',
      content: aiMessage
    });

    if (insertAiError) {
      console.error('Erro ao salvar msg IA:', insertAiError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: aiMessage,
      newPrompt: newPrompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função optimize-prompt:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});