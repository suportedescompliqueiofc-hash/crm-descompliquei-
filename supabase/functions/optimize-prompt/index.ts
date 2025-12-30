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
    // 1. Autenticação do Usuário
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

    // 2. Inicializa Admin Client
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
    await supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'user',
      content: message
    });

    // 6. Envia para o N8N
    console.log(`Enviando requisição para N8N: ${N8N_WEBHOOK_URL}`);
    
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

    // Lê a resposta como texto primeiro para evitar crash no json()
    const responseText = await response.text();
    console.log('Resposta bruta do N8N:', responseText);

    if (!response.ok) {
      throw new Error(`Erro no N8N (${response.status}): ${responseText}`);
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (e) {
      // Se não for JSON válido, tenta usar o texto diretamente se não for vazio
      if (responseText && responseText.trim().length > 0) {
        aiResponse = { message: responseText };
      } else {
        throw new Error('A resposta do N8N não é um JSON válido e está vazia.');
      }
    }

    // 7. Parsing Robusto da Resposta
    // Normaliza: Se for array (All Incoming Items), pega o primeiro item
    let outputItem = aiResponse;
    if (Array.isArray(aiResponse)) {
        outputItem = aiResponse[0] || {};
    }

    // Tenta encontrar a mensagem em várias chaves possíveis
    const possibleKeys = ['output', 'message', 'response', 'text', 'answer', 'content', 'result'];
    let aiMessage = null;

    for (const key of possibleKeys) {
        if (outputItem[key] && typeof outputItem[key] === 'string') {
            aiMessage = outputItem[key];
            break;
        }
    }

    // Se ainda não achou, verifica se está aninhado em 'data' ou 'body'
    if (!aiMessage && outputItem.data) {
        for (const key of possibleKeys) {
            if (outputItem.data[key]) { aiMessage = outputItem.data[key]; break; }
        }
    }

    // Fallback final: Se o outputItem for uma string simples
    if (!aiMessage && typeof outputItem === 'string') {
        aiMessage = outputItem;
    }

    // Se falhar tudo
    if (!aiMessage) {
        console.warn('Estrutura do outputItem:', JSON.stringify(outputItem));
        aiMessage = "A IA processou a solicitação, mas não retornou uma mensagem de texto identificável.";
    }
    
    // Busca o novo prompt se houver (mesma lógica de fallback)
    const newPrompt = outputItem.new_prompt || outputItem.newPrompt || (outputItem.data ? outputItem.data.new_prompt : null) || null;

    // 8. Salva a resposta da IA no histórico
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
    console.error('Erro crítico na função optimize-prompt:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno no servidor ao processar IA.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});