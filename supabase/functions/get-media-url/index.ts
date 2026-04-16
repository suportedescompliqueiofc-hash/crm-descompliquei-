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
    const { mediaPath, mediaType } = await req.json();
    
    if (!mediaPath) {
      return new Response(
        JSON.stringify({ error: 'Caminho não fornecido.' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Se o path já é um URL externo, retorna direto
    if (mediaPath.startsWith('http://') || mediaPath.startsWith('https://')) {
      return new Response(
        JSON.stringify({ signedUrl: mediaPath }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Mapeamento inteligente de bucket
    let bucketToUse = 'media-mensagens';
    if (mediaType === 'audio') bucketToUse = 'audio-mensagens';
    
    // Tenta primeiro no bucket mapeado
    console.log(`[get-media-url] Buscando path: "${mediaPath.trim()}" no bucket: "${bucketToUse}"`);
    const { data: dataPrimary, error: signErrorPrimary } = await supabaseAdmin.storage
      .from(bucketToUse)
      .createSignedUrl(mediaPath.trim(), 86400); // 24h

    if (dataPrimary?.signedUrl) {
        return new Response(
            JSON.stringify({ signedUrl: dataPrimary.signedUrl }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Se não encontrou, Fallback para todos os buckets
    console.log(`[get-media-url] Não encontrado em ${bucketToUse}, tentando outros buckets...`);
    const buckets = ['media-mensagens', 'campaign-media', 'audio-mensagens', 'organization-logos'];
    for (const bucket of buckets) {
        const { data: fallbackData } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(mediaPath.trim(), 86400);
        
        if (fallbackData?.signedUrl) {
          console.log(`[get-media-url] Encontrado no bucket fallback: ${bucket}`);
          return new Response(
            JSON.stringify({ signedUrl: fallbackData.signedUrl }), 
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
    }

    return new Response(
      JSON.stringify({ error: 'Arquivo não encontrado em nenhum bucket.' }), 
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});