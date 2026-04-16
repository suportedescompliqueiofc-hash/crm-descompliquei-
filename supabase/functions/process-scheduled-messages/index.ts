import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-descompliquei1';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    const { data: pendingMessages, error: fetchError } = await supabaseAdmin
      .from('scheduled_quick_messages')
      .select(`
        *,
        leads (telefone, id),
        mensagens_rapidas (*)
      `)
      .eq('status', 'pending')
      .lte('scheduled_for', new Date().toISOString());
    if (fetchError) throw fetchError;
    if (!pendingMessages || pendingMessages.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    for (const item of pendingMessages) {
      try {
        const message = item.mensagens_rapidas;
        const lead = item.leads;

        if (!message || !lead) throw new Error("Dados ausentes.");

        let url_midia = null;
        if (message.arquivo_path) {
          const { data } = supabaseAdmin.storage.from('media-mensagens').getPublicUrl(message.arquivo_path);
          url_midia = data.publicUrl;
        }

        // PAYLOAD IDÊNTICO ÀS MENSAGENS RÁPIDAS
        const payload = {
          lead_id: lead.id,
          mensagem: message.conteudo || '',
          tipo: message.tipo,
          url_midia: url_midia,
          titulo_pdf: message.tipo === 'pdf' ? message.titulo : null,
          telefone: lead.telefone,
          user_id: item.user_id,
          remetente: 'bot'
        };

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Status ${response.status}`);

        await supabaseAdmin
          .from('scheduled_quick_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id);

      } catch (err) {
        await supabaseAdmin
          .from('scheduled_quick_messages')
          .update({ status: 'error', error_message: err.message })
          .eq('id', item.id);
      }
    }

    return new Response(JSON.stringify({ success: true, processed: pendingMessages.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
