import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Validate Auth Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 2. Validate User Token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      console.error('Auth failed:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 3. Parse Request Body
    const { filePath } = await req.json();
    if (!filePath) {
      return new Response(
        JSON.stringify({ error: 'filePath is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 4. Create Admin Client for Storage Access
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 5. Try to find the file in multiple buckets (Legacy support + New structure)
    const bucketsToTry = ['media-mensagens', 'audio-mensagens', 'campaign-media'];
    let signedUrlData = null;
    let lastError = null;

    for (const bucketName of bucketsToTry) {
      let cleanPath = filePath;
      
      // Remove bucket name from path if present to avoid duplication
      if (cleanPath.startsWith(`${bucketName}/`)) {
        cleanPath = cleanPath.substring(bucketName.length + 1);
      } else if (cleanPath.startsWith('audio-mensagens/') && bucketName !== 'audio-mensagens') {
        // Handle legacy paths
        cleanPath = cleanPath.substring('audio-mensagens/'.length);
      }

      const { data, error } = await supabaseAdmin
        .storage
        .from(bucketName)
        .createSignedUrl(cleanPath, 60 * 60 * 24); // 24 hours validity

      if (!error && data?.signedUrl) {
        signedUrlData = data;
        break; // Found it!
      } else {
        lastError = error;
      }
    }

    if (!signedUrlData) {
      console.error(`File not found: ${filePath}`, lastError);
      return new Response(
        JSON.stringify({ error: 'Audio file not found', details: lastError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});