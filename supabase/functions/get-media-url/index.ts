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
    let signedUrl = null;

    // Tenta limpar e buscar em cada bucket
    for (const bucket of buckets) {
      let cleanPath = mediaPath.trim();
      // Remove o nome do bucket se ele vier no início do caminho (ex: "media-mensagens/caminho/arquivo.jpg")
      if (cleanPath.startsWith(`${bucket}/`)) {
        cleanPath = cleanPath.substring(bucket.length + 1);
      }

      const { data } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(cleanPath, 86400); // 24h

      if (data?.signedUrl) {
        signedUrl = data.signedUrl;
        break;
      }
    }

    if (!signedUrl) {
      return new Response(
        JSON.stringify({ error: 'Arquivo não encontrado.' }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});