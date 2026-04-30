import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function generatePassword(length = 12): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, b => chars[b % chars.length]).join('');
}

function respond(body: Record<string, any>, _status = 200) {
  // Sempre retorna 200 — o frontend lê data.error para detectar falhas.
  // Isso evita o "Edge Function returned a non-2xx status code" genérico.
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
    if (!authHeader) return respond({ error: 'Não autorizado' }, 401);

    const callerClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user: caller }, error: callerErr } = await callerClient.auth.getUser();
    if (callerErr || !caller) return respond({ error: 'Token inválido' }, 401);
    console.log(`[step:validate-jwt] OK caller=${caller.id}`);

    // 2. Verificar se caller é superadmin
    step = 'check-superadmin';
    const { data: adminRole, error: adminRoleErr } = await supabaseAdmin
      .from('usuarios_papeis')
      .select('id')
      .eq('usuario_id', caller.id)
      .eq('papel', 'superadmin')
      .maybeSingle();

    if (adminRoleErr) {
      console.error(`[step:check-superadmin] ERROR: ${adminRoleErr.message}`);
      return respond({ error: `Erro ao verificar papel: ${adminRoleErr.message}` }, 500);
    }
    if (!adminRole) return respond({ error: 'Acesso negado: não é superadmin' }, 403);
    console.log(`[step:check-superadmin] OK`);

    // 3. Validar body
    step = 'parse-body';
    const body = await req.json();
    const { email, clinic_name, product_id, trial_ends_at, monthly_fee } = body;
    console.log(`[step:parse-body] email=${email} clinic=${clinic_name} product_id=${product_id}`);

    if (!email || !clinic_name) {
      return respond({ error: 'email e clinic_name são obrigatórios' }, 400);
    }

    // 4. Buscar produto (se fornecido)
    step = 'fetch-product';
    let productName: string | null = null;
    if (product_id) {
      const { data: prod, error: prodErr } = await supabaseAdmin
        .from('platform_products')
        .select('nome')
        .eq('id', product_id)
        .maybeSingle();
      if (prodErr) console.error(`[step:fetch-product] ERROR: ${prodErr.message}`);
      productName = prod?.nome ?? null;
    }
    console.log(`[step:fetch-product] productName=${productName}`);

    // 5. Gerar senha temporária
    const senha_temporaria = generatePassword(12);

    // 6. Criar ou encontrar usuário Auth
    step = 'create-auth-user';
    let isExisting = false;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha_temporaria,
      email_confirm: true,
      user_metadata: { full_name: clinic_name },
    });

    let userIdResolved: string | null = null;

    if (authError) {
      console.log(`[step:create-auth-user] createUser failed: ${authError.message} (status=${authError.status})`);
      const isDup = authError.message?.toLowerCase()?.includes('already') ||
                    authError.message?.toLowerCase()?.includes('exist') ||
                    authError.message?.toLowerCase()?.includes('registered') ||
                    authError.status === 422 ||
                    authError.code === 'email_exists';

      if (isDup) {
        step = 'find-existing-user';
        // Iterar TODAS as páginas de auth.users até achar pelo email
        let page = 1;
        const perPage = 1000;
        while (page <= 10 && !userIdResolved) {
          const { data: authUsers, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
          if (listErr) {
            console.error(`[step:find-existing-user] listUsers page=${page} error: ${listErr.message}`);
            break;
          }
          const found = authUsers?.users?.find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
          if (found) {
            userIdResolved = found.id;
            console.log(`[step:find-existing-user] found via auth listUsers page=${page}: ${userIdResolved}`);
            break;
          }
          if (!authUsers?.users || authUsers.users.length < perPage) break;
          page++;
        }

        // Fallback: tentar via perfis se ainda não achou
        if (!userIdResolved) {
          const { data: perfilExistente } = await supabaseAdmin
            .from('perfis')
            .select('id')
            .eq('email', email.toLowerCase())
            .maybeSingle();
          if (perfilExistente) {
            userIdResolved = perfilExistente.id;
            console.log(`[step:find-existing-user] found via perfis: ${userIdResolved}`);
          }
        }

        if (!userIdResolved) {
          return respond({ error: `Usuário ${email} existe no Auth mas não foi encontrado pelo listUsers. Verifique no painel.` });
        }

        isExisting = true;
        // Atualizar senha do usuário existente
        const { error: updateErr } = await supabaseAdmin.auth.admin.updateUser(userIdResolved, { password: senha_temporaria });
        if (updateErr) {
          console.error(`[step:find-existing-user] updateUser error: ${updateErr.message}`);
          return respond({ error: `Erro ao atualizar senha do usuário existente: ${updateErr.message}` });
        }
        console.log(`[step:find-existing-user] password updated OK`);
      } else {
        return respond({ error: `Erro ao criar usuário Auth: ${authError.message}` });
      }
    } else {
      userIdResolved = authData.user.id;
      console.log(`[step:create-auth-user] NEW user created: ${userIdResolved}`);
    }

    if (!userIdResolved) {
      return respond({ error: 'Falha ao resolver userId após criação/busca de usuário' });
    }
    const userId: string = userIdResolved;

    // 7. Buscar ou criar organization
    step = 'find-or-create-org';
    let orgId: string;
    const { data: existingOrg, error: orgFindErr } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .ilike('name', clinic_name.trim())
      .maybeSingle();

    if (orgFindErr) console.error(`[step:find-or-create-org] find error: ${orgFindErr.message}`);

    if (existingOrg) {
      orgId = existingOrg.id;
      console.log(`[step:find-or-create-org] existing org: ${orgId}`);
    } else {
      const { data: newOrg, error: orgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: clinic_name.trim() })
        .select('id')
        .single();
      if (orgError) {
        console.error(`[step:find-or-create-org] insert error: ${orgError.message}`);
        return respond({ error: `Erro ao criar organização: ${orgError.message}` }, 500);
      }
      orgId = newOrg.id;
      console.log(`[step:find-or-create-org] NEW org: ${orgId}`);
    }

    // 8. Criar/atualizar perfil
    step = 'upsert-perfil';
    const { error: perfilError } = await supabaseAdmin
      .from('perfis')
      .upsert({
        id: userId,
        organization_id: orgId,
        nome_completo: clinic_name,
        email: email.toLowerCase(),
      }, { onConflict: 'id' });
    if (perfilError) {
      console.error(`[step:upsert-perfil] ERROR: ${perfilError.message} code=${perfilError.code} details=${perfilError.details}`);
      return respond({ error: `Erro ao criar perfil: ${perfilError.message}` }, 500);
    }
    console.log(`[step:upsert-perfil] OK`);

    // 9. Dar papel de admin
    step = 'insert-role';
    const { data: existingRole, error: roleFindErr } = await supabaseAdmin
      .from('usuarios_papeis')
      .select('id')
      .eq('usuario_id', userId)
      .eq('papel', 'admin')
      .maybeSingle();

    if (roleFindErr) console.error(`[step:insert-role] find error: ${roleFindErr.message}`);

    if (!existingRole) {
      const { error: roleInsertErr } = await supabaseAdmin
        .from('usuarios_papeis')
        .insert({ usuario_id: userId, papel: 'admin' });
      if (roleInsertErr) {
        console.error(`[step:insert-role] insert ERROR: ${roleInsertErr.message} code=${roleInsertErr.code} details=${roleInsertErr.details}`);
        return respond({ error: `Erro ao inserir papel: ${roleInsertErr.message}` }, 500);
      }
      console.log(`[step:insert-role] inserted admin role`);
    } else {
      console.log(`[step:insert-role] already has admin role`);
    }

    // 10. Criar platform_users
    step = 'upsert-platform-user';
    const { error: puError } = await supabaseAdmin
      .from('platform_users')
      .upsert({
        id: userId,
        plan: productName || 'basic',
        clinic_name,
        crm_user_id: userId,
        onboarding_complete: false,
        cerebro_complete: false,
      }, { onConflict: 'id' });
    if (puError) {
      console.error(`[step:upsert-platform-user] ERROR: ${puError.message} code=${puError.code} details=${puError.details}`);
      return respond({ error: `Erro ao criar platform_users: ${puError.message}` }, 500);
    }
    console.log(`[step:upsert-platform-user] OK`);

    // 11. Criar/atualizar platform_tenants
    step = 'upsert-tenant';
    const { data: existingTenant, error: tenantFindErr } = await supabaseAdmin
      .from('platform_tenants')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle();

    if (tenantFindErr) console.error(`[step:upsert-tenant] find error: ${tenantFindErr.message}`);

    if (existingTenant) {
      const { error: tenantUpdateErr } = await supabaseAdmin
        .from('platform_tenants')
        .update({
          product_id: product_id || null,
          status: 'ativo',
          trial_ends_at: trial_ends_at || null,
          monthly_fee: monthly_fee ?? 0,
        })
        .eq('id', existingTenant.id);
      if (tenantUpdateErr) {
        console.error(`[step:upsert-tenant] update ERROR: ${tenantUpdateErr.message}`);
        return respond({ error: `Erro ao atualizar tenant: ${tenantUpdateErr.message}` }, 500);
      }
      console.log(`[step:upsert-tenant] updated existing tenant`);
    } else {
      const { error: tenantInsertErr } = await supabaseAdmin
        .from('platform_tenants')
        .insert({
          organization_id: orgId,
          product_id: product_id || null,
          status: 'ativo',
          trial_ends_at: trial_ends_at || null,
          monthly_fee: monthly_fee ?? 0,
        });
      if (tenantInsertErr) {
        console.error(`[step:upsert-tenant] insert ERROR: ${tenantInsertErr.message} code=${tenantInsertErr.code}`);
        return respond({ error: `Erro ao criar tenant: ${tenantInsertErr.message}` }, 500);
      }
      console.log(`[step:upsert-tenant] inserted new tenant`);
    }

    console.log(`[create-platform-user] SUCCESS: ${email} → user=${userId} org=${orgId} existing=${isExisting}`);

    return respond({
      ok: true,
      user_id: userId,
      org_id: orgId,
      senha_temporaria,
      product_name: productName,
      is_existing: isExisting,
    });

  } catch (err: any) {
    console.error(`[create-platform-user] UNCAUGHT at step="${step}": ${err.message}\n${err.stack}`);
    return respond({ error: `Erro no passo "${step}": ${err.message}` }, 500);
  }
});
