import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-gleyce';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[process-scheduled-messages] Iniciando busca de mensagens pendentes...");

    // 1. Buscar mensagens pendentes que já deveriam ter sido enviadas
    const { data: pendingMessages, error: fetchError } = await supabaseAdmin
      .from('scheduled_quick_messages')
      .select(`
        *,
        leads (telefone),
        mensagens_rapidas (*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());

    if (fetchError) throw fetchError;

    if (!pendingMessages || pendingMessages.length === 0) {
      console.log("[process-scheduled-messages] Nenhuma mensagem pendente para agora.");
      return new Response(JSON.stringify({ success: true, count: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[process-scheduled-messages] Processando ${pendingMessages.length} mensagens...`);

    const results = await Promise.all(pendingMessages.map(async (item) => {
      try {
        const message = item.mensagens_rapidas;
        const lead = item.leads;

        if (!message || !lead) {
            throw new Error("Dados de mensagem ou lead ausentes.");
        }

        let url_midia = null;
        if (message.arquivo_path) {
          const { data } = supabaseAdmin.storage
            .from('media-mensagens')
            .getPublicUrl(message.arquivo_path);
          url_midia = data.publicUrl;
        }

        const payload = {
          lead_id: item.lead_id,
          mensagem: message.conteudo || '',
          tipo: message.tipo,
          url_midia: url_midia,
          titulo_pdf: message.tipo === 'pdf' ? message.titulo : null,
          telefone: lead.telefone,
          user_id: item.user_id,
          remetente: 'bot'
        };

        // Enviar para o webhook
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Webhook falhou com status ${response.status}`);

        // Atualizar status para enviado
        await supabaseAdmin
          .from('scheduled_quick_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id);

        return { id: item.id, status: 'sent' };

      } catch (err) {
        console.error(`[process-scheduled-messages] Erro ao enviar mensagem ${item.id}:`, err.message);
        
        await supabaseAdmin
          .from('scheduled_quick_messages')
          .update({ status: 'error', error_message: err.message })
          .eq('id', item.id);
          
        return { id: item.id, status: 'error', error: err.message };
      }
    }));

    return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-scheduled-messages] Erro fatal:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});