// Ponto de entrada do app de CS (cs.descompliqueiofc.com).
// Espelha src/main.tsx no bootstrap, com DUAS diferenças deliberadas:
//
//   1. `data-cs` no <html> — é o escopo do tema próprio do console
//      (src/styles/cs-theme.css). Sem esse atributo o app cai no tema da
//      plataforma do cliente e a casca inteira perde a identidade.
//   2. Tema SEMPRE claro. O app do cliente guarda a preferência em
//      localStorage e, em desenvolvimento, os dois rodam no mesmo domínio
//      (localhost) — sem forçar aqui, quem usa o CRM no escuro abriria o
//      console num tema escuro que ele não tem. O `cs-theme.css` ainda
//      neutraliza `.dark` por baixo, mas o certo é nem chegar lá.
import { createRoot } from "react-dom/client";
import AppCs from "./App-cs.tsx";
import "./index.css";
import "./styles/cs-theme.css";

document.documentElement.setAttribute('data-cs', '');
document.documentElement.classList.remove('dark');
document.documentElement.classList.add('light');

createRoot(document.getElementById("root")!).render(<AppCs />);
