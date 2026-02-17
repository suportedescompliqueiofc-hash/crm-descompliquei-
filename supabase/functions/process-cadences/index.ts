import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addMinutes, addHours, addDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/botoes-crm-gleyce';

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[process-cadences] Verificando execuções pendentes...");

    // 1. Buscar leads cuja próxima execução já passou
    const { data: leadsInCadence, error: fetchError } = await supabaseAdmin
      .from('lead_cadencias')
      .select(`
        *,
        leads (id, nome, telefone),
        cadencias (
          id,
          passos:cadencia_passos (*)
        )
      `)
      .eq('status', 'ativo')
      .lte('proxima_execucao', new Date().toISOString());

    if (fetchError) throw fetchError;
    if (!leadsInCadence || leadsInCadence.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results = [];

    for (const item of leadsInCadence) {
      try {
        const lead = item.leads;
        const allSteps = item.cadencias.passos.sort((a: any, b: any) => a.posicao_ordem - b.posicao_ordem);
        
        // O passo_atual_ordem começa em 0. O primeiro envio é o passo 1.
        const currentStep = allSteps.find((s: any) => s.posicao_ordem === (item.passo_atual_ordem + 1));

        if (!currentStep) {
          // Se não tem mais passos, finaliza
          await supabaseAdmin.from('lead_cadencias').update({ status: 'concluido' }).eq('id', item.id);
          continue;
        }

        // --- ENVIO DA MENSAGEM ---
        let url_midia = null;
        if (currentStep.arquivo_path) {
          const { data } = supabaseAdmin.storage.from('media-mensagens').getPublicUrl(currentStep.arquivo_path);
          url_midia = data.publicUrl;
        }

        const personalizedMessage = (currentStep.conteudo || '').replace(/\{\{nome_lead\}\}/g, lead.nome || 'Cliente');

        const payload = {
          lead_id: lead.id,
          mensagem: personalizedMessage,
          tipo: currentStep.tipo_mensagem,
          url_midia: url_midia,
          titulo_pdf: currentStep.tipo_mensagem === 'pdf' ? currentStep.nome || 'Documento' : null,
          telefone: lead.telefone,
          remetente: 'bot'
        };

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Webhook Error: ${response.status}`);

        // --- AGENDAMENTO DO PRÓXIMO PASSO ---
        const nextStep = allSteps.find((s: any) => s.posicao_ordem === (currentStep.posicao_ordem + 1));
        
        if (nextStep) {
          const now = new Date();
          let nextDate = now;
          
          if (nextStep.unidade_tempo === 'minutos') nextDate = addMinutes(now, nextStep.tempo_espera);
          else if (nextStep.unidade_tempo === 'horas') nextDate = addHours(now, nextStep.tempo_espera);
          else nextDate = addDays(now, nextStep.tempo_espera);

          await supabaseAdmin
            .from('lead_cadencias')
            .update({ 
              passo_atual_ordem: currentStep.posicao_ordem, 
              proxima_execucao: nextDate.toISOString() 
            })
            .eq('id', item.id);
        } else {
          // Fim do fluxo
          await supabaseAdmin
            .from('lead_cadencias')
            .update({ 
              passo_atual_ordem: currentStep.posicao_ordem, 
              status: 'concluido',
              proxima_execucao: null
            })
            .eq('id', item.id);
        }

        results.push({ lead_id: lead.id, step: currentStep.posicao_ordem, status: 'sent' });

      } catch (err) {
        console.error(`Error processing lead ${item.lead_id}:`, err.message);
        results.push({ lead_id: item.lead_id, status: 'error', error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, details: results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});