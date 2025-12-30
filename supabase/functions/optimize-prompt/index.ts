import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URL do webhook no N8N
const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/assistente-prompt-viviane';

serve(async (req) => {
  // Tratamento de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Autenticação
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }

    // Cliente para autenticação
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Cliente Admin para banco
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 2. Busca Organização
    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) {
      throw new Error('Organization not found')
    }

    // 3. Lê Body da Requisição
    const { message, currentPrompt } = await req.json().catch(() => ({ message: '', currentPrompt: '' }));
    if (!message) throw new Error('Message is required')

    // 4. Salva mensagem do usuário
    await supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'user',
      content: message
    });

    // 5. Chama N8N com Timeout Controlado
    // Edge Functions gratuitas têm limite de 10s (ou mais dependendo do plano), mas é seguro abortar antes.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout (seguro para limite de 60s, ajuste se necessário)

    console.log(`Calling N8N: ${N8N_WEBHOOK_URL}`);
    
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
        throw new Error('A IA demorou muito para responder (Timeout). Tente novamente.');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`N8N Error (${response.status}): ${errText.substring(0, 200)}`);
    }

    const responseText = await response.text();
    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch {
      // Se não for JSON, usa o texto puro se houver
      if (responseText && responseText.trim().length > 0) {
        aiResponse = { message: responseText };
      } else {
        throw new Error('Resposta inválida da IA (Vazia ou não-JSON).');
      }
    }

    // 6. Parsing da Resposta
    let outputItem = Array.isArray(aiResponse) ? aiResponse[0] : aiResponse;
    if (!outputItem) outputItem = {};

    // Procura mensagem em chaves comuns
    let aiMessage = 
      outputItem.output || 
      outputItem.message || 
      outputItem.response || 
      outputItem.text || 
      outputItem.content;

    // Procura dentro de 'data' se existir
    if (!aiMessage && outputItem.data) {
      aiMessage = 
        outputItem.data.output || 
        outputItem.data.message || 
        outputItem.data.response;
    }

    // Se o item for string pura
    if (!aiMessage && typeof outputItem === 'string') {
      aiMessage = outputItem;
    }

    if (!aiMessage) {
      console.warn('AI Response Structure:', JSON.stringify(outputItem));
      aiMessage = "A IA processou, mas não retornou texto visível. Verifique o prompt.";
    }

    // Novo Prompt (se houver)
    const newPrompt = 
      outputItem.new_prompt || 
      outputItem.newPrompt || 
      (outputItem.data ? outputItem.data.new_prompt : null);

    // 7. Salva resposta da IA
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
    
    // Retorna 200 com erro no corpo para que o frontend possa exibir o toast,
    // em vez de falhar a requisição HTTP (o que causaria erro de CORS se não tratado).
    // Ou retorna 500 mas COM os headers CORS garantidos.
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno no servidor.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Mantendo 500 para semântica correta, mas com headers.
    });
  }
})