# Integração WhatsApp (UaZAPI + Supabase) - Arquitetura e Diagnóstico Completo

Este documento serve como um **Guia Absoluto** e **Habilidade (Skill)** para a IA ou desenvolvedores manterem, depurarem e alterarem o fluxo de recebimento e envio de mensagens de WhatsApp neste CRM. 

Sempre consulte este documento antes de mexer nas funções de recebimento (`receive-message`), envio (`send-quick-message` ou rotas locais) e componentes de áudio/mídia do frontend.

## 1. O Fluxo de Recebimento (`receive-message`)

A Edge Function `receive-message` é a principal porta de entrada. Ela lida com as requisições (webhooks) originadas pela UaZAPI sempre que um evento de mensagem acontece. 

### 1.1 Regra de Ouro: Isolamento Multi-Tenant (`organization_id`)
> **🚨 CRÍTICO:** O sistema atende múltiplos clientes (inquilinos) simultaneamente e os conecta à mesma tabela de `leads` e `mensagens`. Qualquer falha no isolamento fará com que mensagens "desapareçam" do painel de um inquilino e apareçam silenciosamente no painel de outro.

**Como funciona o pipeline:**
1. **Identificação da Instância:** A UaZAPI envia no payload a chave `instance` ou `instanceName`.
2. **Mapeamento:** O código consulta a tabela `whatsapp_connections` localizando essa `instance_name`. Através dela, extrai de imediato o `organization_id` e o `usuario_id_default` responsável.
3. **Escopo Obrigatório:** Daqui em diante, **NENHUM select, insert ou update** deve ser feito sem `eq('organization_id', orgId)`.

### 1.2 Regras de Identificação do Lead
Ao buscar de quem é a resposta usando o `from` (telefone numérico), a query deve obrigatoriamente restringir ao tenant:
```typescript
let leadQuery = supabaseAdmin
    .from('leads')
    .or(`telefone.eq.${phone},telefone.eq.${phone.substring(2)}`)
    .eq('organization_id', orgId); // ISSO SALVA VIDAS!
```
Se o lead não existir sob aquele `organization_id`, ele **NÃO PODE** reaproveitar lead de outro tenant; ele DEVE automaticamente **criar um novo lead** vinculando estritamente aquele `orgId`.

### 1.3 Deduplicação Saudável vs Problemática, e a Relação Multi-Instance
A UaZAPI envia webhooks concorrentemente (às vezes no mesmo milissegundo em falhas de rede), e frequentemente envia para as mesmas instâncias.

Além disso, em testes do sistema, o dono pode enviar uma mensagem do seu **Número A (Conectado)** para o seu **Número B (Conectado)** no CRM. O WhatsApp gera para essa mesma mensagem um único `messageid`. Dessa forma, os dois Webhooks (do Sender e do Receiver) disputam para gravar no banco o mesmo `id_mensagem`!

*   **A Prisão do UNIQUE INDEX Global:** No passado, a tabela `mensagens` continha um bloqueio Global (`UNIQUE INDEX mensagens_id_mensagem_unique`). Isso causava uma colisão fatal: o Sender salvava a mensagem no CRM, e o Receiver tentava salvar mas estourava na restrição `23505 Duplicate Key`. Conclusão: a mensagem não era renderizada na tela para o Recebedor.
*   **A Solução Multi-Tenant (Deploy Atual):** A restrição global foi destruída e movida para `(id_mensagem, lead_id)`. Como cada instância conversando com a outra é analisada como um `lead_id` isolado para cada, a restrição global morreu. Ambas recebem a mesma mensagem em seus Front-ends de forma isolada e limpa!
*   **Validação em Memória (`receive-message/index.ts`):** Na checagem de concorrência em tempo real, a query de deduplicação antes do insert (`existing`) OBRIGATORIAMENTE utiliza o `.eq('lead_id', lead.id)`. Nunca usar `.eq('organization_id', orgId)` para buscar se a mensagem existe, pois dois números sob a MESMA organização ainda precisam que a mensagem exista para os DOIS leads!

