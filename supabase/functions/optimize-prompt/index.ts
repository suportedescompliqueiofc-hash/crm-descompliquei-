import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Headers CORS permissivos para evitar bloqueios no front-end
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/assistente-prompt-viviane';

serve(async (req) => {
  // 1. Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log("[optimize-prompt] Iniciando função...");

    // 2. Validação de Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization header missing')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      console.error("[optimize-prompt] Erro de Auth:", authError);
      return new Response(JSON.stringify({ error: 'Usuário não autenticado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // 3. Cliente Admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 4. Dados da Organização
    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organização não encontrada')

    // 5. Parse Body
    const { message, currentPrompt } = await req.json().catch(() => ({}));
    if (!message) throw new Error('Mensagem obrigatória não fornecida')

    // 6. Salvar Histórico (User) - Sem await para não bloquear
    supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'user',
      content: message
    }).then(({ error }) => {
      if (error) console.error('[optimize-prompt] Erro ao salvar histórico user:', error)
    });

    // 7. Chamada ao N8N com Timeout Estendido (50 segundos)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s Timeout

    console.log(`[optimize-prompt] Chamando N8N (${N8N_WEBHOOK_URL})...`);
    
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
      console.error("[optimize-prompt] Erro no fetch:", fetchError);
      if (fetchError.name === 'AbortError') {
        throw new Error('A IA demorou mais de 50 segundos para responder. Tente uma solicitação mais simples.');
      }
      throw fetchError;
    } finally {
      clearTimeout(timeoutId);
    }

    // 8. Processamento da Resposta
    const responseText = await response.text();
    console.log(`[optimize-prompt] Status N8N: ${response.status}. Tamanho resp: ${responseText.length}`);

    if (!response.ok) {
      throw new Error(`N8N retornou erro ${response.status}: ${responseText.substring(0, 200)}`);
    }

    let aiResponse;
    try {
      aiResponse = JSON.parse(responseText);
    } catch (e) {
      // Fallback para texto plano se não for JSON
      if (responseText && responseText.trim().length > 0) {
        aiResponse = { message: responseText };
      } else {
        throw new Error('Resposta vazia ou inválida do N8N.');
      }
    }

    // Normaliza array/objeto
    let outputItem = Array.isArray(aiResponse) ? aiResponse[0] : aiResponse;
    if (!outputItem) outputItem = {};

    // Estratégia de busca da mensagem (várias chaves possíveis)
    let aiMessage = 
      outputItem.output || 
      outputItem.message || 
      outputItem.response || 
      outputItem.text || 
      outputItem.content ||
      (outputItem.data ? (outputItem.data.output || outputItem.data.message) : null) ||
      (outputItem.body ? (outputItem.body.output || outputItem.body.message) : null);

    // Se for string direta
    if (!aiMessage && typeof outputItem === 'string') {
      aiMessage = outputItem;
    }

    if (!aiMessage) {
      console.warn('[optimize-prompt] JSON recebido sem campo de mensagem conhecido:', JSON.stringify(outputItem).substring(0, 500));
      aiMessage = "A IA processou a requisição mas não retornou texto. Verifique o fluxo no N8N.";
    }

    // Extrai novo prompt se houver
    const newPrompt = 
      outputItem.new_prompt || 
      outputItem.newPrompt || 
      (outputItem.data ? outputItem.data.new_prompt : null);

    // 9. Salvar Histórico (IA)
    await supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'assistant',
      content: typeof aiMessage === 'string' ? aiMessage : JSON.stringify(aiMessage)
    });

    console.log("[optimize-prompt] Sucesso. Retornando resposta.");

    return new Response(JSON.stringify({ 
      success: true, 
      message: aiMessage,
      newPrompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[optimize-prompt] ERRO FATAL:', error);
    
    // Retorna 200 com flag de erro no JSON para o frontend tratar sem quebrar (evita CORS error do browser)
    // ou 500 com headers CORS explícitos. Preferível 500 com headers.
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno desconhecido.' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})