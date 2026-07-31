# Conteúdo do Método de CS

Fonte: `05-operacoes-e-cs/sistema/*.md` — o "manual" de CS da Descompliquei (19
documentos). Este módulo é a versão desse manual embutida no app, para
consulta em `src/pages/cs/Metodo.tsx` e para outras telas do CS lerem via API.

## Decisão de arquitetura: dados TypeScript importados no bundle

**Escolha:** o conteúdo vive como módulos `.ts` com objetos/arrays tipados
(`cadeia.ts`, `materiais.ts`, `ritos-*.ts`, `plano-de-acao.ts`,
`principios.ts`, `realidade.ts`, `tecnico.ts`, `diagnostico.ts`), importados
normalmente pelo bundler. Nada é lido do disco em tempo de execução, nada
depende de rede, e não há parsing de markdown no cliente.

**Por que não markdown importado + parser em tempo de execução (a alternativa
óbvia, já que o gerador `_gerar-manual.js` da pasta de origem faz exatamente
isso em Node):**

1. **A entrega mais valiosa desta tarefa é a API de consulta** — funções como
   `getMateriaisPorGrupo('ticket')` ou `getSemanaDoMes(2)` precisam devolver
   *dado estruturado e tipado* (um array de `Material`, um objeto
   `SemanaDoMes`), não uma string de HTML ou um blob de markdown que a tela
   consumidora teria que re-parsear. Markdown solto não tem essa forma —
   teria que ser convertido para dado estruturado de qualquer jeito, então é
   mais simples e mais robusto já nascer estruturado.
2. **Reaproveitar `_gerar-manual.js` teria custo maior que benefício aqui.**
   O gerador resolve um problema diferente do desta tela: ele transforma
   markdown solto em HTML navegável e pesquisável para leitura *fora do
   app*, sem precisar de forma tipada nem de API de consulta programática.
   Embutir um parser de markdown (mesmo o dele, sem dependências) no bundle
   do cliente só para depois re-extrair de volta a estrutura (quais itens
   são o catálogo de materiais, quais são a régua de risco) seria trabalho
   redundante — a estrutura já existe nos documentos-fonte na cabeça de quem
   os escreveu; o correto é capturá-la uma vez, à mão, como dado.
3. **Zero custo de execução e zero superfície de falha em runtime.** Dado
   TypeScript é só JavaScript depois do build — nenhum parsing acontece no
   navegador, nenhum estado de "carregando o manual", nenhum jeito de o
   parser quebrar num markdown com uma tabela mal formatada.
4. **Tipagem de ponta a ponta.** `Elo`, `Material`, `SemanaDoMes` etc. são
   tipos reais — o TypeScript pega em tempo de compilação um `getElo('tiket')`
   com erro de digitação, o que markdown solto nunca ofereceria.

**Custo aceito conscientemente:** o conteúdo não é gerado automaticamente a
partir dos `.md` — é uma transcrição fiel, mas com curadoria humana (uma
"segunda fonte da verdade" que precisa ser mantida manualmente se o manual
mudar). Isso é aceitável porque (a) o CEO revisa e evolui o manual pelos
`.md` — este módulo não os substitui, é uma camada de consulta derivada; (b)
o conteúdo aqui prioriza precisão de regras, números e estrutura sobre
completude literal — parágrafos longos do manual foram condensados sem
perder nenhum dado com peso de decisão (limiares, fórmulas, exemplos
numéricos, tabelas erro/certo). Ver o relatório da tarefa que criou este
módulo para o que ficou de fora por escopo (principalmente `mapa-do-crm.md`,
schema de baixo nível já coberto em partes por `tecnico.ts`).

## Estrutura

```
types.ts                — tipos compartilhados
principios.ts            — 00-como-funciona.md (P1-P9, os 3 rituais)
cadeia.ts                 — 01-a-cadeia.md + proposta-novos-elos.md (4 camadas, 8 elos, elo-restrição)
diagnostico.ts             — 02-diagnostico.md (protocolo passo a passo)
materiais.ts               — 03-materiais-por-elo.md (catálogo de 50 materiais)
plano-de-acao.ts            — 04-plano-de-acao.md (anatomia do plano mensal)
ritos-mes.ts                 — ritos/00-o-mes-do-cs.md
ritos-risco.ts                — ritos/01-regua-de-risco.md
ritos-onboarding.ts            — ritos/02-onboarding.md
ritos-fim-de-ciclo.ts           — ritos/03-fim-de-ciclo.md
ritos-reuniao-mensal.ts          — ritos/04-reuniao-mensal.md
ritos-sessao-tatica.ts            — ritos/05-sessao-tatica-grupo.md
realidade.ts                       — o-que-a-plataforma-ja-faz.md + quem-atende-o-lead.md + comparecimento-e-fechamento.md
tecnico.ts                          — 05-publicar-plano.md + 06-painel.md (condensado)
index.ts                             — barrel + API de consulta + busca
```

Cada estrutura de dado (elo, material, semana do mês, sinal de risco...) é a
**única fonte** tanto para a API de consulta quanto para a renderização da
tela — a tela de Método (`src/pages/cs/Metodo.tsx`,
`src/components/cs/metodo/`) mapeia essas mesmas listas para JSX, e o índice
de busca (`search()` em `index.ts`) é *gerado* a partir delas, não escrito à
mão como um terceiro texto solto.

## API de consulta

Funções puras, sem hook, sem rede — importe de `@/content/cs`:

```ts
import { getElo, getMateriaisPorGrupo, getSemanaDoMes, getRoteiroReuniaoMensal, getNivelRisco, search } from '@/content/cs';

getElo('resgate_lead_frio');          // Elo | undefined
getMateriaisPorGrupo('ticket');       // Material[]
getSemanaDoMes(2);                    // SemanaDoMes | undefined
getRoteiroReuniaoMensal();            // { blocos, regrasDuras, conversasDificeis, ... }
getNivelRisco('critico');             // NivelRisco | undefined
search('confirmação de consulta');    // SearchResult[]
```

Ver `index.ts` para a lista completa (camadas, cadeia, diagnóstico, ritos,
régua de risco, onboarding, fim de ciclo, reunião mensal, sessão tática,
plano de ação, catálogo de materiais, realidade da operação, técnico).

## Não editar os `.md` de origem a partir daqui

Este módulo é derivado dos markdowns de `05-operacoes-e-cs/sistema/` — eles
são a fonte, o CEO revisa por lá. Mudanças de conteúdo entram primeiro nos
`.md`, depois são replicadas aqui (curadoria manual, não automática — ver
"Custo aceito conscientemente" acima).
