import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addMinutes, addHours, addDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/fluxo-cadencia-gleyce';

serve(async (req) => {
  // Tratamento de CORS para chamadas do navegador/n8n
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[process-cadences] Iniciando verificação de rotina...");

    // 1. Busca leads que possuem cadência ativa e já passaram da hora de execução
    const nowIso = new Date().toISOString();
    const { data: leadsInCadence, error: fetchError } = await supabaseAdmin
      .from('lead_cadencias')
      .select(`
        id,
        lead_id,
        cadencia_id,
        passo_atual_ordem,
        organization_id
      `)
      .eq('status', 'ativo')
      .lte('proxima_execucao', nowIso);

    if (fetchError) throw fetchError;
    
    if (!leadsInCadence || leadsInCadence.length === 0) {
      console.log("[process-cadences] Nenhuma mensagem para enviar neste minuto.");
      return new Response(JSON.stringify({ success: true, count: 0 }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    console.log(`[process-cadences] Processando ${leadsInCadence.length} mensagens pendentes.`);

    const results = [];

    for (const item of leadsInCadence) {
      try {
        // 2. Busca os dados do Lead
        const { data: lead, error: leadError } = await supabaseAdmin
          .from('leads')
          .select('id, nome, telefone, usuario_id')
          .eq('id', item.lead_id)
          .single();
        
        if (leadError || !lead) throw new Error("Lead não localizado ou excluído.");

        // 3. Busca a Cadência e todos os seus passos
        const { data: cadence, error: cadenceError } = await supabaseAdmin
          .from('cadencias')
          .select('id, nome')
          .eq('id', item.cadencia_id)
          .single();

        if (cadenceError || !cadence) throw new Error("Fluxo de cadência não localizado.");

        const { data: steps, error: stepsError } = await supabaseAdmin
          .from('cadencia_passos')
          .select('*')
          .eq('cadencia_id', cadence.id)
          .order('posicao_ordem', { ascending: true });

        if (stepsError || !steps || steps.length === 0) throw new Error("Cadência sem passos configurados.");

        // 4. Identifica o passo atual (o próximo a ser enviado)
        const nextStepOrder = (item.passo_atual_ordem || 0) + 1;
        const currentStep = steps.find(s => s.posicao_ordem === nextStepOrder);

        if (!currentStep) {
          console.log(`[process-cadences] Cadência concluída para o lead ${lead.id}`);
          await supabaseAdmin.from('lead_cadencias').update({ status: 'concluido', proxima_execucao: null }).eq('id', item.id);
          continue;
        }

        // 5. Prepara a mídia (URL pública do Storage)
        let url_midia = null;
        if (currentStep.arquivo_path) {
          const { data } = supabaseAdmin.storage.from('media-mensagens').getPublicUrl(currentStep.arquivo_path);
          url_midia = data.publicUrl;
        }

        // 6. Personaliza a mensagem
        const messageBody = (currentStep.conteudo || '').replace(/\{\{nome_lead\}\}/g, lead.nome || 'Cliente');

        // 7. Monta o payload exatamente como as Mensagens Rápidas
        const payload = {
          lead_id: lead.id,
          mensagem: messageBody,
          tipo: currentStep.tipo_mensagem,
          url_midia: url_midia,
          titulo_pdf: currentStep.tipo_mensagem === 'pdf' ? (cadence.nome || 'Documento') : null,
          telefone: lead.telefone,
          user_id: lead.usuario_id,
          remetente: 'bot'
        };

        console.log(`[process-cadences] Enviando passo ${nextStepOrder} para ${lead.telefone}`);

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Erro Webhook n8n (${response.status}): ${errorText}`);
        }

        // 8. Calcula o agendamento do PRÓXIMO passo (se existir)
        const followingStep = steps.find(s => s.posicao_ordem === (nextStepOrder + 1));
        const now = new Date();
        let nextDate = null;
        let finalStatus = 'ativo';

        if (followingStep) {
          nextDate = new Date();
          const tempo = followingStep.tempo_espera || 1;
          if (followingStep.unidade_tempo === 'minutos') nextDate = addMinutes(now, tempo);
          else if (followingStep.unidade_tempo === 'horas') nextDate = addHours(now, tempo);
          else nextDate = addDays(now, tempo);
          nextDate = nextDate.toISOString();
        } else {
          finalStatus = 'concluido';
        }

        // 9. Atualiza o status no banco de dados
        await supabaseAdmin
          .from('lead_cadencias')
          .update({ 
            passo_atual_ordem: nextStepOrder, 
            proxima_execucao: nextDate,
            status: finalStatus,
            ultima_execucao: now.toISOString(),
            status_ultima_execucao: 'sucesso',
            erro_log: null
          })
          .eq('id', item.id);

        results.push({ lead_id: lead.id, step: nextStepOrder, status: 'sent' });

      } catch (err: any) {
        console.error(`[process-cadences] Falha no lead ${item.lead_id}:`, err.message);
        
        // Registra o erro na tabela para feedback visual no CRM
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

  } catch (error: any) {
    console.error('[process-cadences] Erro crítico:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});