### 1.4 Direção, Sincronia e IA (`fromMe`)
*   Mensagens vindo do Lead: `fromMe: false` -> `direcao: 'entrada'`, `remetente: 'lead'`.
*   Mensagens disparadas pelo usuário direto no app de celular ou no CRM: `fromMe: true` -> `direcao: 'saida'`, `remetente: 'agente'`.
**Ogatilho de IA**: Se uma mensagem é enviada pelo Humano (`fromMe: true`), a função desativa imediatamente a Inteligência Artificial para aquele Lead (`ia_ativa: false`) para não "brigar" no atendimento.

---

## 2. Processamento Completo de Mídias e Áudios (O Pesadelo Oculto)

Se imagens somem ou áudios não tocam, **apenas 3 coisas** podem dar errado:
Erro de Base64, Erro de Bucket/Paths, ou Falso Gatilho Público.

### 2.1 Download das Mídias Webhook
Arquivos ou áudios originados pelo WhatsApp podem vir como links `mmg.whatsapp.net`. Esses links são PROTEGIDOS e falham num `fetch` normal.
*   **Intervenção do Endpoint:** O `receive-message` deve chamar o endpoint interno da prõpria UaZAPI: `POST BaseUrl/message/download` contendo o token da conexão (que precisa estar ou no payload original ou puxado dá tabela `whatsapp_connections`).
*   **Bufferização:** O webhook converte o base64 de volta pra Buffers ou Uint8Array para preparo no Supabase.

### 2.2 Divisão Estrita de Buckets (Storage)
O Supabase armazena arquivos em dois lugares principais:
1.  **Imagem / Video / PDF:** Vão para o Storage `media-mensagens`.
2.  **Áudio de Voz (PTT / Opus / Ogg):** Vão para o Storage exclusivo `audio-mensagens`.
A função `receive-message` fará essa divisão lendo o `contentType`.

### 2.3 Resgate de Mídias pelo Frontend (A Ponte: `get-media-url`)
O frontend NÃO usa links públicos. Para ler um arquivo, o Componente envia o Caminho (`mediaPath`) para a Edge Function de leitura chamada `get-media-url`.
*   **O Erro Comum no Front:** O Componente do painel (ex: `AudioMessage.tsx`) não passava a propriedade `mediaType: 'audio'`. Logo, a Edge Function procurava o áudio em Imagens, não achava e quebrava.
*   **Obrigatoriedade:** Para puxar um áudio do CRM (áudios de leads salvos no DB), passar: `body: { mediaPath: 'path/arquivo.ogg', mediaType: 'audio' }`.

---

## 3. Checklist de Diagnóstico Futuro

Se, porventura, as mensagens pararem de chegar futuramente ou começarem a dar glitch, SIGA ESSES PASSOS COM ATENÇÃO:

1.  **Isolamento de Erros 401 e 404 Nativos:** Se os Invocations da função mostram 4xx ou 500 sem parar, garanta que a Edge function foi mandada ao ar ignorando verificação JWT, usando um shell:
    `npx supabase functions deploy receive-message --no-verify-jwt`.
2.  **Mensagens Caem no Banco de Dados mas Não na Tela:**
    * Problema 100% certeiro de isolamento Multi-Tenant.
    * Inspecione a tabela `mensagens` buscando aquele Payload. Olhe se o ID do número salvo nela não pertence à *uma Organização errada*. 
    * Se pertenceu, você tem queryes não-sanitizadas em relação ao `orgId`. A query do webhook de recebimento ignorou de onde partiu e buscou o mundo todo por número do telefone.
3.  **Somente Arquivos não Mostram no Painel:**
    *   Verifique se o Webhook estava habilitado para buscar o arquivo.
    *   Veja no frontend (ex: `<AudioMessage>`) se ele pede especificamente `mediaType='audio'` ao chamar a assinatura de Bucket.

Mantenha essa resiliência em mente! A API da UaZAPI é veloz e implacável em retentativas. Sempre construa código pensando em **10 chamadas ao mesmo tempo querendo cadastrar o mesmo número simultaneamente.** Use Lockings e `maybeSingle()`.
