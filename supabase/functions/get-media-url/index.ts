import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mediaPath } = await req.json();
    
    if (!mediaPath) {
      return new Response(
        JSON.stringify({ error: 'Caminho não fornecido.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const buckets = ['media-mensagens', 'campaign-media', 'audio-mensagens'];
    let bucketToUse = null;
    let cleanPath = mediaPath.trim();

    // 1. Tenta identificar o bucket pelo prefixo do path (mais eficiente)
    for (const bucket of buckets) {
      if (cleanPath.startsWith(`${bucket}/`)) {
        bucketToUse = bucket;
        cleanPath = cleanPath.substring(bucket.length + 1);
        break;
      }
    }

    // 2. Se não identificou pelo prefixo, tenta encontrar o arquivo (resiliência)
    if (!bucketToUse) {
      // Começa pelo bucket mais provável (mensagens)
      bucketToUse = 'media-mensagens';
    }

    const { data, error: signError } = await supabaseAdmin.storage
      .from(bucketToUse)
      .createSignedUrl(cleanPath, 86400); // 24h

    // 3. Fallback: Se deu erro no bucket padrão, tenta nos outros sem logar erro 400 se possível
    if (signError || !data?.signedUrl) {
      for (const bucket of buckets.filter(b => b !== bucketToUse)) {
        const { data: fallbackData } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(cleanPath, 86400);
        
        if (fallbackData?.signedUrl) {
          return new Response(
            JSON.stringify({ signedUrl: fallbackData.signedUrl }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    if (!data?.signedUrl) {
      return new Response(
        JSON.stringify({ error: 'Arquivo não encontrado em nenhum bucket.' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});