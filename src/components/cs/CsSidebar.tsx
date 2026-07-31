// Navegação do app de CS — barra de topo, texto puro, sem ícone nenhum.
//
// Redesign completo (2026-07-30, veredito do CEO: "Está parecendo muito
// super admin aqui... Em Semana e Agenda está absolutamente tudo igual").
// A barra lateral escura com ícones ERA a cara de painel administrativo que
// ele rejeitou — mesmo com o conteúdo das telas já mais limpo, a moldura em
// volta continuava dizendo "software de gestão". Trocada por uma barra de
// topo simples: nome do sistema à esquerda (link para a Carteira), os links
// de texto das rotas do app no centro (Carteira, Semana, Agenda, Método),
// e-mail + sair à direita. Nada de ícone Lucide em lugar nenhum — nem
// decorativo, nem "funcional" (chevron de menu etc.).
//
// Estado ativo: peso de fonte + sublinhado, nunca uma pílula colorida
// (`bg-primary/[0.12]`) — cor é exceção neste sistema, e navegação não é
// onde ela seria insubstituível.
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { title: 'Carteira', path: '/' },
  { title: 'Semana', path: '/semana' },
  { title: 'Agenda', path: '/agenda' },
  { title: 'Método', path: '/metodo' },
];

export function CsTopNav() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header className="border-b border-border/60 bg-background">
      <div className="max-w-[1100px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        <div className="flex items-center gap-6 min-w-0">
          <Link to="/" className="text-[13px] font-semibold font-display text-foreground shrink-0 tracking-tight">
            CS Descompliquei
          </Link>
          <nav className="flex items-center gap-5 overflow-x-auto">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'text-[13px] whitespace-nowrap transition-colors underline-offset-[6px]',
                    active
                      ? 'font-semibold text-foreground underline decoration-foreground/30'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden sm:inline text-[12px] text-muted-foreground/60 truncate max-w-[180px]">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-[12px] text-muted-foreground hover:text-foreground underline-offset-[6px] hover:underline"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
