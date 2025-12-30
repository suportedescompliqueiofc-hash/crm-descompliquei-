import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Headers de CORS completos para evitar bloqueios no navegador
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/assistente-prompt-viviane';

serve(async (req) => {
  // 1. Tratamento de Preflight (OPTIONS) - Resposta imediata
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 2. Validação da Autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Cabeçalho de autorização ausente')
    }

    // Cliente Supabase para Auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Cliente Admin para Banco de Dados
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Busca Perfil/Organização
    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new Error('Organização não encontrada')
    }

    // 5. Parse do Body
    let body;
    try {
      body = await req.json();
    } catch {
      throw new Error('Corpo da requisição inválido (JSON esperado)');
    }
    
    const { message, currentPrompt } = body;
    if (!message) throw new Error('Mensagem é obrigatória')

    // 6. Registro no Histórico (Usuário)
    // Não bloqueia o fluxo principal se falhar, apenas loga o erro
    supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'user',
      content: message
    }).then(({ error }) => {
      if (error) console.error('Erro ao salvar histórico (user):', error)
    });

    // 7. Chamada ao N8N com Timeout Controlado
    // Definimos 25 segundos para dar tempo ao N8N, mas cortar antes do limite da Edge Function matar o processo
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    console.log(`Chamando N8N: ${N8N_WEBHOOK_URL}`);
    
    let response;
    try {
      response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_message: message,
          current_prompt: currentPrompt || '',
          organization_id: profile.organization_id,
          user_id: user.id
        }),
        signal: controller.signal
      });
    } catch (fetchError) {
      if (fetchError.name === 'AbortError') {
        throw new Error('A IA demorou muito para responder (Timeout). Tente novamente ou simplifique a solicitação.');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Erro no N8N (${response.status}): ${errText.substring(0, 100)}`);
    }

    const responseText = await response.text();
    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch {
      // Se não for JSON, usa o texto puro se houver conteúdo
      if (responseText && responseText.trim().length > 0) {
        aiResponse = { message: responseText };
      } else {
        throw new Error('Resposta inválida da IA (Vazia ou formato incorreto).');
      }
    }

    // 8. Processamento da Resposta
    let outputItem = Array.isArray(aiResponse) ? aiResponse[0] : aiResponse;
    if (!outputItem) outputItem = {};

    // Busca inteligente da mensagem em várias chaves possíveis
    let aiMessage = 
      outputItem.output || 
      outputItem.message || 
      outputItem.response || 
      outputItem.text || 
      outputItem.content;

    // Busca aninhada em 'data' ou 'body'
    if (!aiMessage && outputItem.data) {
      aiMessage = outputItem.data.output || outputItem.data.message || outputItem.data.response;
    } else if (!aiMessage && outputItem.body) {
      aiMessage = outputItem.body.output || outputItem.body.message || outputItem.body.response;
    }

    // Se o item for string pura
    if (!aiMessage && typeof outputItem === 'string') {
      aiMessage = outputItem;
    }

    if (!aiMessage) {
      console.warn('Estrutura recebida do N8N:', JSON.stringify(outputItem).substring(0, 500));
      aiMessage = "A IA processou, mas não retornou texto visível. Verifique o prompt no N8N.";
    }

    const newPrompt = 
      outputItem.new_prompt || 
      outputItem.newPrompt || 
      (outputItem.data ? outputItem.data.new_prompt : null);

    // 9. Registro no Histórico (IA)
    await supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'assistant',
      content: aiMessage
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: aiMessage,
      newPrompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Edge Function Error:', error);
    
    // Retorna 500 com JSON e Headers CORS corretos.
    // Isso evita o erro de CORS no navegador ("No 'Access-Control-Allow-Origin' header").
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno no servidor.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})