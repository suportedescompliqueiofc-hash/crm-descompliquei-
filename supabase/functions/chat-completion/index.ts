import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const { messages, model } = await req.json();

    if (!messages || !model) {
      throw new Error("Missing required fields: messages, model");
    }

    const { url, apiKey, cleanModel } = resolveLlmEndpoint(model);
    console.log(`[chat-completion] model=${model} → ${url}`);

    const llmResponse = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cleanModel,
        messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!llmResponse.ok) {
      const err = await llmResponse.text();
      console.error("LLM API Error:", err);
      throw new Error(`Erro na API LLM (${llmResponse.status}): ${err}`);
    }

    const data = await llmResponse.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error: any) {
    console.error("chat-completion error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
