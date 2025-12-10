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
    // 1. Autenticação do usuário que está pedindo o arquivo
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    // 2. Obtenção do caminho do arquivo do corpo da requisição
    const { mediaPath } = await req.json();
    if (!mediaPath) throw new Error('O caminho da mídia é obrigatório.');

    // 3. Criação da URL segura com a chave de administrador
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // --- CORREÇÃO ---
    // Tenta buscar a mídia em múltiplos buckets, começando pelo mais comum.
    const bucketsToTry = ['media-mensagens', 'campaign-media'];
    let signedUrlData = null;
    let lastError: Error | null = null;

    for (const bucketName of bucketsToTry) {
      let cleanPath = mediaPath.trim();
      
      // Remove o nome do bucket se ele vier duplicado no path
      if (cleanPath.startsWith(`${bucketName}/`)) {
        cleanPath = cleanPath.substring(bucketName.length + 1);
      }

      const { data, error } = await supabaseAdmin
        .storage
        .from(bucketName)
        .createSignedUrl(cleanPath, 3600); // URL válida por 1 hora

      if (!error && data.signedUrl) {
        signedUrlData = data;
        break; // Sucesso, encontrou o arquivo.
      } else {
        lastError = error; // Guarda o erro para o caso de não encontrar em nenhum bucket.
      }
    }

    if (!signedUrlData) {
      // Se não encontrou em nenhum bucket, lança o último erro ocorrido.
      throw lastError || new Error('Arquivo não encontrado em nenhum dos buckets de mídia.');
    }
    // --- FIM DA CORREÇÃO ---

    return new Response(JSON.stringify({ signedUrl: signedUrlData.signedUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Erro na função get-media-url:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});