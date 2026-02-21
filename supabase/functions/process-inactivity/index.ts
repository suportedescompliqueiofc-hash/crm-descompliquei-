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
    console.log("[process-inactivity] Iniciando verificação...");

    // 1. Buscar todas as regras ativas
    const { data: activeRules, error: rulesError } = await supabaseAdmin
      .from('inactivity_alerts_config')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;
    
    if (!activeRules || activeRules.length === 0) {
      console.log("[process-inactivity] Nenhuma regra ativa encontrada.");
      return new Response(JSON.stringify({ success: true, message: "Sem regras ativas." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log(`[process-inactivity] Processando ${activeRules.length} regras ativas.`);

    let notificationsCreated = 0;

    for (const rule of activeRules) {
      const now = new Date();
      const thresholdDate = subMinutes(now, rule.minutes);
      
      console.log(`[process-inactivity] Regra: "${rule.name}" (${rule.minutes} min). Limite: ${thresholdDate.toISOString()}`);

      // 2. Buscar leads da organização que estão "Ativos"
      const { data: leads, error: leadsError } = await supabaseAdmin
        .from('leads')
        .select('id, nome, telefone, organization_id, usuario_id')
        .eq('organization_id', rule.organization_id)
        .eq('status', 'Ativo');

      if (leadsError) {
        console.error(`[process-inactivity] Erro ao buscar leads da org ${rule.organization_id}:`, leadsError);
        continue;
      }

      console.log(`[process-inactivity] Analisando ${leads?.length || 0} leads ativos.`);

      for (const lead of (leads || [])) {
        // 3. Verificar a ÚLTIMA mensagem deste lead
        const { data: lastMessage, error: msgError } = await supabaseAdmin
          .from('mensagens')
          .select('direcao, criado_em, conteudo')
          .eq('lead_id', lead.id)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (msgError) {
          console.error(`[process-inactivity] Erro ao buscar mensagens do lead ${lead.nome}:`, msgError);
          continue;
        }

        if (!lastMessage) {
          console.log(`[process-inactivity] Lead ${lead.nome} não possui mensagens.`);
          continue;
        }

        const msgDate = new Date(lastMessage.criado_em);
        const isExpired = msgDate <= thresholdDate;

        console.log(`[process-inactivity] Lead: ${lead.nome} | Última msg: ${lastMessage.direcao} em ${msgDate.toISOString()} | Expirou? ${isExpired}`);

        // CONDIÇÃO: Última mensagem foi NOSSA (saida) e faz mais tempo que o limite configurado
        if (lastMessage.direcao === 'saida' && isExpired) {
          
          // 4. Verificar se já existe uma notificação PENDENTE idêntica para evitar spam
          const alertMsg = `Alerta de Inatividade: ${rule.name}`;
          const { data: existingNotif } = await supabaseAdmin
            .from('notificacoes')
            .select('id')
            .eq('lead_id', lead.id)
            .eq('status', 'pendente')
            .eq('mensagem', alertMsg)
            .maybeSingle();

          if (!existingNotif) {
            console.log(`[process-inactivity] Criando notificação para lead ${lead.nome}`);
            
            const { error: insertError } = await supabaseAdmin
              .from('notificacoes')
              .insert({
                lead_id: lead.id,
                user_id: lead.usuario_id, // Vincula ao responsável pelo lead se houver
                mensagem: alertMsg,
                status: 'pendente'
              });

            if (insertError) {
              console.error("[process-inactivity] Erro ao inserir notificação:", insertError);
            } else {
              notificationsCreated++;
            }
          } else {
            console.log(`[process-inactivity] Alerta pendente já existe para ${lead.nome}.`);
          }
        }
      }
    }

    console.log(`[process-inactivity] Finalizado. ${notificationsCreated} novas notificações criadas.`);

    return new Response(JSON.stringify({ 
      success: true, 
      new_notifications: notificationsCreated 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error: any) {
    console.error("[process-inactivity] Erro crítico:", error.message);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});