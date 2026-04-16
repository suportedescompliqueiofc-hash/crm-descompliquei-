# ⚡ Edge Functions Completas — CRM VR Concept

> **Total: 11 Edge Functions**
> Para cada uma, crie no painel: **Edge Functions → New Function → Nome indicado**
> Todas devem ter `verify_jwt: false` para funcionar com webhooks.

---

## 📋 Lista de Edge Functions

| # | Nome | Descrição |
|---|---|---|
| 1 | `create-user` | Cria novos usuários (admin only) |
| 2 | `delete-message` | Exclui mensagem + dispara webhook n8n |
| 3 | `get-media-url` | Gera URL assinada para mídia |
| 4 | `getSignedAudioUrl` | Gera URL assinada para áudio |
| 5 | `internal-ai-agent` | Chat IA interno (Grok/xAI) |
| 6 | `process-cadences` | Processador de cadências automáticas |
| 7 | `receive-message` | Recebe mensagens do WhatsApp (webhook) |
| 8 | `seed-stages` | Popula etapas padrão do pipeline |
| 9 | `seed-templates` | Popula templates de mensagem padrão |
| 10 | `toggle-ai-status` | Liga/desliga/pausa IA por lead |
| 11 | `trigger-campaign` | Dispara campanha de mensagens |

---

## 🔑 Variáveis de Ambiente (Secrets)

Configure em **Settings → Edge Functions → Secrets**:

| Variável | Usada por | Descrição |
|---|---|---|
| `SUPABASE_URL` | Todas | Auto-configurada pelo Supabase |
| `SUPABASE_ANON_KEY` | Todas | Auto-configurada pelo Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Todas | Auto-configurada pelo Supabase |
| `XAI_API_KEY` | internal-ai-agent | Chave da API xAI (Grok) |

---

