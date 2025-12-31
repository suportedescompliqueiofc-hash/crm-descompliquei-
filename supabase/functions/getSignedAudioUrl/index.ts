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
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }

    const body = await req.json().catch(() => {
      throw new Error('Invalid JSON body');
    });

    const { filePath } = body;
    if (!filePath) {
      throw new Error('File path is required in the request body');
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- LÓGICA DE MULTI-BUCKET ROBUSTA ---
    // Tenta encontrar o arquivo em diferentes buckets para evitar erros de "arquivo não encontrado"
    const bucketsToTry = ['media-mensagens', 'audio-mensagens', 'campaign-media'];
    let signedUrlData = null;
    let lastError = null;

    for (const bucketName of bucketsToTry) {
      let cleanPath = filePath;
      
      // Remove o nome do bucket se ele vier duplicado no início do path
      if (cleanPath.startsWith(`${bucketName}/`)) {
        cleanPath = cleanPath.substring(bucketName.length + 1);
      } else if (cleanPath.startsWith('audio-mensagens/') && bucketName !== 'audio-mensagens') {
        // Tenta limpar prefixos de legado se existirem
        cleanPath = cleanPath.substring('audio-mensagens/'.length);
      }

      // Tenta gerar a URL assinada neste bucket
      const { data, error } = await supabaseAdmin
        .storage
        .from(bucketName)
        .createSignedUrl(cleanPath, 60 * 60 * 24); // Validade de 24 horas

      if (!error && data?.signedUrl) {
        signedUrlData = data;
        break; // Sucesso! Encontrou o arquivo.
      } else {
        lastError = error; // Guarda o erro para log se falhar em todos
      }
    }

    if (!signedUrlData) {
      console.error(`Falha ao encontrar áudio. Path: ${filePath}. Último erro:`, lastError);
      throw new Error('Arquivo de áudio não encontrado nos buckets de mídia.');
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in getSignedAudioUrl function:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Retorna 400 para erros de lógica, mas com mensagem JSON clara
      }
    );
  }
});