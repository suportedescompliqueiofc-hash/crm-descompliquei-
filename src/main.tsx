import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Garante que o tema padrão é 'light' na primeira visita
const savedTheme = localStorage.getItem('theme') || localStorage.getItem('vite-ui-theme');
const activeTheme = savedTheme || 'light';

// Aplica o tema imediatamente no HTML (evita flash de tema errado)
document.documentElement.classList.remove('light', 'dark');
document.documentElement.classList.add(activeTheme);

// Se não havia nada salvo, persiste o padrão 'light'
if (!savedTheme) {
  localStorage.setItem('theme', 'light');
}

createRoot(document.getElementById("root")!).render(<App />);
