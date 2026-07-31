// Barra de topo do console de CS — a primeira camada de cromo.
//
// Histórico honesto deste arquivo, porque ele já foi de um extremo ao outro:
//   v1 (2026-07-29) barra LATERAL escura com ícones Lucide → reprovada:
//      "está parecendo muito super admin".
//   v2 (2026-07-30) barra de topo branca, texto puro, zero cor → reprovada:
//      "tá tudo preto e branco, extremamente minimalista, quero um sistema".
//   v3 (2026-07-31, esta) barra de topo GRAFITE, largura total, texto sem
//      ícone, indicador laranja na aba ativa.
//
// A leitura que concilia as duas reprovações: o que dizia "super admin" na
// v1 não era o fundo escuro — era a coluna lateral cheia de ícones ocupando
// 240px de largura permanente. Escuro no topo é cromo de aplicação (a moldura
// da janela); escuro na lateral é painel de administração. Então a v3 mantém
// o grafite, que é o que dá corpo à interface, e não devolve a coluna nem os
// ícones.
//
// Nada de ícone aqui — nem decorativo nem "funcional". Marca à esquerda,
// rotas no centro, identidade à direita. O laranja aparece em dois pontos
// (o ponto da marca e o fio da aba ativa) e em nenhum outro: é o fio de
// ligação com a plataforma do cliente, que o CEO pediu que "aparecesse".
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
    <header className="sticky top-0 z-40 bg-[hsl(var(--cs-ink))] border-b border-[hsl(var(--cs-ink-line))]">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 h-[52px] flex items-center justify-between gap-6">
        <div className="flex items-stretch gap-8 min-w-0 h-full">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="h-[7px] w-[7px] rounded-[2px] bg-[hsl(var(--cs-accent))] shrink-0" />
            <span className="text-[13px] font-bold font-display tracking-[-0.01em] text-white/95 group-hover:text-white">
              Descompliquei
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35 pt-px">CS</span>
          </Link>

          <nav className="flex items-stretch gap-1 overflow-x-auto h-full">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'relative flex items-center px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors',
                    // O fio laranja de 2px encosta na borda inferior da barra:
                    // é o indicador de rota. Um único elemento colorido em
                    // toda a navegação.
                    'after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-t-sm after:content-[""] after:transition-colors',
                    active
                      ? 'text-white after:bg-[hsl(var(--cs-accent))]'
                      : 'text-white/50 hover:text-white/85 after:bg-transparent',
                  )}
                >
                  {item.title}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline text-[11.5px] text-white/35 truncate max-w-[190px] tabular-nums">
            {user?.email}
          </span>
          <button
            type="button"
            onClick={() => signOut()}
            className="h-7 px-2.5 rounded-md text-[11.5px] font-semibold text-white/60 hover:text-white hover:bg-white/10 transition-colors"
          >
            Sair
          </button>
        </div>
      </div>
    </header>
  );
}
