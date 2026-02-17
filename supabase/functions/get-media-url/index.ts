import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { mediaPath } = await req.json();
    if (!mediaPath) return new Response(JSON.stringify({ error: 'mediaPath required' }), { status: 400, headers: corsHeaders });

    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    const bucketsToTry = ['media-mensagens', 'campaign-media', 'audio-mensagens'];
    
    let signedUrl = null;
    let lastError = null;

    for (const bucket of bucketsToTry) {
      let cleanPath = mediaPath.trim();
      if (cleanPath.startsWith(`${bucket}/`)) {
        cleanPath = cleanPath.substring(bucket.length + 1);
      }

      const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(cleanPath, 86400);
      if (data?.signedUrl) {
        signedUrl = data.signedUrl;
        break;
      }
      lastError = error;
    }

    if (!signedUrl) {
        return new Response(JSON.stringify({ error: 'File not found', details: lastError }), { status: 404, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ signedUrl }), { status: 200, headers: corsHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});