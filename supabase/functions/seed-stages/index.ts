import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuração PADRÃO solicitada (6 etapas principais + Perdido como extra)
const targetStages = [
  { nome: 'Novo Lead', cor: '#94a3b8', posicao_ordem: 1 }, 
  { nome: 'Qualificação', cor: '#64748b', posicao_ordem: 2 },
  { nome: 'Agendamento Solicitado', cor: '#C5A47E', posicao_ordem: 3 },
  { nome: 'Coletando Informações', cor: '#a8a29e', posicao_ordem: 4 },
  { nome: 'Agendado', cor: '#4ade80', posicao_ordem: 5 },
  { nome: 'Procedimento Fechado', cor: '#15803d', posicao_ordem: 6 },
  // Mantemos 'Perdido' como etapa 7 para organização, mas não faz parte do funil de métricas principal
  { nome: 'Perdido', cor: '#ef4444', posicao_ordem: 7 }, 
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

    // 1. Buscar etapas existentes
    const { data: currentStages, error: fetchError } = await supabaseClient
      .from('etapas')
      .select('*')
      .order('posicao_ordem', { ascending: true });

    if (fetchError) throw fetchError;

    const updates = [];
    const inserts = [];

    // 2. Mapear atualizações
    for (let i = 0; i < targetStages.length; i++) {
      const target = targetStages[i];
      if (i < currentStages.length) {
        // Atualiza etapa existente (renomeia e muda cor/ordem)
        const existing = currentStages[i];
        updates.push(
          supabaseClient
            .from('etapas')
            .update({ nome: target.nome, cor: target.cor, posicao_ordem: target.posicao_ordem })
            .eq('id', existing.id)
        );
      } else {
        // Insere nova etapa se faltar
        inserts.push(target);
      }
    }

    // 3. Executar atualizações em paralelo
    await Promise.all(updates);

    // 4. Executar inserções
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