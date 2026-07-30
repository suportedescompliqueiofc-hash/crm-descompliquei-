// Sidebar do app de CS — réplica reduzida do padrão em
// src/components/layout/Sidebar.tsx + SidebarContent.tsx (casca fixa
// `bg-sidebar`, colapsável, tooltip nos ícones quando colapsada).
// Navegação fixa: Carteira, Semana, Agenda (únicas rotas do app de CS).
import { Link, useLocation } from 'react-router-dom';
import { Briefcase, CalendarClock, CalendarDays, ChevronLeft, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';

interface NavItem {
  title: string;
  icon: LucideIcon;
  path: string;
}

const NAV_ITEMS: NavItem[] = [
  { title: 'Carteira', icon: Briefcase, path: '/' },
  { title: 'Semana', icon: CalendarClock, path: '/semana' },
  { title: 'Agenda', icon: CalendarDays, path: '/agenda' },
];

interface CsSidebarContentProps {
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

export function CsSidebarContent({ isCollapsed = false, toggleCollapse }: CsSidebarContentProps) {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const getInitials = () => user?.email?.substring(0, 2).toUpperCase() || 'CS';

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-sidebar">
        {/* LOGO */}
        <div className={`flex items-center transition-all h-16 flex-shrink-0 border-b border-white/[0.06] ${isCollapsed ? 'px-2 justify-center' : 'px-5'}`}>
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
            <Avatar className={`h-9 w-9 rounded-lg border border-white/[0.08] transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}>
              <AvatarFallback className="bg-white/[0.08] text-sidebar-foreground font-medium rounded-lg text-sm">CS</AvatarFallback>
            </Avatar>
            <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'flex-1 min-w-0 opacity-100 overflow-hidden'}`}>
              <h1 className="text-[13px] font-semibold text-sidebar-foreground leading-tight truncate">CS Descompliquei</h1>
              <p className="text-[10px] text-white/40 tracking-wide truncate">Customer Success</p>
            </div>
          </div>
          {toggleCollapse && !isCollapsed && (
            <Button variant="ghost" size="icon" className="text-white/30 hover:text-white/60 hover:bg-white/[0.06] ml-1 h-7 w-7 flex-shrink-0" onClick={toggleCollapse}>
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {toggleCollapse && isCollapsed && (
          <div className="flex justify-center pb-1">
            <Button variant="ghost" size="icon" className="text-white/30 hover:text-white/60 hover:bg-white/[0.06] h-7 w-7" onClick={toggleCollapse}>
              <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
            </Button>
          </div>
        )}

        <nav className={`flex-1 space-y-0.5 overflow-y-auto ${isCollapsed ? 'p-2' : 'px-3 py-4'}`}>
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            const linkClasses = `flex items-center gap-3 py-2 rounded-md transition-all duration-150 relative ${isCollapsed ? 'justify-center px-2' : 'px-3'} ${active ? 'bg-primary/[0.12] text-white font-medium' : 'text-white/50 hover:bg-white/[0.05] hover:text-white/80'}`;

            return isCollapsed ? (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link to={item.path} className={linkClasses}>
                    {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />}
                    <Icon className="h-5 w-5 flex-shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            ) : (
              <Link key={item.path} to={item.path} className={linkClasses}>
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full bg-primary" />}
                <Icon className="h-[18px] w-[18px] flex-shrink-0" />
                <span className="truncate text-[13px] flex-1">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* Rodapé — usuário + sair */}
        <div className={`border-t border-white/[0.06] ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {isCollapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center justify-center py-2 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.05] transition-all"
                >
                  <LogOut className="h-[18px] w-[18px]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5 px-1">
              <Avatar className="h-8 w-8 border border-white/[0.08] shrink-0">
                <AvatarFallback className="bg-white/[0.08] text-white/70 font-medium text-xs">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-medium text-white/70 truncate">{user?.email}</p>
              </div>
              <button
                onClick={() => signOut()}
                className="h-7 w-7 flex items-center justify-center rounded-md text-white/30 hover:text-white/70 hover:bg-white/[0.06] transition-all shrink-0"
                title="Sair"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
