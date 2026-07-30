import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
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
//                      Publicado num SEGUNDO projeto Vercel, apontando para
//                      o subdomínio cs.descompliqueiofc.com. Como as duas
//                      entradas compartilham o mesmo `vercel.json` do repo
//                      (ele não pode ser diferente por projeto), o projeto
//                      Vercel do CS precisa de uma configuração de
//                      rewrite/rota própria para servir `/index-cs.html`
//                      em vez de `/index.html` na raiz — isso é
//                      responsabilidade do João ao configurar o projeto
//                      (ver relatório do agente que criou este arquivo).
//
// Ambas as entradas saem em `dist/` (dist/index.html e dist/index-cs.html)
// com os assets compartilhados que forem idênticos entre os dois bundles
// (ex.: chunks de dependências comuns) — Vite/Rollup faz isso sozinho via
// `build.rollupOptions.input`.
// ─────────────────────────────────────────────────────────────────────────

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
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
