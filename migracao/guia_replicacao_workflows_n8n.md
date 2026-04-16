# 🔄 Guia de Replicação — Workflows n8n do CRM

> **Este guia instrui a IA a clonar TODOS os 12 workflows do CRM VR Concept para um novo projeto CRM.**
> A IA deve usar as ferramentas MCP do n8n (skills n8n-mcp) para executar todas as operações.

---

## 📋 RESUMO DO PROCESSO

1. Obter cada workflow da pasta origem.
2. Criar nova tag/pasta no n8n para o novo CRM.
3. Copiar cada workflow com o nome renomeado para o novo cliente.
4. Atualizar credenciais (Supabase, Evolution API) para o novo projeto.
5. Atualizar as URLs nos nodes HTTP que apontam para as Edge Functions baseadas na nova URL do Supabase.
6. Ajustar as novas rotas de webhooks (`Webhook Path`) geradas.
7. Ativar os workflows.

---

## 🏗️ 12 WORKFLOWS A CLONAR

Estes são os **12 workflows** exatos contidos na pasta "CRM Cursos Vr Concept" que devem ser duplicados:

| # | ID Origem | Nome Original | Nodes | Status | Descrição / Função Principal |
|---|---|---|---|---|---|
| 1 | `EfFhMOyRDF6N63TU` | `mensagens-crm-vrconcept` | 18 | ✅ Ativo | Recebe e processa mensagens (Webhook). |
| 2 | `3HmahCtrUXjs3Y04` | `campanhas-crm-vrconcept` | 14 | ✅ Ativo | Dispara campanhas em massa da Evolution API. |
| 3 | `Anhl4Qx8nPKPcrRq` | `excluir-mensagens-crm-vrconcept` | 3 | ✅ Ativo | Deleta mensagens do WhatsApp via webhook. |
| 4 | `8CUYvDbhqMQEPK4U` | `adicionar-retirar_etiqueta_vrconcept` | 6 | ✅ Ativo | Gerencia etiquetas individuais nos contatos. |
| 5 | `CSlUEerG31mpkqTd` | `gestao-etiquetas_vrconcept` | 3 | ⏸ Inativo | Cadastro global de etiquetas/tags. |
| 6 | `3LSTdwh6MyKhI7Be` | `notificacao_mvrconcept` | 7 | ✅ Ativo | Envia notificações de relatórios ou eventos. |
| 7 | `SWbGAhImq5tUSj6S` | `crm-vrconcept` | 7 | ✅ Ativo | Workflow de rotinas gerais / integrações internas. |
| 8 | `gzWoSoBy9Y8xCMY5` | `agente-base-vrconcept` | 151 | ✅ Ativo | O agente de IA base. *Atenção especial ao clonar: O prompt dentro do AI Agent precisa ser readaptado para o novo cliente e negócio.* |
| 9 | `LUYLCoDrp8foUv9q` | `ativar-desativar-vrconcept` | 5 | ✅ Ativo | Controla o status da IA para os leads (Pausar/Ativar). |
| 10 | `ZwACXMoOHxL2WUQ3` | `controle-vrconcept` | 15 | ✅ Ativo | Workflow para controle de bloqueios temporários ou cadência. |
| 11 | `ZD5sv83grqdzWQxX` | `botões-crm-vrconcept` | 13 | ✅ Ativo | Lida com os botões/ações interativas do painel do lead. |
| 12 | `HJyQBs0FacZmYFWf` | `envio_pdf` | 3 | ✅ Ativo | Responsável pelo envio e geração de relatórios web/mídia em PDF. |

> [!CAUTION]
> Ao clonar o `agente-base-vrconcept` (151 nodes), lembre-se de que a **Base de Conhecimento (KBM/Vector Store)** e os **Prompts** devem ser totalmente customizados para as diretrizes e dados do novo cliente.

---

## 📝 INSTRUÇÕES PASSO A PASSO PARA A IA EXECUTORA

### PASSO 1 — Definir as Variáveis do Novo Projeto

Solicite ao usuário os seguintes dados para padronizar o deploy:

```
NOME_NOVO_CRM = "nome-do-cliente" (ex: "odontonova", "santosbuffara")
NOVO_SUPABASE_URL = "https://XXXXX.supabase.co"
NOVO_SUPABASE_ANON_KEY = "eyJhbG..."
NOVO_SUPABASE_SERVICE_ROLE_KEY = "eyJhbG..."
EVOLUTION_INSTANCE_NAME = "nome-da-instancia"
EVOLUTION_API_URL = "https://painel.dominio.com"
EVOLUTION_API_KEY = "chave-api-da-instancia"
```

