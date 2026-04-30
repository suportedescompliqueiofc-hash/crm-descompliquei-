import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function resolveLlmEndpoint(model: string): { url: string; apiKey: string; cleanModel: string } {
  const xaiApiKey = Deno.env.get("XAI_API_KEY") ?? "";
  const openrouterApiKey = Deno.env.get("OPENROUTER_API_KEY") ?? "";
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  if (model.startsWith("openrouter/")) {
    if (!openrouterApiKey) throw new Error("OPENROUTER_API_KEY is not set in Supabase Secrets");
    return { url: "https://openrouter.ai/api/v1/chat/completions", apiKey: openrouterApiKey, cleanModel: model.replace("openrouter/", "") };
  }
  if (model.startsWith("gpt-") || model.startsWith("o1-") || model.startsWith("o3-") || model.startsWith("o4-")) {
    if (!openaiApiKey) throw new Error("OPENAI_API_KEY is not set in Supabase Secrets");
    return { url: "https://api.openai.com/v1/chat/completions", apiKey: openaiApiKey, cleanModel: model };
  }
  if (!xaiApiKey) throw new Error("XAI_API_KEY is not set in Supabase Secrets");
  return { url: "https://api.x.ai/v1/chat/completions", apiKey: xaiApiKey, cleanModel: model };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body
    const { ia_type, input_data, user_id } = await req.json();

    if (!ia_type || !user_id) {
      throw new Error("Missing required fields: ia_type, user_id");
    }

    // 1. Fetch IA Configuration (Prompts and Model)
    const { data: iaConfig, error: configError } = await supabase
      .from('platform_ia_config')
      .select('*')
      .eq('id', ia_type)
      .single();

    if (configError) {
      throw new Error(`IA Config not found for: ${ia_type}`);
    }

    // 2. Fetch user's Cérebro Central context
    const { data: cerebro, error: cerebroError } = await supabase
      .from('platform_cerebro')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    if (cerebroError && cerebroError.code !== 'PGRST116') {
      throw cerebroError;
    }

    // 2b. Fetch clinic_name from platform_users (não fica em platform_cerebro)
    const { data: userProfile } = await supabase
      .from('platform_users')
      .select('clinic_name, specialty')
      .eq('id', user_id)
      .maybeSingle();

    const clinicName = userProfile?.clinic_name || '';

    // 3. Fetch materials if any
    let materialsContext = "";
    if (cerebro?.materiais_adicionados?.length > 0) {
      const { data: mats } = await supabase
        .from('platform_materiais')
        .select('title, content')
        .in('id', cerebro.materiais_adicionados);
      
      if (mats && mats.length > 0) {
        materialsContext = mats.map((m: any) => `--- ${m.title} ---\n${m.content}`).join("\n\n");
      }
    }

    // 4. Build CEREBRO_CONTEXT
    const faqText = cerebro?.faq?.length 
      ? cerebro.faq.map((f: any) => `P: ${f.question}\nR: ${f.answer}`).join("\n") 
      : "Nenhum FAQ cadastrado.";

    const objecoesText = cerebro?.objecoes_banco?.length 
      ? cerebro.objecoes_banco.map((o: any) => `Objeção: ${o.objection}\nResposta: ${o.answer}`).join("\n") 
      : "Nenhuma objeção mapeada.";

    const cerebroContext = `
=== IDENTIDADE DA CLÍNICA ===
Clínica: ${clinicName || cerebro?.clinic_name || ''} | Profissional: ${cerebro?.profissional_nome || ''}
Especialidade: ${cerebro?.specialty_preset || userProfile?.specialty || ''} | Cidade: ${cerebro?.cidade || ''}/${cerebro?.estado || ''}
Propósito: ${cerebro?.proposito_clinica || ''}
O que não aceita/Valores: ${cerebro?.limites_valores || ''}

=== PROCEDIMENTO ÂNCORA ===
Procedimento: ${cerebro?.anchor_procedure || ''}
Por que é o âncora: ${cerebro?.anchor_why || ''}
Resultado que gera: ${cerebro?.anchor_resultado || ''}
Ticket atual: R$${cerebro?.anchor_ticket_atual || ''} | Ticket desejado: R$${cerebro?.anchor_ticket_desejado || ''}

=== PACIENTE IDEAL (ICP) ===
Perfil: ${cerebro?.icp_faixa_etaria || ''}, ${cerebro?.icp_genero || ''}, ${cerebro?.icp_nivel_socioeconomico || ''}
Maior dor: ${cerebro?.icp_maior_dor || ''}
Maior desejo: ${cerebro?.icp_maior_desejo || ''}
Por que escolhe a clínica: ${cerebro?.icp_por_que_voce || ''}
Objeção pré-fechamento: ${cerebro?.icp_objecao_pre_fechamento || ''}

=== POSICIONAMENTO ===
Diferencial exclusivo: ${cerebro?.diferencial_exclusivo || ''}
Tom de voz: ${cerebro?.voice_tone || ''} | ${cerebro?.tom_percebido || ''}
One-liner: ${cerebro?.descricao_one_liner || ''}

=== OPERAÇÃO COMERCIAL ===
Tempo de resposta WhatsApp: ${cerebro?.tempo_resposta_whatsapp || ''}
Maior falha comercial: ${cerebro?.maior_falha_comercial || ''}

=== FAQ ===
${faqText}

=== OBJEÇÕES MAPEADAS ===
${objecoesText}

=== MATERIAIS ADICIONADOS AO CÉREBRO ===
${materialsContext || "Nenhum material adicional."}
`;

    // 5. Replace [CEREBRO_CONTEXT] in system_prompt
    const systemPromptWithContext = iaConfig.system_prompt.replace("[CEREBRO_CONTEXT]", cerebroContext);

    // 6. Format Input Data for the Prompt
    const inputFormatted = typeof input_data === 'string' 
      ? input_data 
      : JSON.stringify(input_data, null, 2);

    // 7. Call LLM (multi-provider routing)
    const targetModel = iaConfig.model || 'grok-4-1-fast-reasoning';
    const { url, apiKey, cleanModel } = resolveLlmEndpoint(targetModel);
    console.log(`[LLM Request] model=${targetModel} → provider_url=${url}`);

    const llmResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: cleanModel,
        messages: [
          { role: 'system', content: systemPromptWithContext },
          { role: 'user', content: inputFormatted }
        ],
        max_tokens: 1500,
        temperature: 0.7
      })
    });

    if (!llmResponse.ok) {
      const err = await llmResponse.text();
      console.error("LLM API Error:", err);
      throw new Error(`Erro na API LLM (${llmResponse.status}): ${err}`);
    }

    const aiData = await llmResponse.json();
    const resultText = aiData.choices[0].message.content;

    // 8. Save to History
    await supabase.from('platform_ia_history').insert({
      user_id: user_id,
      ia_type: ia_type,
      input_data: input_data,
      output_text: resultText
    });

    return new Response(JSON.stringify({ text: resultText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("ia-proxy error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
