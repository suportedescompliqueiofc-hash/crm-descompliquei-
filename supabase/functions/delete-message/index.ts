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
    // 1. Obter dados da requisição
    const { messageId, leadId, id_mensagem } = await req.json()

    if (!messageId) {
      throw new Error('ID da mensagem é obrigatório')
    }

    console.log(`Iniciando exclusão. MsgID: ${messageId}, WAMID: ${id_mensagem}`);

    // 2. Chamar o Webhook do n8n (Server-to-Server, sem bloqueio de CORS)
    if (id_mensagem) {
      try {
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id_mensagem: id_mensagem,
            lead_id: leadId,
            internal_message_id: messageId
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro no n8n:', response.status, errorText);
          // Não lançamos erro fatal aqui para garantir que a mensagem seja excluída do banco
          // mesmo se o n8n falhar, mas logamos o erro.
        } else {
          console.log('Webhook enviado com sucesso para o n8n');
        }
      } catch (webhookError) {
        console.error('Falha de conexão com n8n:', webhookError);
      }
    }

    // 3. Excluir do Banco de Dados (Supabase)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('mensagens')
      .delete()
      .eq('id', messageId)

    if (dbError) {
      throw new Error(`Erro ao excluir do banco: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('Erro geral na função delete-message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})