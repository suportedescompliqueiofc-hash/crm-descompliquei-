# Contexto e Arquitetura do Projeto: CRM Descompliquei / Admin OS

Este documento serve como a **memória central** e **contexto absoluto** do que está sendo construído no projeto "CRM Descompliquei". Qualquer Inteligência Artificial que assumir o projeto deve ler este arquivo para entender o ecossistema, o stack tecnológico, as funcionalidades principais e o status atualizado do que já foi implementado.

---

## 1. Visão Geral do Sistema
O **CRM Descompliquei** é uma plataforma de gestão, aceleração e inteligência comercial desenvolvida para clínicas. O sistema é dividido em dois grandes universos:
1. **Plataforma (Visão do Cliente / Clínica):** Onde o usuário acessa treinamentos (Trilha C.L.A.R.O.), configura a memória de sua clínica (Cérebro Central) e utiliza as Inteligências Artificiais Comerciais para geração de conteúdo, remarketing, follow-ups e objeções.
2. **Admin OS (Visão do Administrador):** Um painel interno e gerencial onde os donos do Descompliquei monitoram o progresso dos clientes, dão acesso, configuram os modelos globais de Inteligência Artificial e acompanham a "saúde" e completude do CRM de cada clínica.

## 2. Stack Tecnológico
* **Frontend:** React + Vite, TypeScript.O MCP do supabase está funciionando?

* **Roteamento:** React Router DOM.
* **Backend as a Service (BaaS):** Supabase (PostgreSQL).
* **Funções Serverless:** Supabase Edge Functions (Deno).
* **Modelos de IA (LLM):** Integração com a API da xAI utilizando estritamente o modelo de alta performance **`grok-4-1-fast-reasoning`**.

## 3. Funcionalidades Core
* **Trilha C.L.A.R.O.:** Uma área de membros estruturada por Pilares (Fundação Clínica, Motor de Demanda, Motor Comercial) e Módulos.
* **Cérebro Central:** O coração da plataforma. Um formulário interativo de 7 Fases onde a clínica insere todas as suas diretrizes, que servem de contexto ("system prompt") para as IAs:
  - *Fase 1:* Identidade
  - *Fase 2:* Procedimentos
  - *Fase 3:* Paciente Ideal
  - *Fase 4:* Posicionamento
  - *Fase 5:* Operação
  - *Fase 6:* FAQ e Objeções
  - *Fase 7:* Trilha / Materiais de Referência
* **Hub de IA Comercial:** Um conjunto de 8 agentes de IA especializados (IA de Pré-Atendimento, IA de Objeções, IA de Análise, etc.) que utilizam as informações do "Cérebro" para dar respostas contextualizadas e de alta conversão.

---

## 4. Histórico de Construção e Correções Recentes

Ao longo das últimas sessões de desenvolvimento, focamos em **Finalizar a Integridade do Admin OS** e garantir uma infraestrutura sólida de ponta a ponta. Abaixo está o resumo completo do que foi construído e corrigido até o momento:

### Integração Definitiva da Inteligência Artificial
* Foi estabelecido o uso global e mandatório do modelo **`grok-4-1-fast-reasoning`**.
* O painel **Admin Sistema** foi atualizado com esse modelo.
* A **Edge Function (`ia-proxy`)** foi reescrita para ignorar variáveis instáveis no banco e forçar nativamente as requisições da xAI a usarem o `grok-4-1-fast-reasoning`.
* Atualizamos via banco de dados a tabela `platform_ia_config` para que todas as 8 IAs padrão rodem com a engine correta.

### Sincronização do Cérebro Central
* Havia uma falha estrutural em que a tela do Administrador não enxergava todas as informações preenchidas pelos clientes (parava na fase 5).
* O arquivo `AdminClientePerfil.tsx` foi reescrito para mapear perfeitamente e em tempo real as **7 Fases do Cérebro**.
* Foram corrigidos os ponteiros e a navegação da própria tela do cliente (`Cerebro.tsx`), garantindo que o index das Fases 6 (FAQ/Objeções) e 7 (Materiais) funcione de forma imaculada.

### Debug de Interface e Navegabilidade no Admin OS
* **Bug da Tabela Admin IAs:** O dashboard das IAs estava vazio pois as interfaces TS e o Front end esperavam colunas diferentes das existentes no Banco de Dados (`display_name` vs `name`, `model_id` vs `model`). Foi feito um *refactoring* completo no `AdminIAs.tsx` com `multi_replace` para espelhar perfeitamente o banco.
* **Navegação "Ver Perfil":** Restaurada e ajustada a navegação na lista de Clientes (`AdminClientes.tsx`). O redirecionamento via `navigate('/admin/clientes/:id')` foi validado.
* **Trilha de Módulos:** Checamos a navegabilidade entre o `Pilar.tsx` e o detalhamento do módulo, assegurando a UX do usuário.

### Organização da Base de Dados
* Exclusão proativa de todos os leads e usuários falsos ou de testes da base do Supabase, estabilizando o ambiente apenas para clientes reais.

---

## 5. Próximos Passos (Para a próxima IA)
Qualquer novo agente ou LLM que assumir este projeto deve:
1. **Sempre respeitar** a escolha arquitetural de Supabase + Edge Functions.
2. **Manter o design premium:** Usar sempre Shadcn UI, preservar classes utilitárias do Tailwind e o esquema de cores dinâmico (com o laranja característico `#E85D24`).
3. **Padrão de Modelo IA:** Toda vez que for gerar prompts ou manutenções na inteligência artificial, conferir se as chamadas de API apontam estritamente para `grok-4-1-fast-reasoning`. 
4. Ao alterar o banco de dados via SQL ou gerenciar usuários, utilizar estritamente o projeto Supabase: **`noncbgdczgcboronmcah`**.
5. Manter sempre o código modificado na pasta `crm-teresa` (ou pasta atual definida pelo usuário: `crm-descompliquei-geral`) conforme as regras globais estipuladas.
