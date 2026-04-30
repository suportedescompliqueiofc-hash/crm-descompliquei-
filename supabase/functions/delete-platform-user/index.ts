import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function respond(body: Record<string, any>) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  let step = 'init';

  try {
    // 1. Validar JWT do caller
    step = 'validate-jwt';
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return respond({ error: 'Não autorizado' });

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return respond({ error: 'Token inválido' });

    // 2. Verificar se caller é superadmin
    step = 'check-superadmin';
    const { data: adminRole } = await supabaseAdmin
      .from('usuarios_papeis')
      .select('id')
      .eq('usuario_id', caller.id)
      .eq('papel', 'superadmin')
      .maybeSingle();
    if (!adminRole) return respond({ error: 'Acesso negado: não é superadmin' });

    // 3. Validar body
    step = 'parse-body';
    const body = await req.json();
    const { organization_id } = body;
    if (!organization_id) return respond({ error: 'organization_id é obrigatório' });

    // Trava de segurança: não permitir deletar a org master
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('id', organization_id)
      .maybeSingle();
    if (!org) return respond({ error: 'Organização não encontrada' });
    if (org.name?.toLowerCase().includes('super admin') || org.name?.toLowerCase().includes('master')) {
      return respond({ error: 'Não é permitido deletar a organização master' });
    }

    // 4. Coletar todos os perfis (usuários) da organização
    step = 'collect-users';
    const { data: perfis } = await supabaseAdmin
      .from('perfis')
      .select('id')
      .eq('organization_id', organization_id);
    const userIds = (perfis ?? []).map((p: any) => p.id);
    console.log(`[delete-platform-user] org=${organization_id} users=${userIds.length}`);

    // 5. Excluir tenant
    step = 'delete-tenant';
    const { error: tenantErr } = await supabaseAdmin
      .from('platform_tenants')
      .delete()
      .eq('organization_id', organization_id);
    if (tenantErr) console.error(`[step:delete-tenant] ${tenantErr.message}`);

    // 6. Excluir platform_users de todos os perfis da org
    if (userIds.length > 0) {
      step = 'delete-platform-users';
      const { error: puErr } = await supabaseAdmin
        .from('platform_users')
        .delete()
        .in('id', userIds);
      if (puErr) console.error(`[step:delete-platform-users] ${puErr.message}`);

      // 7. Excluir papeis
      step = 'delete-roles';
      const { error: roleErr } = await supabaseAdmin
        .from('usuarios_papeis')
        .delete()
        .in('usuario_id', userIds);
      if (roleErr) console.error(`[step:delete-roles] ${roleErr.message}`);

      // 8. Excluir perfis
      step = 'delete-perfis';
      const { error: perfilErr } = await supabaseAdmin
        .from('perfis')
        .delete()
        .in('id', userIds);
      if (perfilErr) console.error(`[step:delete-perfis] ${perfilErr.message}`);

      // 9. Excluir auth.users (cascade)
      step = 'delete-auth-users';
      const errors: string[] = [];
      for (const uid of userIds) {
        const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(uid);
        if (authErr) {
          console.error(`[step:delete-auth-users] ${uid}: ${authErr.message}`);
          errors.push(`${uid}: ${authErr.message}`);
        }
      }
      if (errors.length > 0) {
        console.warn(`[delete-platform-user] alguns auth.users falharam: ${errors.join('; ')}`);
      }
    }

    // 10. Excluir a organização
    step = 'delete-org';
    const { error: orgDelErr } = await supabaseAdmin
      .from('organizations')
      .delete()
      .eq('id', organization_id);
    if (orgDelErr) {
      console.error(`[step:delete-org] ${orgDelErr.message}`);
      return respond({ error: `Erro ao deletar organização: ${orgDelErr.message}` });
    }

    console.log(`[delete-platform-user] SUCCESS: org=${organization_id} users_deleted=${userIds.length}`);
    return respond({ ok: true, deleted_users: userIds.length });

  } catch (err: any) {
    console.error(`[delete-platform-user] UNCAUGHT at step="${step}": ${err.message}`);
    return respond({ error: `Erro no passo "${step}": ${err.message}` });
  }
});
