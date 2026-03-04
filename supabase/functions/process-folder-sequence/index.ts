import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { delay } from "https://deno.land/std@0.190.0/async/delay.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-gleyce';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  
  try {
    const { batchId } = await req.json();
    if (!batchId) throw new Error("batchId required");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Executa o processamento em background (fire and forget)
    // para não dar timeout no frontend
    const processBatch = async () => {
       const { data: messages } = await supabaseAdmin
        .from('scheduled_quick_messages')
        .select('*, leads(telefone, id), mensagens_rapidas(*)')
        .eq('batch_id', batchId)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });
        
       if (!messages || messages.length === 0) return;

       for (const item of messages) {
          // Verifica se o usuário não cancelou a sequência enquanto aguardava
          const { data: check } = await supabaseAdmin.from('scheduled_quick_messages').select('status').eq('id', item.id).single();
          if (!check || check.status !== 'pending') continue;

          const scheduledTime = new Date(item.scheduled_for).getTime();
          const now = Date.now();
          const waitTime = scheduledTime - now;
          
          // Aguarda o intervalo exato de segundos
          if (waitTime > 0) {
             await delay(waitTime);
          }

          // Verifica novamente após o delay
          const { data: check2 } = await supabaseAdmin.from('scheduled_quick_messages').select('status').eq('id', item.id).single();
          if (!check2 || check2.status !== 'pending') continue;

          try {
            const message = item.mensagens_rapidas;
            const lead = item.leads;

            if (!message || !lead) throw new Error("Dados ausentes.");

            let url_midia = null;
            if (message.arquivo_path) {
              const { data } = supabaseAdmin.storage.from('media-mensagens').getPublicUrl(message.arquivo_path);
              url_midia = data.publicUrl;
            }

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

          } catch(e: any) {
             await supabaseAdmin
              .from('scheduled_quick_messages')
              .update({ status: 'error', error_message: e.message })
              .eq('id', item.id);
          }
       }
    };

    processBatch().catch(err => console.error("Batch processing error:", err));

    return new Response(JSON.stringify({ success: true, message: "Sequência iniciada" }), { headers: corsHeaders });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});