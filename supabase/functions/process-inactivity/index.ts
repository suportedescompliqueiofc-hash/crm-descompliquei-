import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { subMinutes } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper para formatar o horário para o fuso de Brasília
const formatToBrasilia = (date: Date) => {
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Sao_Paulo'
  });
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  try {
    console.log("[process-inactivity] Iniciando verificação rigorosa...");

    // 1. Buscar todas as regras ativas
    const { data: activeRules, error: rulesError } = await supabaseAdmin
      .from('inactivity_alerts_config')
      .select('*')
      .eq('is_active', true)
      .order('minutes', { ascending: true }); // Processa as regras mais curtas primeiro

    if (rulesError) throw rulesError;
    
    if (!activeRules || activeRules.length === 0) {
      return new Response(JSON.stringify({ success: true, message: "Sem regras ativas." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let notificationsCreated = 0;

    for (const rule of activeRules) {
      const now = new Date();
      const thresholdDate = subMinutes(now, rule.minutes);
      
      // 2. Buscar leads ativos da organização
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, nome, organization_id, usuario_id')
        .eq('organization_id', rule.organization_id)
        .eq('status', 'Ativo');

      if (leadsError) continue;

      for (const lead of (leads || [])) {
        // 3. Buscar a ÚLTIMA mensagem do lead para ver se o silêncio é do cliente
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

        // Se a última mensagem foi NOSSA (saída) e passou do tempo limite
        if (lastMessage.direcao === 'saida' && isExpired) {
          
          const timeStr = formatToBrasilia(msgDate);
          const alertMsg = `Alerta de Inatividade: ${rule.name} (Última mensagem enviada às ${timeStr})`;

          // 4. VERIFICAÇÃO DE OURO (Envio Único):
          // Verifica se já existe QUALQUER notificação criada para este lead 
          // que seja mais recente que a última mensagem que enviamos.
          // Se houver, significa que já avisamos sobre este período de silêncio.
          const { data: existingNotif, error: checkError } = await supabaseAdmin
            .from('notificacoes')
            .select('id')
            .eq('lead_id', lead.id)
            .gt('criado_em', lastMessage.criado_em)
            .limit(1);

          if (checkError) continue;

          // Se não encontrou nenhuma notificação após a última mensagem, cria o alerta
          if (!existingNotif || existingNotif.length === 0) {
            console.log(`[process-inactivity] Disparando alerta inédito para ${lead.nome} às ${timeStr}`);
            
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
    console.error("[process-inactivity] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});