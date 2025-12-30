import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/assistente-prompt-viviane';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Configuração do Cliente Supabase
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Authorization header missing')

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: profile } = await supabaseAdmin
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single()

    if (!profile?.organization_id) throw new Error('Organization not found')

    // 2. Parse da Requisição
    const { message, currentPrompt } = await req.json().catch(() => ({}));
    if (!message) throw new Error('Message is required')

    // 3. Salvar mensagem do usuário (Fire and forget para não bloquear)
    supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'user',
      content: message
    }).then();

    // 4. Chamada ao N8N
    console.log(`Calling N8N: ${N8N_WEBHOOK_URL}`);
    
    // Timeout de 55s (perto do limite de 60s das edge functions)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000);

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
      console.error("N8N Fetch Error:", fetchError);
      throw new Error(fetchError.name === 'AbortError' ? 'N8N Timeout (55s)' : `Connection Failed: ${fetchError.message}`);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`N8N Error ${response.status}: ${errText.substring(0, 200)}`);
    }

    // 5. Processamento Robusto da Resposta
    const responseText = await response.text();
    console.log("N8N Response Length:", responseText.length);

    let aiMessage = "";
    let newPrompt = null;

    try {
      // Tenta parsear JSON
      const jsonResponse = JSON.parse(responseText);
      
      // Normaliza se for array
      const data = Array.isArray(jsonResponse) ? jsonResponse[0] : jsonResponse;

      // Busca conteúdo em todas as propriedades possíveis
      aiMessage = 
        data.output || 
        data.message || 
        data.response || 
        data.text || 
        data.content ||
        (data.data && (data.data.output || data.data.message)) ||
        (data.body && (data.body.output || data.body.message));

      // Se não achou em nenhuma propriedade conhecida, mas é um objeto, stringify ele todo
      if (!aiMessage && typeof data === 'object') {
        console.warn("JSON structure unknown, saving full object.");
        aiMessage = JSON.stringify(data, null, 2);
      }

      // Extrai novo prompt
      newPrompt = data.new_prompt || data.newPrompt || (data.data && data.data.new_prompt);

    } catch (e) {
      // Se falhar o parse JSON, usa o texto puro se não for vazio
      console.log("Not a JSON response, using raw text.");
      if (responseText && responseText.trim().length > 0) {
        aiMessage = responseText;
      } else {
        aiMessage = "Erro: A IA retornou uma resposta vazia.";
      }
    }

    // 6. Salva a resposta da IA no banco (CRUCIAL)
    // Usamos await aqui para garantir que salve antes de retornar
    const { error: saveError } = await supabaseAdmin.from('ai_prompt_chat_history').insert({
      organization_id: profile.organization_id,
      role: 'assistant',
      content: aiMessage
    });

    if (saveError) console.error("Error saving AI response:", saveError);

    // 7. Retorno para o frontend
    return new Response(JSON.stringify({ 
      success: true, 
      message: aiMessage,
      newPrompt 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Fatal Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal Server Error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
})