import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { subMinutes } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[process-inactivity] Iniciando verificação de leads parados...");

    // 1. Buscar todas as regras ativas de todas as organizações
    const { data: activeRules, error: rulesError } = await supabaseAdmin
      .from('inactivity_alerts_config')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;
    if (!activeRules || activeRules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Sem regras ativas." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let notificationsCreated = 0;

    for (const rule of activeRules) {
      const thresholdDate = subMinutes(new Date(), rule.minutes).toISOString();

      // 2. Buscar leads daquela organização que estão "Ativos"
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, nome, telefone, organization_id')
        .eq('organization_id', rule.organization_id)
        .eq('status', 'Ativo');

      if (leadsError) continue;

      for (const lead of leads) {
        // 3. Verificar a ÚLTIMA mensagem deste lead
        const { data: lastMessage, error: msgError } = await supabaseAdmin
          .from('mensagens')
          .select('direcao, criado_em')
          .eq('lead_id', lead.id)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (msgError || !lastMessage) continue;

        // Regra: Notificar se a última mensagem foi NOSSA (saida) e faz mais tempo que o limite
        if (lastMessage.direcao === 'saida' && lastMessage.criado_em <= thresholdDate) {
          
          // 4. Verificar se já existe uma notificação PENDENTE idêntica para não duplicar
          const { data: existingNotif } = await supabaseAdmin
            .from('notificacoes')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('status', 'pendente')
            .eq('mensagem', `Alerta de Inatividade: ${rule.name}`)
            .maybeSingle();

          if (!existingNotif) {
            const { error: insertError } = await supabaseAdmin
              .from('notificacoes')
              .insert({
                organization_id: lead.organization_id,
                lead_id: lead.id,
                mensagem: `Alerta de Inatividade: ${rule.name}`,
                status: 'pendente'
              });

            if (!insertError) notificationsCreated++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      processed_rules: activeRules.length,
      new_notifications: notificationsCreated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error("[process-inactivity] Erro fatal:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});