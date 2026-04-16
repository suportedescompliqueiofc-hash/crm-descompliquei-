import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-descompliquei1';

// Função de espera usando setTimeout – funciona corretamente no runtime Deno
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { batchId } = await req.json();
    if (!batchId) throw new Error("batchId é obrigatório");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Busca todas as mensagens pendentes deste lote, ordenadas por tempo agendado
    const { data: messages, error: fetchError } = await supabaseAdmin
      .from('scheduled_quick_messages')
      .select('*, leads(telefone, id), mensagens_rapidas(*)')
      .eq('batch_id', batchId)
      .eq('status', 'pending')
      .order('scheduled_for', { ascending: true });

    if (fetchError) {
      console.error(`[batch:${batchId}] Erro ao buscar mensagens: ${fetchError.message}`);
      throw fetchError;
    }

    if (!messages || messages.length === 0) {
      console.log(`[batch:${batchId}] Nenhuma mensagem pendente encontrada`);
      return new Response(
        JSON.stringify({ success: true, count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    console.log(`[batch:${batchId}] Iniciando processamento SÍNCRONO de ${messages.length} mensagem(s)`);

    // Processa cada mensagem em sequência, aguardando o tempo correto para cada uma
    for (const item of messages) {

      // 1. Verifica se ainda está pendente (pode ter sido cancelada pelo usuário)
      const { data: check } = await supabaseAdmin
        .from('scheduled_quick_messages')
        .select('status')
        .eq('id', item.id)
        .single();

      if (!check || check.status !== 'pending') {
        console.log(`[batch:${batchId}] Mensagem ${item.id} não está mais pendente (${check?.status}), pulando`);
        continue;
      }

      // 2. Calcula e aguarda o tempo necessário até o horário agendado
      const scheduledTime = new Date(item.scheduled_for).getTime();
      const waitMs = scheduledTime - Date.now();

      if (waitMs > 0) {
        const waitSecs = Math.round(waitMs / 1000);
        console.log(`[batch:${batchId}] Aguardando ${waitSecs}s para enviar "${item.mensagens_rapidas?.titulo}"`);
        await sleep(waitMs); // SÍNCRONO – o processo fica vivo durante a espera
      } else {
        console.log(`[batch:${batchId}] Mensagem "${item.mensagens_rapidas?.titulo}" já está no horário, enviando imediatamente`);
      }

      // 3. Verifica novamente após a espera (pode ter sido cancelada durante o delay)
      const { data: check2 } = await supabaseAdmin
        .from('scheduled_quick_messages')
        .select('status')
        .eq('id', item.id)
        .single();

      if (!check2 || check2.status !== 'pending') {
        console.log(`[batch:${batchId}] Mensagem ${item.id} foi cancelada durante a espera, pulando`);
        continue;
      }

      // 4. Envia a mensagem via webhook
      try {
        const message = item.mensagens_rapidas;
        const lead = item.leads;

        if (!message || !lead) throw new Error("Dados de mensagem ou lead ausentes");

        let url_midia = null;
        if (message.arquivo_path) {
          const { data } = supabaseAdmin.storage
            .from('media-mensagens')
            .getPublicUrl(message.arquivo_path);
          url_midia = data.publicUrl;
        }

        const payload = {
          lead_id: lead.id,
          mensagem: message.conteudo || '',
          tipo: message.tipo,
          url_midia,
          titulo_pdf: message.tipo === 'pdf' ? message.titulo : null,
          telefone: lead.telefone,
          user_id: item.user_id,
          remetente: 'bot'
        };

        console.log(`[batch:${batchId}] Enviando "${message.titulo}" para ${lead.telefone}`);

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Webhook retornou status ${response.status}`);

        // Marca como enviada no banco
        await supabaseAdmin
          .from('scheduled_quick_messages')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', item.id);

        console.log(`[batch:${batchId}] ✅ "${message.titulo}" enviada com sucesso!`);

      } catch (e: any) {
        console.error(`[batch:${batchId}] ❌ Erro ao enviar mensagem ${item.id}: ${e.message}`);
        await supabaseAdmin
          .from('scheduled_quick_messages')
          .update({ status: 'error', error_message: e.message })
          .eq('id', item.id);
      }
    }

    console.log(`[batch:${batchId}] ✅ Sequência completa!`);
    return new Response(
      JSON.stringify({ success: true, processed: messages.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error(`[process-folder-sequence] Erro fatal: ${error.message}`);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
