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

    // --- CORREÇÃO ---
    // Limpa o caminho do arquivo para garantir que não inclua o nome do bucket
    const bucketName = 'audio-mensagens';
    let cleanPath = filePath;
    if (cleanPath.startsWith(`${bucketName}/`)) {
      cleanPath = cleanPath.substring(bucketName.length + 1);
    }
    // --- FIM DA CORREÇÃO ---

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin
      .storage
      .from(bucketName)
      .createSignedUrl(cleanPath, 300); // URL válida por 5 minutos

    if (error) {
      // Lança o erro do storage para ser capturado pelo bloco catch
      throw error;
    }

    return new Response(
      JSON.stringify({ signedUrl: data.signedUrl }),
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
        status: 400,
      }
    );
  }
});