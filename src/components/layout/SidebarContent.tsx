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
  MessageSquare,
  Bell,
  ShoppingCart,
  Bot,
  Target,
  Zap,
  GitMerge,
  ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useBranding } from "@/contexts/BrandingContext";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";

const menuItems = [
  { title: "Painel", icon: LayoutDashboard, path: "/" },
  { title: "Leads", icon: Users, path: "/leads" },
  { title: "Pipeline", icon: GitBranch, path: "/pipeline" },
  { title: "Conversas", icon: MessageSquare, path: "/conversas" },
  { title: "Notificações", icon: Bell, path: "/notificacoes" },
  { title: "Vendas", icon: ShoppingCart, path: "/vendas" }, 
  { title: "Marketing", icon: Target, path: "/marketing" },
  { title: "Msgs Rápidas", icon: Zap, path: "/quick-messages" },
  { title: "Cadências", icon: GitMerge, path: "/cadences" },
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
  const { profile, role } = useProfile();
  const { branding } = useBranding();
  const isSuperAdmin = role === 'superadmin';

  const allMenuItems = [
    { title: "Painel", icon: LayoutDashboard, path: "/" },
    { title: "Leads", icon: Users, path: "/leads" },
    { title: "Pipeline", icon: GitBranch, path: "/pipeline" },
    { title: "Conversas", icon: MessageSquare, path: "/conversas" },
    { title: "Notificações", icon: Bell, path: "/notificacoes" },
    { title: "Vendas", icon: ShoppingCart, path: "/vendas" },
    { title: "Marketing", icon: Target, path: "/marketing" },
    { title: "Msgs Rápidas", icon: Zap, path: "/quick-messages" },
    { title: "Cadências", icon: GitMerge, path: "/cadences" },
    { title: "IA", icon: Bot, path: "/ia" },
    { title: "Configurações", icon: Settings, path: "/settings" },
    { title: "Super Admin", icon: ShieldCheck, path: "/super-admin", superadminOnly: true },
  ];

  const menuItems = allMenuItems.filter(item => !item.superadminOnly || isSuperAdmin);

  const getInitials = (name?: string | null) => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const MASTER_ORG_ID = 'aa787cc8-787a-4774-bd80-ffbf78c0cf5f';
  
  const handleBackToMaster = async () => {
    const originalOrgId = localStorage.getItem('original_master_org_id') || MASTER_ORG_ID;
    if (!user) return;

    try {
      const { error } = await supabase
        .from('perfis')
        .update({ organization_id: originalOrgId as any })
        .eq('id', user.id);

      if (error) throw error;

      localStorage.removeItem('original_master_org_id');
      window.location.href = '/super-admin';
    } catch (err: any) {
      console.error('Erro ao voltar para conta master:', err);
    }
  };

  const isImpersonating = !!localStorage.getItem('original_master_org_id') || (isSuperAdmin && profile?.organization_id !== MASTER_ORG_ID);

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-sidebar">
        {/* Logo & Toggle */}
        <div className={`flex items-center transition-all h-20 flex-shrink-0 ${isCollapsed ? 'px-2 justify-center' : 'px-4'}`}>
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
            {/* Logo Icon */}
            <Avatar className={`h-10 w-10 border-2 border-sidebar-primary/20 transition-all duration-300 flex-shrink-0 ${isCollapsed ? 'mx-auto' : ''}`}>
                {branding?.logo_url ? (
                  <AvatarImage src={branding.logo_url} className="object-contain p-0.5" />
                ) : (
                  <AvatarImage src="" />
                )}
                <AvatarFallback className="bg-sidebar-primary text-sidebar-background font-serif">
                  {(branding?.brand_name || 'C').charAt(0).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            
          <div className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'flex-1 min-w-0 opacity-100 overflow-hidden'}`}>
              <h1 className="text-[11px] font-bold text-sidebar-foreground uppercase tracking-normal font-serif leading-none mb-0.5 truncate" title={branding?.brand_name || 'CRM'}>
                {branding?.brand_name || 'CRM'}
              </h1>
              <p className="text-[9px] text-sidebar-primary tracking-wide uppercase font-medium truncate" title={branding?.tagline || 'Gestão Inteligente'}>
                {branding?.tagline || 'Gestão Inteligente'}
              </p>
            </div>
          </div>
          
          {toggleCollapse && !isCollapsed && (
            <Button variant="ghost" size="icon" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ml-1 h-8 w-8 flex-shrink-0" onClick={toggleCollapse}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        {/* Toggle Button for Collapsed State */}
        {toggleCollapse && isCollapsed && (
          <div className="flex justify-center pb-2">
             <Button variant="ghost" size="icon" className="text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 h-8 w-8" onClick={toggleCollapse}>
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </Button>
          </div>
        )}

        {/* Menu Items */}
        <nav className={`flex-1 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-sidebar-accent/20 scrollbar-track-transparent ${isCollapsed ? 'p-2' : 'p-3'}`}>
          {menuItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path) && (item.path !== '/' || location.pathname === '/');
            const Icon = item.icon;
            
            const linkClasses = `flex items-center gap-3 py-2.5 rounded-lg transition-all ${
              isCollapsed 
                ? 'justify-center px-2' 
                : 'px-3'
            } ${
              isActive 
                ? 'bg-sidebar-accent text-sidebar-primary font-medium border-l-2 border-sidebar-primary' 
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/30 hover:text-sidebar-foreground'
            }`;

            return isCollapsed ? (
              <Tooltip key={item.path} delayDuration={0}>
                <TooltipTrigger asChild>
                  <Link to={item.path} className={linkClasses}>
                    <Icon className="h-5 w-5 flex-shrink-0" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.title}</TooltipContent>
              </Tooltip>
            ) : (
              <Link key={item.path} to={item.path} className={linkClasses}>
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate text-sm">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className={`${isCollapsed ? 'p-2' : 'p-4'} border-t border-sidebar-border flex-shrink-0 space-y-2`}>
          {isImpersonating && (
            <Button 
              variant="default" 
              className={`w-full h-9 bg-primary hover:bg-primary/90 text-white shadow-lg animate-pulse ${isCollapsed ? 'justify-center px-0' : 'justify-start px-3'}`}
              onClick={handleBackToMaster}
              title={isCollapsed ? "Sair do Modo Cliente" : undefined}
            >
              <ShieldCheck className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && <span className="ml-2 text-[10px] font-bold uppercase tracking-wider">Sair do Cliente</span>}
            </Button>
          )}

          <div className={`flex items-center gap-3 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <Avatar className="h-9 w-9 flex-shrink-0 border border-sidebar-border">
              <AvatarImage src={profile?.url_avatar || ''} />
              <AvatarFallback className="bg-sidebar-accent text-sidebar-primary font-serif text-xs">
                {getInitials(profile?.nome_completo)}
              </AvatarFallback>
            </Avatar>
            <div className={`flex-1 overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-full opacity-100'}`}>
              <p className="text-sm font-medium text-sidebar-foreground truncate" title={profile?.nome_completo || 'Usuário'}>
                {profile?.nome_completo || 'Colaborador'}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate" title={user?.email || ''}>
                {user?.email}
              </p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            className={`w-full h-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
            onClick={signOut}
            title={isCollapsed ? "Sair" : undefined}
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className={`ml-2 text-xs whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 overflow-hidden' : 'w-auto opacity-100'}`}>Sair</span>
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}