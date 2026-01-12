import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const targetStages = [
  { nome: 'Novo Lead', cor: '#94a3b8', posicao_ordem: 1 }, // Slate
  { nome: 'Em Atendimento (IA)', cor: '#5D404A', posicao_ordem: 2 }, // Mauve (Brand)
  { nome: 'Agendamento Solicitado', cor: '#C5A47E', posicao_ordem: 3 }, // Gold (Brand)
  { nome: 'Agendado', cor: '#4ade80', posicao_ordem: 4 }, // Green 400
  { nome: 'Avaliação Realizada', cor: '#f472b6', posicao_ordem: 5 }, // Pink 400
  { nome: 'Negociação/Orçamento', cor: '#60a5fa', posicao_ordem: 6 }, // Blue 400
  { nome: 'Contrato Fechado', cor: '#15803d', posicao_ordem: 7 }, // Green 700
  { nome: 'Perdido', cor: '#ef4444', posicao_ordem: 8 }, // Red 500
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usando service role para poder editar/excluir
    );

    // 1. Buscar etapas existentes
    const { data: currentStages, error: fetchError } = await supabaseClient
      .from('etapas')
      .select('*')
      .order('posicao_ordem', { ascending: true });

    if (fetchError) throw fetchError;

    const updates = [];
    const inserts = [];

    // 2. Mapear atualizações e inserções
    // Estratégia: Atualizar as primeiras N etapas existentes para os novos nomes/cores para preservar os leads nelas.
    // Inserir as novas se faltarem.
    
    for (let i = 0; i < targetStages.length; i++) {
      const target = targetStages[i];
      if (i < currentStages.length) {
        // Atualiza etapa existente
        const existing = currentStages[i];
        updates.push(
          supabaseClient
            .from('etapas')
            .update({ nome: target.nome, cor: target.cor, posicao_ordem: target.posicao_ordem })
            .eq('id', existing.id)
        );
      } else {
        // Insere nova etapa
        inserts.push(target);
      }
    }

    // Executar atualizações em paralelo
    await Promise.all(updates);

    // Executar inserções
    if (inserts.length > 0) {
      await supabaseClient.from('etapas').insert(inserts);
    }

    // (Opcional) Poderíamos deletar etapas extras se não tiverem leads, mas por segurança vamos mantê-las por enquanto
    // ou renomeá-las para "Obsoleto".

    return new Response(JSON.stringify({ success: true, message: "Etapas atualizadas com sucesso!" }), {
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