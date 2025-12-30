import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/excluir-mensagem-viviane';

serve(async (req) => {
  // Tratamento de CORS (Preflight)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messageId, leadId, id_mensagem } = await req.json()

    if (!messageId) {
      throw new Error('ID da mensagem é obrigatório')
    }

    console.log(`[delete-message] Iniciando. MsgID: ${messageId}, WAMID: ${id_mensagem || 'N/A'}`);

    // --- DISPARO DO WEBHOOK ---
    // Removemos a verificação 'if (id_mensagem)' para garantir que o webhook
    // chegue no n8n independentemente de termos o ID externo ou não.
    try {
      console.log(`[delete-message] Disparando webhook para: ${N8N_WEBHOOK_URL}`);
      
      const payload = { 
        id_mensagem: id_mensagem || null, // Garante que envie null se for undefined
        lead_id: leadId,
        internal_message_id: messageId,
        timestamp: new Date().toISOString()
      };

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Supabase-Edge-Function/1.0' // Alguns firewalls exigem User-Agent
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[delete-message] N8N respondeu com erro (${response.status}):`, errorText);
      } else {
        console.log('[delete-message] Webhook entregue com sucesso ao n8n');
      }
    } catch (webhookError) {
      console.error('[delete-message] Falha crítica ao conectar com n8n:', webhookError);
      // Não interrompemos o fluxo para garantir que a exclusão no banco ocorra
    }

    // 2. Excluir do Banco de Dados (Supabase)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('mensagens')
      .delete()
      .eq('id', messageId)

    if (dbError) {
      console.error('[delete-message] Erro ao excluir do banco:', dbError);
      throw new Error(`Erro ao excluir do banco: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[delete-message] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})