import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Tratamento de CORS para pre-flight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { mediaPath } = await req.json();
    
    if (!mediaPath) {
      return new Response(
        JSON.stringify({ error: 'Caminho da mídia não fornecido.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Buckets onde as mídias podem estar
    const buckets = ['media-mensagens', 'campaign-media', 'audio-mensagens'];
    let signedUrl = null;
    let lastError = null;

    // Limpa o caminho (remove o nome do bucket se ele vier no início do caminho)
    let cleanPath = mediaPath.trim();
    
    for (const bucket of buckets) {
      let pathForBucket = cleanPath;
      if (pathForBucket.startsWith(`${bucket}/`)) {
        pathForBucket = pathForBucket.substring(bucket.length + 1);
      }

      console.log(`[get-media-url] Tentando bucket: ${bucket}, path: ${pathForBucket}`);

      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(pathForBucket, 86400); // 24 horas

      if (data?.signedUrl) {
        signedUrl = data.signedUrl;
        console.log(`[get-media-url] Sucesso no bucket: ${bucket}`);
        break;
      }
      lastError = error;
    }

    if (!signedUrl) {
      console.error(`[get-media-url] Arquivo não encontrado em nenhum bucket: ${cleanPath}`, lastError);
      return new Response(
        JSON.stringify({ error: 'Arquivo não encontrado no servidor.', details: lastError }), 
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl }), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-media-url] Erro crítico:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});