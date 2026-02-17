import { serve } from 'https://deno.land/std@0.190.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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

    if (!from) throw new Error('Telefone obrigatório.');

    const phoneWithCountryCode = cleanPhoneNumber(from);
    const phoneWithoutCountryCode = phoneWithCountryCode.startsWith('55') ? phoneWithCountryCode.substring(2) : phoneWithCountryCode;

    const { data: lead, error: leadError } = await supabaseAdmin
      .from('leads')
      .select('id, organization_id')
      .in('telefone', [phoneWithCountryCode, phoneWithoutCountryCode])
      .limit(1)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ message: 'Lead não encontrado.' }), { status: 404, headers: corsHeaders });
    }

    let uploadedFilePath: string | null = null;
    let finalFileType: string | null = null;

    if (mediaUrl && mediaType) {
      const mediaResponse = await fetch(mediaUrl);
      if (!mediaResponse.ok) throw new Error('Falha ao baixar mídia.');
      const mediaData = await mediaResponse.arrayBuffer();

      let fileExtension = 'bin';
      if (mediaType.includes('pdf')) { fileExtension = 'pdf'; finalFileType = 'pdf'; }
      else if (mediaType.includes('image')) { fileExtension = 'jpg'; finalFileType = 'imagem'; }
      else if (mediaType.includes('video')) { fileExtension = 'mp4'; finalFileType = 'video'; }
      else if (mediaType.includes('audio') || mediaType.includes('ogg')) { fileExtension = 'mp3'; finalFileType = 'audio'; }

      const filePath = `${lead.organization_id}/${lead.id}/${Date.now()}.${fileExtension}`;
      const { error: uploadError } = await supabaseAdmin.storage
        .from('media-mensagens')
        .upload(filePath, mediaData, { contentType: mediaType });

      if (!uploadError) {
        uploadedFilePath = filePath;
      }
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
        media_path: uploadedFilePath // Armazenando diretamente para facilitar acesso
      })
      .select('id')
      .single();

    if (messageError) throw messageError;

    if (uploadedFilePath && finalFileType) {
      await supabaseAdmin
        .from('message_attachments')
        .insert({
          message_id: message.id,
          file_path: uploadedFilePath,
          file_type: finalFileType as any,
        });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: corsHeaders });
  } catch (error) {
    console.error('[receive-message] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});