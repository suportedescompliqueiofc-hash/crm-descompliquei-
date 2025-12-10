import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  GitBranch, 
  BarChart3, 
  Megaphone, 
  Settings,
  LogOut,
  ChevronLeft,
  Sparkles,
  FileText,
  MessageSquare,
  Bell,
  ShoppingCart,
  Bot
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Painel", icon: LayoutDashboard, path: "/" },
  { title: "Leads", icon: Users, path: "/leads" },
  { title: "Pipeline", icon: GitBranch, path: "/pipeline" },
  { title: "Conversas", icon: MessageSquare, path: "/conversas" },
  { title: "Notificações", icon: Bell, path: "/notificacoes" },
  { title: "Vendas", icon: ShoppingCart, path: "/vendas" },
  { title: "Relatórios", icon: BarChart3, path: "/reports" },
  { title: "Campanhas", icon: Megaphone, path: "/campaigns" },
  { title: "Templates", icon: FileText, path: "/templates" },
  { title: "IA", icon: Bot, path: "/ia" },
  { title: "Configurações", icon: Settings, path: "/settings" },
];

interface SidebarContentProps {
  isCollapsed?: boolean;
  toggleCollapse?: () => void;
}

export function SidebarContent({ isCollapsed = false, toggleCollapse }: SidebarContentProps) {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const { profile } = useProfile();

  const getInitials = (name?: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-sidebar">
        {/* Logo & Toggle */}
        <div className={`flex items-center transition-all h-16 flex-shrink-0 ${isCollapsed ? 'px-2 justify-center' : 'px-6'}`}>
          <div className={`flex items-center gap-3 whitespace-nowrap overflow-hidden transition-all ${isCollapsed ? 'w-0' : 'w-full'}`}>
            <Sparkles className="h-6 w-6 text-accent flex-shrink-0" />
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">Odontonova</h1>
              <p className="text-xs text-sidebar-foreground/70 mt-1">Gestão Inteligente</p>
            </div>
          </div>
          {toggleCollapse && (
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ml-auto" onClick={toggleCollapse}>
              <ChevronLeft className={`h-5 w-5 transition-transform duration-300 ${isCollapsed && 'rotate-180'}`} />
            </Button>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-accent/20 scrollbar-track-transparent">
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
            const Icon = item.icon;
            
            const linkClasses = `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isCollapsed ? 'justify-center' : ''} ${isActive ? 'bg-sidebar-accent text-sidebar-foreground font-medium' : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'}`;

            return isCollapsed ? (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link to={item.path} className={linkClasses}>
                    <Icon className="h-5 w-5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            ) : (
              <Link key={item.path} to={item.path} className={linkClasses}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-sidebar-border flex-shrink-0">
          <div className={`flex items-center gap-3 mb-3 ${isCollapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={profile?.url_avatar || ''} />
              <AvatarFallback className="bg-accent text-accent-foreground">
                {getInitials(profile?.nome_completo)}
              </AvatarFallback>
            </Avatar>
            <div className={`flex-1 overflow-hidden whitespace-nowrap transition-all ${isCollapsed ? 'w-0' : 'w-full'}`}>
              <p className="text-sm font-medium text-sidebar-foreground truncate" title={profile?.nome_completo || 'Usuário'}>
                {profile?.nome_completo || 'Usuário'}
              </p>
              <p className="text-xs text-sidebar-foreground/70 truncate" title={user?.email || ''}>
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className={`w-full text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${isCollapsed ? 'justify-center' : 'justify-start'}`}
            onClick={signOut}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={`ml-2 whitespace-nowrap ${isCollapsed ? 'hidden' : 'block'}`}>Sair</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}