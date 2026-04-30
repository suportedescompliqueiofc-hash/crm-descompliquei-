import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROMPT_BASE_KEY = "prompt_base_agente";
const PROMPT_BASE_DEFAULT_KEY = "prompt_base_agente_default";
const PROMPT_BASE_DEFAULT_DESCRIPTION = "Prompt base global da IA de pre-atendimento. Vale para todos os clientes.";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthenticatedSuperAdmin(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw new Error("Usuário não autenticado.");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    throw new Error("Usuário não autenticado.");
  }

  const { data: roleRow, error: roleError } = await supabaseAdmin
    .from("usuarios_papeis")
    .select("papel")
    .eq("usuario_id", user.id)
    .maybeSingle();

  if (roleError) {
    throw new Error("Falha ao verificar permissões.");
  }

  if (roleRow?.papel !== "superadmin") {
    throw new Error("Apenas super administradores podem gerenciar a IA global.");
  }

  return { supabaseAdmin };
}

async function readConfigValue(supabaseAdmin: ReturnType<typeof createClient>, chave: string) {
  const { data, error } = await supabaseAdmin
    .from("system_ai_config")
    .select("chave, valor, descricao, atualizado_em")
    .eq("chave", chave)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { supabaseAdmin } = await getAuthenticatedSuperAdmin(req);
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "get";

    if (action === "get") {
      const [current, defaultPrompt] = await Promise.all([
        readConfigValue(supabaseAdmin, PROMPT_BASE_KEY),
        readConfigValue(supabaseAdmin, PROMPT_BASE_DEFAULT_KEY),
      ]);

      return jsonResponse({
        ok: true,
        config: {
          prompt_base_agente: current?.valor ?? "",
          prompt_base_agente_default: defaultPrompt?.valor ?? "",
          descricao: current?.descricao ?? PROMPT_BASE_DEFAULT_DESCRIPTION,
          atualizado_em: current?.atualizado_em ?? null,
        },
      });
    }

    if (action === "save") {
      const novoValor = typeof body?.valor === "string" ? body.valor.trim() : "";
      const seedDefault = body?.seedDefault === true;
      if (!novoValor) {
        return jsonResponse({ ok: false, error: "O prompt base não pode ficar vazio." }, 400);
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("system_ai_config")
        .select("descricao")
        .eq("chave", PROMPT_BASE_KEY)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        const { error: updateError } = await supabaseAdmin
          .from("system_ai_config")
          .update({ valor: novoValor })
          .eq("chave", PROMPT_BASE_KEY);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("system_ai_config")
          .insert({
            chave: PROMPT_BASE_KEY,
            valor: novoValor,
            descricao: PROMPT_BASE_DEFAULT_DESCRIPTION,
          });

        if (insertError) {
          throw insertError;
        }
      }

      if (seedDefault) {
        const { data: defaultExisting, error: defaultExistingError } = await supabaseAdmin
          .from("system_ai_config")
          .select("chave")
          .eq("chave", PROMPT_BASE_DEFAULT_KEY)
          .maybeSingle();

        if (defaultExistingError) {
          throw defaultExistingError;
        }

        if (!defaultExisting) {
          const { error: defaultInsertError } = await supabaseAdmin
            .from("system_ai_config")
            .insert({
              chave: PROMPT_BASE_DEFAULT_KEY,
              valor: novoValor,
              descricao: PROMPT_BASE_DEFAULT_DESCRIPTION,
            });

          if (defaultInsertError) {
            throw defaultInsertError;
          }
        }
      }

      const updated = await readConfigValue(supabaseAdmin, PROMPT_BASE_KEY);

      return jsonResponse({
        ok: true,
        config: {
          prompt_base_agente: updated?.valor ?? novoValor,
          atualizado_em: updated?.atualizado_em ?? new Date().toISOString(),
        },
      });
    }

    if (action === "reset") {
      const defaultPrompt = await readConfigValue(supabaseAdmin, PROMPT_BASE_DEFAULT_KEY);

      if (!defaultPrompt?.valor?.trim()) {
        return jsonResponse(
          { ok: false, error: "Prompt padrão não encontrado no banco." },
          500,
        );
      }

      const { data: existing, error: existingError } = await supabaseAdmin
        .from("system_ai_config")
        .select("descricao")
        .eq("chave", PROMPT_BASE_KEY)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        const { error: updateError } = await supabaseAdmin
          .from("system_ai_config")
          .update({ valor: defaultPrompt.valor })
          .eq("chave", PROMPT_BASE_KEY);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabaseAdmin
          .from("system_ai_config")
          .insert({
            chave: PROMPT_BASE_KEY,
            valor: defaultPrompt.valor,
            descricao: defaultPrompt.descricao ?? PROMPT_BASE_DEFAULT_DESCRIPTION,
          });

        if (insertError) {
          throw insertError;
        }
      }

      const updated = await readConfigValue(supabaseAdmin, PROMPT_BASE_KEY);

      return jsonResponse({
        ok: true,
        config: {
          prompt_base_agente: updated?.valor ?? defaultPrompt.valor,
          atualizado_em: updated?.atualizado_em ?? new Date().toISOString(),
        },
      });
    }

    return jsonResponse({ ok: false, error: "Ação inválida." }, 400);
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Erro interno inesperado.",
      },
      error instanceof Error && error.message.includes("autenticado") ? 401 : 400,
    );
  }
});