## 1. `create-user`

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { data: requesterRole } = await supabaseAdmin
      .from('usuarios_papeis')
      .select('papel')
      .eq('usuario_id', user.id)
      .single()

    if (requesterRole?.papel !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem criar usuários.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    let { data: adminProfile } = await supabaseAdmin
      .from('perfis')
      .select('organization_id, nome_completo')
      .eq('id', user.id)
      .single()

    let organizationId = adminProfile?.organization_id

    if (!organizationId) {
      console.log(`Admin ${user.id} sem organização. Iniciando auto-correção...`)
      const orgName = (adminProfile?.nome_completo || 'Minha') + ' Clínica'
      const { data: newOrg, error: createOrgError } = await supabaseAdmin
        .from('organizations')
        .insert({ name: orgName })
        .select('id')
        .single()

      if (createOrgError) {
        throw new Error(`Falha ao criar organização para o admin: ${createOrgError.message}`)
      }

      const { error: updateProfileError } = await supabaseAdmin
        .from('perfis')
        .update({ organization_id: newOrg.id })
        .eq('id', user.id)

      if (updateProfileError) {
        throw new Error(`Falha ao vincular admin à nova organização: ${updateProfileError.message}`)
      }

      organizationId = newOrg.id
      console.log(`Auto-correção concluída. Nova Org ID: ${organizationId}`)
    }

    const { email, password, fullName, role } = await req.json()
    
    if (!email || !password || !fullName || !role) {
      return new Response(
        JSON.stringify({ error: 'Preencha todos os campos obrigatórios.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { 
        full_name: fullName,
        organization_id: organizationId, 
        role: role
      }
    })

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    return new Response(
      JSON.stringify(newUser),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error("Erro crítico na função create-user:", error)
    return new Response(
      JSON.stringify({ error: `Erro interno: ${error.message}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

---

## 2. `delete-message`

> ⚠️ **ATUALIZAR:** a URL do webhook n8n (`N8N_WEBHOOK_URL`) deve apontar para o webhook do seu NOVO ambiente n8n.

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ⚠️ SUBSTITUIR pela URL do webhook do SEU n8n
const N8N_WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/excluir-mensagem-moncao';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { messageId, leadId, id_mensagem } = await req.json()

    if (!messageId) {
      throw new Error('ID da mensagem (interno) é obrigatório')
    }

    console.log(`[delete-message] Disparando webhook para: ${N8N_WEBHOOK_URL}`);
    
    const payload = { 
      id_mensagem: id_mensagem || null,
      lead_id: leadId,
      internal_message_id: messageId,
      timestamp: new Date().toISOString()
    };

    const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    let webhookResult = "Webhook enviado";
    
    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`[ERRO N8N] Status: ${webhookResponse.status}. Body: ${errorText}`);
      webhookResult = `Erro N8N: ${webhookResponse.status} - ${errorText}`;
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error: dbError } = await supabaseAdmin
      .from('mensagens')
      .delete()
      .eq('id', messageId)

    if (dbError) {
      throw new Error(`Erro ao excluir do banco: ${dbError.message}`)
    }

    return new Response(
      JSON.stringify({ success: true, webhook_log: webhookResult }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )

  } catch (error) {
    console.error('[delete-message] Erro fatal:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

---

## 3. `get-media-url`

```typescript
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
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    const { mediaPath } = await req.json();
    if (!mediaPath) {
      return new Response(
        JSON.stringify({ error: 'mediaPath is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const bucketsToTry = ['media-mensagens', 'campaign-media'];
    let signedUrlData = null;
    let lastError = null;

    for (const bucketName of bucketsToTry) {
      let cleanPath = mediaPath.trim();
      if (cleanPath.startsWith(`${bucketName}/`)) {
        cleanPath = cleanPath.substring(bucketName.length + 1);
      }

      const { data, error } = await supabaseAdmin
        .storage
        .from(bucketName)
        .createSignedUrl(cleanPath, 60 * 60 * 24);

      if (!error && data?.signedUrl) {
        signedUrlData = data;
        break;
      } else {
        lastError = error;
      }
    }

    if (!signedUrlData) {
      return new Response(
        JSON.stringify({ error: 'Media file not found in any bucket' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## 4. `getSignedAudioUrl`

```typescript
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
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: corsHeaders });
    }

    const { filePath } = await req.json();
    if (!filePath) {
      return new Response(JSON.stringify({ error: 'filePath is required' }), { status: 400, headers: corsHeaders });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const bucketsToTry = ['media-mensagens', 'audio-mensagens', 'campaign-media'];
    let signedUrlData = null;
    let lastError = null;

    let baseCleanPath = decodeURIComponent(filePath).trim().replace(/^\/+/, '');

    for (const bucketName of bucketsToTry) {
      let pathsToTry = [baseCleanPath];
      if (baseCleanPath.startsWith(`${bucketName}/`)) {
        pathsToTry.push(baseCleanPath.substring(bucketName.length + 1));
      }

      for (const path of pathsToTry) {
        const finalPath = path.replace(/^\/+/, '');
        const { data, error } = await supabaseAdmin
          .storage
          .from(bucketName)
          .createSignedUrl(finalPath, 60 * 60 * 24);

        if (!error && data?.signedUrl) {
          signedUrlData = data;
          break; 
        } else {
          lastError = error;
        }
      }

      if (signedUrlData) break;
    }

    if (!signedUrlData) {
      return new Response(
        JSON.stringify({ error: 'Audio file not found in any bucket', details: lastError }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
```

---

## 5. `internal-ai-agent`

> ⚠️ **REQUER:** variável de ambiente `XAI_API_KEY` (chave da API xAI/Grok)

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import OpenAI from 'https://esm.sh/openai@4.28.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { lead_id, message } = await req.json();
    if (!lead_id || !message) throw new Error('lead_id e message são obrigatórios');

    const authHeader = req.headers.get('Authorization');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não autenticado');

    const { data: profile } = await supabaseClient.from('perfis').select('organization_id').eq('id', user.id).single();
    const orgId = profile?.organization_id;

    const { data: lead } = await supabaseClient.from('leads').select('*').eq('id', lead_id).single();
    if (!lead) throw new Error('Lead não encontrado');

    const { data: history } = await supabaseClient
      .from('internal_ai_chat_messages')
      .select('role, content')
      .eq('lead_id', lead_id)
      .order('criado_em', { ascending: false })
      .limit(10);

    const formattedHistory = (history || []).reverse().map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    await supabaseClient.from('internal_ai_chat_messages').insert({
      lead_id,
      usuario_id: user.id,
      organization_id: orgId,
      role: 'user',
      content: message
    });

    const xaiApiKey = Deno.env.get('XAI_API_KEY');
    if (!xaiApiKey) throw new Error('XAI_API_KEY não configurada no servidor.');

    const openai = new OpenAI({
      apiKey: xaiApiKey,
      baseURL: 'https://api.x.ai/v1',
    });

    const systemPrompt = `Você é um Agente IA interno do CRM da Monção Odontologia & Estética.
Sua função primária é ler o resumo do atendimento de um cliente e criar uma cadência de follow-up (recuperação) altamente persuasiva, inteligente e humanizada.

DADOS DO CLIENTE ATUAL:
Nome: ${lead.nome || 'Não informado'}
Procedimento de Interesse: ${lead.procedimento_interesse || 'Não especificado'}
Resumo do Atendimento:
"${lead.resumo || 'Nenhum resumo disponível.'}"

REGRAS PARA CRIAÇÃO DE CADÊNCIA:
1. Sempre que o usuário pedir para gerar a cadência, proponha exatamente 5 passos de contato.
2. Defina os intervalos de tempo de forma inteligente.
3. Use gatilhos mentais adequados para estética.
4. Inclua no final da resposta um bloco JSON dentro de \`\`\`json ... \`\`\` para salvar no sistema.
5. Opções para "unidade_tempo": "minutos", "horas" ou "dias".
6. Opções para "tipo_mensagem": "texto", "audio", "imagem", "video" ou "pdf".

EXEMPLO DE FORMATO JSON:
\`\`\`json
{
  "nome_cadencia": "Recuperação: ${lead.nome || 'Cliente'}",
  "descricao": "Tentativa de retomada focada no interesse em ${lead.procedimento_interesse || 'procedimento'}",
  "passos": [
    { "posicao_ordem": 1, "tempo_espera": 30, "unidade_tempo": "minutos", "tipo_mensagem": "texto", "conteudo": "Oi {{nome_lead}}, tudo bem?..." },
    { "posicao_ordem": 2, "tempo_espera": 1, "unidade_tempo": "dias", "tipo_mensagem": "texto", "conteudo": "{{nome_lead}}, consegui uma condição especial..." }
  ]
}
\`\`\`

Sempre seja prestativo e pergunte se pode ativar a cadência.`;

    const messagesPayload = [
      { role: 'system', content: systemPrompt },
      ...formattedHistory,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: 'grok-4-1-fast-reasoning',
      messages: messagesPayload,
    });

    const aiMessageContent = completion.choices[0].message.content || '';

    const jsonRegex = /```json\n([\s\S]*?)\n```/;
    const match = aiMessageContent.match(jsonRegex);
    
    let generatedCadenciaId = null;
    let cleanResponse = aiMessageContent;

    if (match && match[1]) {
      try {
        const cadenceData = JSON.parse(match[1]);
        cleanResponse = aiMessageContent.replace(match[0], '').trim();

        const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
        
        const { data: newCadence, error: cadError } = await supabaseAdmin
          .from('cadencias')
          .insert({
            organization_id: orgId,
            nome: cadenceData.nome_cadencia,
            descricao: cadenceData.descricao
          })
          .select('id')
          .single();

        if (cadError) throw cadError;
        generatedCadenciaId = newCadence.id;

        const passosParaInserir = cadenceData.passos.map((p: any) => ({
          cadencia_id: generatedCadenciaId,
          posicao_ordem: p.posicao_ordem,
          tempo_espera: p.tempo_espera,
          unidade_tempo: p.unidade_tempo,
          tipo_mensagem: p.tipo_mensagem,
          conteudo: p.conteudo
        }));

        await supabaseAdmin.from('cadencia_passos').insert(passosParaInserir);

      } catch (parseError) {
        console.error("Erro ao parsear JSON da cadência:", parseError);
      }
    }

    const { data: insertedAiMsg } = await supabaseClient.from('internal_ai_chat_messages').insert({
      lead_id,
      usuario_id: user.id,
      organization_id: orgId,
      role: 'assistant',
      content: cleanResponse,
      cadencia_gerada_id: generatedCadenciaId
    }).select('*, cadencias(nome)').single();

    return new Response(JSON.stringify({ 
      success: true, 
      message: insertedAiMsg 
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
```

---

## 6. `process-cadences`

> ⚠️ **ATUALIZAR:** a URL do webhook (`WEBHOOK_URL`) deve apontar para seu NOVO ambiente.

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts'; 
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'; 
import { addMinutes, addHours, addDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = { 
  'Access-Control-Allow-Origin': '*', 
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 
};

// ⚠️ SUBSTITUIR pela URL do webhook do SEU n8n
const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/mensagens-crm-moncao';

serve(async (req) => { 
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseAdmin = createClient( 
    Deno.env.get('SUPABASE_URL') ?? '', 
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' 
  );

  try { 
    const nowIso = new Date().toISOString();

    const { data: leadsInCadence, error: fetchError } = await supabaseAdmin
      .from('lead_cadencias')
      .select(`id, lead_id, cadencia_id, passo_atual_ordem, organization_id`)
      .eq('status', 'ativo')
      .lte('proxima_execucao', nowIso);

    if (fetchError) throw fetchError;
    
    if (!leadsInCadence || leadsInCadence.length === 0) {
      return new Response(JSON.stringify({ success: true, count: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    for (const item of leadsInCadence) {
      try {
        const { data: lead } = await supabaseAdmin.from('leads').select('id, nome, telefone, usuario_id').eq('id', item.lead_id).single();
        const { data: cadence } = await supabaseAdmin.from('cadencias').select('id, nome').eq('id', item.cadencia_id).single();
        const { data: steps } = await supabaseAdmin.from('cadencia_passos').select('*').eq('cadencia_id', item.cadencia_id).order('posicao_ordem', { ascending: true });

        if (!lead || !cadence || !steps) throw new Error("Dados incompletos.");

        const nextStepOrder = (item.passo_atual_ordem || 0) + 1;
        const currentStep = steps.find(s => s.posicao_ordem === nextStepOrder);

        if (!currentStep) {
          await supabaseAdmin.from('lead_cadencias').update({ status: 'concluido', proxima_execucao: null }).eq('id', item.id);
          continue;
        }

        const messageBody = (currentStep.conteudo || '').replace(/\{\{nome_lead\}\}/g, lead.nome || 'Cliente');

        const { data: insertedMsg, error: insertError } = await supabaseAdmin
          .from('mensagens')
          .insert({
            lead_id: lead.id,
            user_id: lead.usuario_id,
            conteudo: messageBody,
            direcao: 'saida',
            remetente: 'bot',
            tipo_conteudo: currentStep.tipo_mensagem,
            media_path: currentStep.arquivo_path
          })
          .select()
          .single();

        if (insertError) throw insertError;

        if (currentStep.arquivo_path) {
          await supabaseAdmin.from('message_attachments').insert({
            message_id: insertedMsg.id,
            file_path: currentStep.arquivo_path,
            file_type: currentStep.tipo_mensagem === 'pdf' ? 'pdf' : currentStep.tipo_mensagem as any
          });
        }

        let url_midia = null;
        if (currentStep.arquivo_path) {
          const { data, error: signError } = await supabaseAdmin.storage
            .from('media-mensagens')
            .createSignedUrl(currentStep.arquivo_path, 86400);
          if (!signError) url_midia = data.signedUrl;
        }

        const payload = {
          lead_id: lead.id,
          mensagem: messageBody,
          url_midia: url_midia,
          tipo: currentStep.tipo_mensagem,
          titulo_pdf: currentStep.tipo_mensagem === 'pdf' ? (cadence.nome || 'Documento') : null,
          telefone: lead.telefone,
          user_id: lead.usuario_id,
          remetente: 'bot',
          internal_msg_id: insertedMsg.id
        };

        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Erro Webhook status ${response.status}`);

        const followingStep = steps.find(s => s.posicao_ordem === (nextStepOrder + 1));
        const now = new Date();
        let nextDate = null;
        let finalStatus = 'ativo';

        if (followingStep) {
          nextDate = new Date();
          const tempo = followingStep.tempo_espera || 1;
          if (followingStep.unidade_tempo === 'minutos') nextDate = addMinutes(now, tempo);
          else if (followingStep.unidade_tempo === 'horas') nextDate = addHours(now, tempo);
          else nextDate = addDays(now, tempo);
          nextDate = nextDate.toISOString();
        } else {
          finalStatus = 'concluido';
        }

        await supabaseAdmin
          .from('lead_cadencias')
          .update({
            passo_atual_ordem: nextStepOrder,
            proxima_execucao: nextDate,
            status: finalStatus,
            ultima_execucao: now.toISOString(),
            status_ultima_execucao: 'sucesso',
            erro_log: null
          })
          .eq('id', item.id);

        await supabaseAdmin.from('cadencia_logs').insert({
          organization_id: item.organization_id,
          lead_id: lead.id,
          cadencia_id: item.cadencia_id,
          passo_ordem: nextStepOrder,
          status: 'sucesso'
        });

      } catch (err) {
        await supabaseAdmin.from('lead_cadencias').update({
            ultima_execucao: new Date().toISOString(),
            status_ultima_execucao: 'erro',
            erro_log: err.message
          }).eq('id', item.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) { 
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }); 
  } 
});
```

---

## 7. `receive-message`

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Buffer } from 'https://deno.land/std@0.140.0/node/buffer.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const cleanPhoneNumber = (phone: string): string => {
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 11 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  } else if (cleaned.length === 10 && !cleaned.startsWith('55')) {
    cleaned = '55' + cleaned;
  }
  return cleaned;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    
    const from = payload.from || payload.phone || payload.number; 
    const body = payload.body || payload.caption || '';
    const mediaUrl = payload.mediaUrl || payload.media?.url;
    const mediaType = payload.mediaType || payload.media?.type || payload.media?.mimetype;
    const externalId = payload.id || payload.id_mensagem || payload.messageId || payload.wamid || null;
    const direction = payload.direction || 'entrada'; 
    const sender = payload.sender || 'lead'; 

    if (!from) throw new Error('O número de telefone (from/phone) é obrigatório.');

    const phoneWithCountryCode = cleanPhoneNumber(from);
    const phoneWithoutCountryCode = phoneWithCountryCode.startsWith('55') 
      ? phoneWithCountryCode.substring(2) 
      : phoneWithCountryCode;

    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('id, organization_id')
      .in('telefone', [phoneWithCountryCode, phoneWithoutCountryCode])
      .limit(1)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ message: 'Lead não encontrado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    let uploadedFilePath: string | null = null;
    let finalFileType: string | null = null;

    if (mediaUrl && mediaType) {
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) throw new Error('Falha ao baixar a mídia da URL fornecida.');
      const mediaData = await mediaResponse.arrayBuffer();

      let fileExtension = 'bin';
      if (mediaType.includes('pdf')) { fileExtension = 'pdf'; finalFileType = 'pdf'; }
      else if (mediaType.includes('image')) { fileExtension = mediaType.split('/')[1] || 'jpg'; finalFileType = 'imagem'; }
      else if (mediaType.includes('video')) { fileExtension = 'mp4'; finalFileType = 'video'; }
      else if (mediaType.includes('audio') || mediaType.includes('ogg')) { fileExtension = mediaType.includes('ogg') ? 'ogg' : 'mp3'; finalFileType = 'audio'; }
      else { fileExtension = mediaType.split('/')[1] || 'bin'; finalFileType = 'arquivo'; }

      const filePath = `${lead.organization_id}/${lead.id}/${Date.now()}.${fileExtension}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('media-mensagens')
        .upload(filePath, mediaData, { contentType: mediaType });

      if (uploadError) throw uploadError;
      uploadedFilePath = filePath;
    }

    const { data: message, error: messageError } = await supabaseAdmin
      .from('mensagens')
      .insert({
        lead_id: lead.id,
        conteudo: body,
        direcao: direction, 
        remetente: sender, 
        tipo_conteudo: uploadedFilePath ? finalFileType : 'texto',
        id_mensagem: externalId,
        media_path: uploadedFilePath
      })
      .select('id')
      .single();

    if (messageError) throw messageError;

    if (uploadedFilePath && finalFileType) {
      const { error: attachmentError } = await supabaseAdmin
        .from('message_attachments')
        .insert({
          message_id: message.id,
          file_path: uploadedFilePath,
          file_type: finalFileType as any,
        });
      if (attachmentError) throw attachmentError;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```

---

## 8. `seed-stages`

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const targetStages = [
  { nome: 'Novo Lead', cor: '#94a3b8', posicao_ordem: 1 }, 
  { nome: 'Qualificação', cor: '#64748b', posicao_ordem: 2 },
  { nome: 'Coletando Informações', cor: '#a8a29e', posicao_ordem: 3 },
  { nome: 'Agendamento Solicitado', cor: '#C5A47E', posicao_ordem: 4 },
  { nome: 'Agendado', cor: '#4ade80', posicao_ordem: 5 },
  { nome: 'Procedimento Fechado', cor: '#15803d', posicao_ordem: 6 },
  { nome: 'Perdido', cor: '#ef4444', posicao_ordem: 7 }, 
];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: currentStages, error: fetchError } = await supabaseClient
      .from('etapas')
      .select('*')
      .order('posicao_ordem', { ascending: true });

    if (fetchError) throw fetchError;

    const updates = [];
    const inserts = [];

    for (let i = 0; i < targetStages.length; i++) {
      const target = targetStages[i];
      const existing = currentStages.find(s => s.nome.trim().toLowerCase() === target.nome.toLowerCase());
      
      if (existing) {
        updates.push(
          supabaseClient
            .from('etapas')
            .update({ nome: target.nome, cor: target.cor, posicao_ordem: target.posicao_ordem })
            .eq('id', existing.id)
        );
      } else {
        inserts.push(target);
      }
    }

    if (updates.length > 0) await Promise.all(updates);
    if (inserts.length > 0) await supabaseClient.from('etapas').insert(inserts);

    return new Response(JSON.stringify({ success: true, message: "Etapas padronizadas com sucesso!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
```

---

## 9. `seed-templates`

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const templates = [
  { nome: 'Confirmação de Avaliação', categoria: 'Agendamento', conteudo: 'Olá {{nome_lead}}, tudo bem? Confirmamos sua avaliação agendada para amanhã. Por favor, responda SIM para confirmar sua presença.', variaveis: ['nome_lead'] },
  { nome: 'Orientações Pós-Procedimento', categoria: 'Pós-Venda', conteudo: 'Oi {{nome_lead}}. Como está se sentindo após o procedimento? Lembre-se de evitar exposição solar e esforço físico hoje. Qualquer dúvida, estamos por aqui!', variaveis: ['nome_lead'] },
  { nome: 'Agendamento de Retorno', categoria: 'Retorno', conteudo: 'Olá {{nome_lead}}. Já está na hora do seu retorno para avaliarmos os resultados do seu tratamento. Qual o melhor horário?', variaveis: ['nome_lead'] },
  { nome: 'Boas-vindas à Clínica', categoria: 'Boas-vindas', conteudo: 'Seja bem-vindo(a) à {{nome_escritorio}}. É um prazer cuidar da sua autoestima. Nossa equipe entrará em contato em breve.', variaveis: ['nome_escritorio'] },
  { nome: 'Envio de Orçamento', categoria: 'Comercial', conteudo: 'Olá {{nome_lead}}. Conforme sua avaliação, segue o orçamento detalhado do seu plano de tratamento.', variaveis: ['nome_lead'] },
  { nome: 'Contato Inicial', categoria: 'Comercial', conteudo: 'Oi {{nome_lead}}! Vi seu interesse. Gostaria de agendar uma avaliação gratuita?', variaveis: ['nome_lead'] },
  { nome: 'Lembrete de Parcela', categoria: 'Financeiro', conteudo: 'Prezado(a) {{nome_lead}}, lembramos que a parcela do seu tratamento vence amanhã.', variaveis: ['nome_lead'] },
  { nome: 'Aniversário do Paciente', categoria: 'Relacionamento', conteudo: 'Parabéns, {{nome_lead}}! A equipe da {{nome_escritorio}} deseja a você um ano repleto de sorrisos!', variaveis: ['nome_lead', 'nome_escritorio'] },
  { nome: 'Reativação', categoria: 'Retenção', conteudo: 'Olá {{nome_lead}}. Faz {{dias_sem_contato}} dias que realizamos seu procedimento. Que tal agendar uma manutenção?', variaveis: ['nome_lead', 'dias_sem_contato'] },
  { nome: 'Pesquisa de Satisfação', categoria: 'Qualidade', conteudo: 'Oi {{nome_lead}}. Adoraríamos saber o que achou do seu atendimento. De 0 a 10, qual nota você daria?', variaveis: ['nome_lead'] }
];

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Usuário não encontrado');

    const { data: profile, error: profileError } = await supabaseClient
      .from('perfis')
      .select('organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile || !profile.organization_id) throw new Error('Organização não encontrada.');

    const templatesWithIds = templates.map(t => ({ 
      ...t, 
      usuario_id: user.id,
      organization_id: profile.organization_id 
    }));

    const { error } = await supabaseClient.from('templates_mensagem').insert(templatesWithIds);
    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
```

---

## 10. `toggle-ai-status`

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { addMinutes } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { lead_id, telefone, action, duration_minutes } = await req.json();

    if (!lead_id && !telefone) throw new Error('É necessário fornecer lead_id ou telefone.');
    if (!['on', 'off', 'pause'].includes(action)) throw new Error("Ação inválida. Use: 'on', 'off' ou 'pause'.");

    let query = supabaseAdmin.from('leads').select('id').limit(1);
    
    if (lead_id) {
      query = query.eq('id', lead_id);
    } else if (telefone) {
      const cleanPhone = telefone.replace(/\D/g, '');
      query = query.or(`telefone.eq.${cleanPhone},telefone.eq.55${cleanPhone},telefone.eq.${cleanPhone.replace(/^55/, '')}`);
    }

    const { data: leads, error: findError } = await query;
    if (findError || !leads || leads.length === 0) throw new Error('Lead não encontrado.');

    const targetLeadId = leads[0].id;
    let updateData = {};

    if (action === 'off') updateData = { ia_ativa: false, ia_paused_until: null };
    else if (action === 'on') updateData = { ia_ativa: true, ia_paused_until: null };
    else if (action === 'pause') {
      const minutes = duration_minutes || 60;
      const pausedUntil = addMinutes(new Date(), minutes).toISOString();
      updateData = { ia_ativa: true, ia_paused_until: pausedUntil };
    }

    const { error: updateError } = await supabaseAdmin
      .from('leads')
      .update(updateData)
      .eq('id', targetLeadId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true, message: `IA atualizada para: ${action}`, lead_id: targetLeadId, updates: updateData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
```

---

## 11. `trigger-campaign`

> ⚠️ **ATUALIZAR:** a URL do webhook (`WEBHOOK_URL`) deve apontar para seu NOVO ambiente n8n.

```typescript
import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { subMonths, subDays, isAfter, isBefore, differenceInDays } from 'https://esm.sh/date-fns@2.30.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ⚠️ SUBSTITUIR pela URL do webhook do SEU n8n
const WEBHOOK_URL = 'https://webhook.orbevision.shop/webhook/campanhas-crm-moncao';

const personalizeMessage = (template: string, lead: any, clinicName: string): string => {
  let message = template;
  let daysSinceLastContact: string | number = 'N/A';
  let lastContactDate: string = 'N/A';

  if (lead.ultimo_contato) {
    const lastContact = new Date(lead.ultimo_contato);
    if (!isNaN(lastContact.getTime())) {
      daysSinceLastContact = differenceInDays(new Date(), lastContact);
      lastContactDate = lastContact.toLocaleDateString('pt-BR');
    }
  }

  const variables: Record<string, any> = {
    primeiro_nome: lead.nome ? lead.nome.split(' ')[0] : '',
    nome_lead: lead.nome,
    telefone: lead.telefone,
    email: lead.email,
    origem: lead.origem,
    data_ultimo_contato: lastContactDate,
    idade: lead.idade,
    genero: lead.genero,
    nome_escritorio: clinicName,
    dias_sem_contato: daysSinceLastContact.toString(),
    nome_paciente: lead.nome,
    nome_clinica: clinicName
  };

  for (const key in variables) {
    if (variables[key] !== null && variables[key] !== undefined) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      message = message.replace(regex, String(variables[key]));
    }
  }
  return message;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { campaignId } = await req.json();
    if (!campaignId) throw new Error('O ID da campanha é obrigatório.');

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) throw new Error(campaignError?.message || 'Campanha não encontrada.');

    const { data: clinicSettings } = await supabaseAdmin
      .from('configuracoes_clinica')
      .select('nome')
      .eq('usuario_id', campaign.usuario_id) 
      .limit(1)
      .single();
      
    const clinicName = clinicSettings?.nome || 'seu escritório';

    let targetedLeads: any[] = [];

    if (campaign.targeted_lead_ids && Array.isArray(campaign.targeted_lead_ids) && campaign.targeted_lead_ids.length > 0) {
      const { data, error } = await supabaseAdmin.from('leads').select('*').in('id', campaign.targeted_lead_ids);
      if (error) throw error;
      targetedLeads = data || [];
    } else {
      const { data: allLeads, error: leadsError } = await supabaseAdmin.from('leads').select('*');
      if (leadsError) throw leadsError;
      const { data: allStages, error: stagesError } = await supabaseAdmin.from('etapas').select('*');
      if (stagesError) throw stagesError;

      const config = campaign.segmento_config;
      if (config.type === 'all') {
        targetedLeads = allLeads || [];
      } else if (config.type === 'predefined' && config.predefined?.length > 0) {
        const now = new Date();
        const sixMonthsAgo = subMonths(now, 6);
        const threeMonthsAgo = subMonths(now, 3);
        const finalStagePositions = (allStages || []).filter((s: any) => ['Convertido', 'Perdido', 'Contrato Fechado'].includes(s.nome)).map((s: any) => s.posicao_ordem);

        targetedLeads = (allLeads || []).filter((lead: any) => {
          return config.predefined.some((segment: string) => {
            if (segment === 'active') return lead.ultimo_contato && isAfter(new Date(lead.ultimo_contato), sixMonthsAgo);
            if (segment === 'inactive') return !lead.ultimo_contato || isBefore(new Date(lead.ultimo_contato), sixMonthsAgo);
            if (segment === 'new') return isAfter(new Date(lead.criado_em), threeMonthsAgo);
            if (segment === 'in_treatment') return !finalStagePositions.includes(lead.posicao_pipeline);
            return false;
          });
        });
      } else if (config.type === 'advanced') {
        const { lastContact, gender, ageRange } = config.advanced;
        targetedLeads = (allLeads || []).filter((lead: any) => {
          if (lastContact && lead.ultimo_contato) {
            const days = parseInt(lastContact);
            if (!isNaN(days) && isBefore(new Date(lead.ultimo_contato), subDays(new Date(), days))) return false;
          }
          if (gender !== 'Todos' && lead.genero !== gender) return false;
          if (ageRange !== 'Todos') {
            const [min, max] = ageRange.split('-').map(Number);
            if (!lead.idade || lead.idade < min || lead.idade > max) return false;
          }
          return true;
        });
      }
    }

    let sentCount = 0;
    for (const lead of targetedLeads) {
      const message = personalizeMessage(campaign.template_mensagem, lead, clinicName);
      
      let mediaPublicUrl: string | null = null;
      if (campaign.media_url) {
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from('campaign-media')
          .getPublicUrl(campaign.media_url);
        mediaPublicUrl = publicUrl;
      }

      const mediaType = campaign.media_url 
        ? (campaign.media_url.endsWith('mp4') || campaign.media_url.endsWith('mov') ? 'video' : 'imagem') 
        : null;

      const payload = {
        whatsapp: lead.telefone,
        message: message,
        mediaUrl: mediaPublicUrl,
        lead_id: lead.id,
        user_id: campaign.usuario_id,
        media_path: campaign.media_url,
        media_type: mediaType,
      };

      try {
        await fetch(WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        sentCount++;
      } catch (e) {
        console.error(`Falha ao enviar webhook para o lead ${lead.id}:`, e.message);
      }
      
      await supabaseAdmin
        .from('campanhas')
        .update({ contagem_enviados: sentCount })
        .eq('id', campaignId);

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    await supabaseAdmin
      .from('campanhas')
      .update({ status: 'completed', contagem_enviados: sentCount })
      .eq('id', campaignId);

    return new Response(JSON.stringify({ success: true, message: `Campanha processada. ${sentCount} mensagens enviadas.` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
```
