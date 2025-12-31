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
    // O bucket correto usado no upload é 'media-mensagens'
    const bucketName = 'media-mensagens';
    let cleanPath = filePath;
    
    // Remove o nome do bucket se ele vier duplicado no path
    if (cleanPath.startsWith(`${bucketName}/`)) {
      cleanPath = cleanPath.substring(bucketName.length + 1);
    } else if (cleanPath.startsWith('audio-mensagens/')) {
        // Fallback caso algum legado envie com o nome antigo
        cleanPath = cleanPath.substring('audio-mensagens/'.length);
    }
    // --- FIM DA CORREÇÃO ---

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabaseAdmin
      .storage
      .from(bucketName)
      .createSignedUrl(cleanPath, 3600); // Aumentado para 1 hora para evitar expiração rápida

    if (error) {
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