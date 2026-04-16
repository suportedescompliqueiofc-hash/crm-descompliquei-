import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Client } from 'https://deno.land/x/postgres@v0.17.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKETS = ['media-mensagens', 'audio-mensagens', 'campaign-media', 'avatars'];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const dbUrl       = Deno.env.get('SUPABASE_DB_URL') ?? '';

    const supabaseAdmin = createClient(supabaseUrl, serviceKey);
    const results: Record<string, unknown> = {};

    // 1. Garantir buckets existem como públicos
    for (const id of BUCKETS) {
      const { error } = await supabaseAdmin.storage.createBucket(id, { public: true });
      results[id] = error?.message?.toLowerCase().includes('already') ? 'já existia' : (error?.message ?? 'criado ✅');
    }

    // 2. Inspecionar políticas atuais e recriar via Postgres direto
    if (!dbUrl) {
      return new Response(JSON.stringify({ ...results, error: 'SUPABASE_DB_URL não disponível' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const pg = new Client(dbUrl);
    await pg.connect();
    let existingPolicies: unknown[] = [];
    let policyOp = '';

    try {
      // Listar políticas existentes em storage.objects
      const { rows } = await pg.queryObject<{ policyname: string; cmd: string }>(
        `SELECT policyname, cmd FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects'`
      );
      existingPolicies = rows;

      // Remover TODAS as políticas existentes e recriar clean
      for (const row of rows) {
        await pg.queryObject(`DROP POLICY IF EXISTS "${row.policyname}" ON storage.objects`);
      }

      // Recriar políticas corretas
      await pg.queryObject(`
        CREATE POLICY "storage_select_public"
          ON storage.objects FOR SELECT
          USING (bucket_id IN (${BUCKETS.map(b => `'${b}'`).join(',')}));

        CREATE POLICY "storage_insert_authenticated"
          ON storage.objects FOR INSERT
          TO authenticated
          WITH CHECK (bucket_id IN (${BUCKETS.map(b => `'${b}'`).join(',')}));

        CREATE POLICY "storage_update_authenticated"
          ON storage.objects FOR UPDATE
          TO authenticated
          USING (bucket_id IN (${BUCKETS.map(b => `'${b}'`).join(',')}));

        CREATE POLICY "storage_delete_authenticated"
          ON storage.objects FOR DELETE
          TO authenticated
          USING (bucket_id IN (${BUCKETS.map(b => `'${b}'`).join(',')}));
      `);

      policyOp = `removidas ${rows.length} antiga(s), 4 novas criadas ✅`;
    } finally {
      await pg.end();
    }

    return new Response(JSON.stringify({
      success: true,
      buckets: results,
      policies_antigas: existingPolicies,
      policies: policyOp,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