### PASSO 2 — Extrair e Criar (Clone)

Para cada workflow da tabela acima execute, em ordem:

1. Obter o JSON original:
   `n8n_get_workflow(id="ID_DA_TABELA", mode="full")`
2. Modificar a variável `"name"` para refletir o novo projeto (substituindo `-vrconcept` ou `_mvrconcept` por `-nome-do-novo-cliente`). Exemplo: `mensagens-crm-odontonova`.
3. Criar com: `n8n_create_workflow(name="NOVO NOME", nodes=[...], connections={...}, settings={...})`

### PASSO 3 — Atualizar Credenciais do Novo CRM (n8n)

Você precisará criar **novas credenciais** (Credentials) no painel n8n do usuário ou atribuir credenciais existentes se o usuário já as criou:
1. **Supabase API**: Configure com o `NOVO_SUPABASE_URL` e a `Service Role Key`.
2. **Evolution API (Header Auth)**: Configure com o header `apikey` = `EVOLUTION_API_KEY`.
3. **OpenAI / xAI**: Atualizar eventuais tokens e chaves no workflow de agente.

Nos nodes dos workflows clonados, altere os IDs das credentials antigas para o ID da nova credential gerada (`credentialId`).

### PASSO 4 — Substituição Massiva de URLs

1. **Edge Functions Supabase:**
   Dentro de nodes do tipo HTTP Request (ou Webhooks configurados no banco), troque a estrutura da URL base:
   - De: `https://izhbmjqyoglagooosmoc.supabase.co/functions/v1/NOME_DA_FUNCTION`
   - Para: `NOVO_SUPABASE_URL/functions/v1/NOME_DA_FUNCTION`

2. **Evolution API:**
   Certifique-se que qualquer node HTTP request que chame a Evolution API use a variável ou URL fixa atualizada contendo o `EVOLUTION_INSTANCE_NAME` e a nova `EVOLUTION_API_URL`.

### PASSO 5 — Re-Anotar Webhooks

Atenção especial a nodes `Webhook Trigger`. No n8n, ao duplicar um workflow, todos os `Webhook Paths` (IDs Únicos) das URLs são re-criados.
- Colete as **Webhooks URLs geradas de produção e teste** dos 12 novos workflows.
- As URLs obtidas *devm ir para as Edge Functions do Supabase* que as invocam no banco de dados.

### PASSO 6 — Ativação

Após ajustar tudo, para cada ID de Workflow criado:
```
n8n_update_partial_workflow(
  id = NOVO_WORKFLOW_ID,
  operations = [{ "type": "enableWorkflow" }]
)
```
*(O `gestao-etiquetas` deve continuar inativo caso seja a diretriz).*

---

## 🛠️ TROCA FUTURA DE CREDENCIAIS / PROPRIETÁRIO

Para instruções caso o usuário daqui a alguns meses precise **Atualizar apenas Credenciais ou Mudar o banco Supabase** de um projeto ativo:

1. **Para Credenciais Simples**: Editar apenas as "Credentials" diretamente pelo painel n8n e o novo token valerá imediatamente para todos os 12 workflows. Não precisa editar fluxo a fluxo.
2. **Para Novo Banco de Dados (Supabase URL mudou)**: O agente deverá rodar uma extração de todos os 12 workflows do cliente agrupados via API e buscar (grep) nodes que contenham o host ou URL antigo gerando um `n8n_update_full_workflow` ou edit workflow para o novo domain URL.

---

## ✅ CHECKLIST FINAL

**Antes de finalizar a replicação do n8n, a IA deve:**
- [ ] Confirmar que exatos 12 workflows foram copiados da origem.
- [ ] Listar todos os Webhooks criados (Test URL e Production URL) para o usuário usar nos Edge Functions do novo Supabase.
- [ ] Confirmar os acessos das credentials HTTP com o Evolution API e Supabase API.
- [ ] Verificar e confirmar o ajuste do Prompt Base do Agente IA.
- [ ] Relatar a conclusão bem sucedida dos testes com uma mensagem WhatsApp de Trigger Inicial.
