import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// ─────────────────────────────────────────────────────────────────────────
// Múltiplas entradas — dois apps, um único repositório/build.
//
//   index.html      → src/main.tsx    → App.tsx     (plataforma do cliente)
//                      Publicado no projeto Vercel PRINCIPAL, domínio do
//                      cliente (app.descompliquei... / domínio atual).
//                      `npm run build` continua gerando `dist/index.html`
//                      exatamente como antes — SEM regressão.
//
//   index-cs.html   → src/main-cs.tsx → App-cs.tsx  (app interno de CS)
//                      MESMO projeto Vercel, servido em cs.descompliqueiofc.com
//                      por rewrite de host no `vercel.json`.
//
// Ambas as entradas saem em `dist/` com os assets compartilhados que forem
// idênticos entre os dois bundles — Vite/Rollup faz isso sozinho.
//
// ── Por que a saída da plataforma vira `app.html` (plugin abaixo) ────────
// A Vercel dá **precedência ao filesystem antes dos rewrites** ("precedence is
// given to the filesystem prior to rewrites being applied", doc oficial; foi por
// isso que `handle:'filesystem'` foi deprecado). Enquanto existia um
// `dist/index.html`, o caminho `/` casava com esse arquivo ANTES do rewrite de
// host rodar — e `cs.descompliqueiofc.com/` servia a plataforma do cliente em
// vez do console. O sintoma era traiçoeiro: só a raiz quebrava, porque
// `/semana`, `/agenda` etc. não existem no filesystem e caíam no rewrite certo.
// Verificado em produção em 2026-07-31: a raiz devolvia `<title>CRM
// Descompliquei</title>`.
//
// Com a raiz do output SEM arquivo estático, nenhum host casa com o filesystem
// em `/` e os dois rewrites do `vercel.json` passam a decidir — cada host vai
// para o seu HTML. O `index.html` continua existindo como fonte, então
// `npm run dev` segue servindo `/` normalmente: o rename só acontece no build.
// ─────────────────────────────────────────────────────────────────────────

/**
 * Renomeia `dist/index.html` → `dist/app.html` ao fim do build.
 * O `vercel.json` aponta o rewrite catch-all da plataforma para `/app.html`.
 * Os dois precisam mudar juntos — mexer num sem o outro derruba a raiz da
 * plataforma para os clientes.
 */
const renomearEntradaDaPlataforma = () => ({
  name: "renomear-entrada-da-plataforma",
  closeBundle() {
    const dist = path.resolve(__dirname, "dist");
    const origem = path.join(dist, "index.html");
    const destino = path.join(dist, "app.html");
    if (!fs.existsSync(origem)) {
      // Sem isso o deploy sobe um site sem porta de entrada, e o erro só
      // apareceria em produção. Falhar o build é o comportamento correto.
      throw new Error(
        "[build] dist/index.html não foi gerado — a entrada da plataforma sumiu do rollupOptions.input?",
      );
    }
    fs.renameSync(origem, destino);
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    renomearEntradaDaPlataforma(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html"),
        cs: path.resolve(__dirname, "index-cs.html"),
      },
    },
  },
}));
