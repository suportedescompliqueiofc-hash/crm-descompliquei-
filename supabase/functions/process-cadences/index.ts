import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addMinutes, addHours, addDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/fluxo-cadencia-gleyce';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[process-cadences] Iniciando verificação...");

    // 1. Busca leads com execução pendente
    const { data: leadsInCadence, error: fetchError } = await supabaseAdmin
      .from('lead_cadencias')
      .select(`
        *,
        leads (id, nome, telefone, usuario_id),
        cadencias (
          id,
          nome,
          cadencia_passos (*)
        )
      `)
      .eq('status', 'ativo')
      .lte('proxima_execucao', new Date().toISOString());

    if (fetchError) throw fetchError;
    
    if (!leadsInCadence || leadsInCadence.length === 0) {
      console.log("[process-cadences] Nada para processar no momento.");
      return new Response(JSON.stringify({ success: true, count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[process-cadences] Encontrados ${leadsInCadence.length} itens.`);

    const results = [];

    for (const item of leadsInCadence) {
      try {
        const lead = item.leads;
        const cadence = item.cadencias;
        
        // Correção aqui: O Supabase retorna a tabela relacionada pelo nome real dela
        const allSteps = (cadence.cadencia_passos || []).sort((a: any, b: any) => a.posicao_ordem - b.posicao_ordem);
        
        // Próximo passo a ser enviado
        const stepNumberToSend = (item.passo_atual_ordem || 0) + 1;
        const currentStep = allSteps.find((s: any) => s.posicao_ordem === stepNumberToSend);

        if (!currentStep) {
          console.log(`[process-cadences] Cadência concluída para o lead ${lead.id}`);
          await supabaseAdmin.from('lead_cadencias').update({ status: 'concluido' }).eq('id', item.id);
          continue;
        }

        // --- PREPARAÇÃO DA MÍDIA ---
        let url_midia = null;
        if (currentStep.arquivo_path) {
          const { data } = supabaseAdmin.storage.from('media-mensagens').getPublicUrl(currentStep.arquivo_path);
          url_midia = data.publicUrl;
        }

        const personalizedMessage = (currentStep.conteudo || '').replace(/\{\{nome_lead\}\}/g, lead.nome || 'Cliente');

        // PAYLOAD IDÊNTICO ÀS MENSAGENS RÁPIDAS
        const payload = {
          lead_id: lead.id,
          mensagem: personalizedMessage,
          tipo: currentStep.tipo_mensagem,
          url_midia: url_midia,
          titulo_pdf: currentStep.tipo_mensagem === 'pdf' ? (cadence.nome || 'Documento') : null,
          telefone: lead.telefone,
          user_id: lead.usuario_id,
          remetente: 'bot'
        };

        console.log(`[process-cadences] Enviando Passo ${stepNumberToSend} para ${lead.telefone}`);

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Webhook Error (${response.status}): ${errorText}`);
        }

        // --- AGENDAMENTO DO PRÓXIMO PASSO ---
        const nextStep = allSteps.find((s: any) => s.posicao_ordem === (stepNumberToSend + 1));
        const now = new Date();
        let nextDate = null;
        let finalStatus = 'ativo';

        if (nextStep) {
          nextDate = now;
          if (nextStep.unidade_tempo === 'minutos') nextDate = addMinutes(now, nextStep.tempo_espera);
          else if (nextStep.unidade_tempo === 'horas') nextDate = addHours(now, nextStep.tempo_espera);
          else nextDate = addDays(now, nextStep.tempo_espera);
          nextDate = nextDate.toISOString();
        } else {
          finalStatus = 'concluido';
        }

        await supabaseAdmin
          .from('lead_cadencias')
          .update({ 
            passo_atual_ordem: stepNumberToSend, 
            proxima_execucao: nextDate,
            status: finalStatus,
            ultima_execucao: now.toISOString(),
            status_ultima_execucao: 'sucesso',
            erro_log: null
          })
          .eq('id', item.id);

        results.push({ lead_id: lead.id, step: stepNumberToSend, status: 'sent' });

      } catch (err) {
        console.error(`[process-cadences] Erro no lead ${item.lead_id}:`, err.message);
        await supabaseAdmin
          .from('lead_cadencias')
          .update({ 
            ultima_execucao: new Date().toISOString(),
            status_ultima_execucao: 'erro',
            erro_log: err.message
          })
          .eq('id', item.id);
        results.push({ lead_id: item.lead_id, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[process-cadences] Erro fatal:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});