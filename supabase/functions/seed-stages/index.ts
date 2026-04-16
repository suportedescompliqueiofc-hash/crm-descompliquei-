import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração PADRÃO para Clínicas
const targetStages = [
  { nome: 'Novo Lead', cor: '#93c5fd', posicao_ordem: 1 }, 
  { nome: 'Qualificação', cor: '#3b82f6', posicao_ordem: 2 },
  { nome: 'Coletando Informações', cor: '#d1d5db', posicao_ordem: 3 },
  { nome: 'Agendamento Solicitado', cor: '#fef08a', posicao_ordem: 4 },
  { nome: 'Agendado', cor: '#10b981', posicao_ordem: 5 },
  { nome: 'Procedimento Fechado', cor: '#22c55e', posicao_ordem: 6 },
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: currentStages, error: fetchError } = await supabaseClient
      .from('etapas')
      .select('*')
      .order('posicao_ordem', { ascending: true });

    if (fetchError) throw fetchError;

    const updates = [];
    const inserts = [];

    for (let i = 0; i < targetStages.length; i++) {
      const target = targetStages[i];
      if (i < currentStages.length) {
        const existing = currentStages[i];
        updates.push(
          supabaseClient
            .from('etapas')
            .update({ nome: target.nome, cor: target.cor, posicao_ordem: target.posicao_ordem })
            .eq('id', existing.id)
        );
      } else {
        inserts.push(target);
      }
    }

    await Promise.all(updates);

    if (inserts.length > 0) {
      await supabaseClient.from('etapas').insert(inserts);
    }

    return new Response(JSON.stringify({ success: true, message: "Etapas padronizadas com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função seed-stages:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});