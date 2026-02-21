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
    console.log("[process-inactivity] Iniciando verificação de inatividade...");

    // 1. Buscar todas as regras ativas
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
      const now = new Date();
      const thresholdDate = subMinutes(now, rule.minutes);
      
      // 2. Buscar leads da organização que estão "Ativos"
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, nome, organization_id, usuario_id')
        .eq('organization_id', rule.organization_id)
        .eq('status', 'Ativo');

      if (leadsError) continue;

      for (const lead of (leads || [])) {
        // 3. Verificar a ÚLTIMA mensagem absoluta deste lead
        const { data: lastMessage, error: msgError } = await supabaseAdmin
          .from('mensagens')
          .select('direcao, criado_em')
          .eq('lead_id', lead.id)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (msgError || !lastMessage) continue;

        const msgDate = new Date(lastMessage.criado_em);
        const isExpired = msgDate <= thresholdDate;

        // CONDIÇÃO: Última mensagem foi NOSSA (saída) e passou do tempo limite
        if (lastMessage.direcao === 'saida' && isExpired) {
          
          const alertMsg = `Alerta de Inatividade: ${rule.name}`;

          // 4. REGRA DE OURO: Verificar se já notificamos este silêncio específico.
          // Procuramos por QUALQUER notificação (pendente ou resolvida) criada APÓS a nossa última mensagem.
          const { data: existingNotif } = await supabaseAdmin
            .from('notificacoes')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('mensagem', alertMsg)
            .gt('criado_em', lastMessage.criado_em) // Verifica se o alerta é mais novo que a msg
            .maybeSingle();

          if (!existingNotif) {
            console.log(`[process-inactivity] Disparando alerta único para ${lead.nome} (Regra: ${rule.name})`);
            
            const { error: insertError } = await supabaseAdmin
              .from('notificacoes')
              .insert({
                lead_id: lead.id,
                user_id: lead.usuario_id,
                mensagem: alertMsg,
                status: 'pendente'
              });

            if (!insertError) notificationsCreated++;
          }
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      new_notifications: notificationsCreated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});