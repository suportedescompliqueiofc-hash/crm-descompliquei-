import { LogOut, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationsBell } from "./NotificationsBell";

import { useLocation } from "react-router-dom";
import { usePlataforma } from "@/contexts/PlataformaContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function Header({ onMenuClick, isSidebarCollapsed }: { onMenuClick: () => void; isSidebarCollapsed: boolean }) {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const isPlatformMode = ['/plataforma', '/trilha', '/cerebro', '/ia-comercial', '/sessoes-taticas', '/materiais'].some(path => location.pathname.startsWith(path));
  
  // Conditionally hook into PlataformaContext (prevent error if outside provider)
  let progressPercent = 0;
  let completedModules = 0;
  let totalModules = 0;
  try {
     const platformData = usePlataforma();
     progressPercent = platformData?.progressPercent || 0;
     completedModules = platformData?.completedModules || 0;
     totalModules = platformData?.totalModules || 0;
  } catch (e) {
     // Safe fallback
  }

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  return (
    <header className={`fixed right-0 top-0 h-16 bg-card border-b border-border z-10 transition-all duration-300 ${isSidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64'}`}>
      <div className="h-full px-6 flex items-center justify-between gap-4">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
            <Menu className="h-6 w-6" />
          </Button>
          {/* A barra de pesquisa foi removida daqui */}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <NotificationsBell />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user ? getInitials(user.email || '') : 'U'}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">Minha Conta</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* GLOBAL PLATFORM PROGRESS BAR */}
      {isPlatformMode && (
        <TooltipProvider>
          <Tooltip>
             <TooltipTrigger asChild>
                <div className="absolute bottom-0 left-0 w-full h-[3px] bg-secondary/30 cursor-pointer overflow-hidden group">
                  <div 
                    className="h-full bg-gradient-to-r from-[#E85D24]/80 to-[#E85D24] transition-all duration-1000 ease-out relative"
                    style={{ width: `${progressPercent}%` }}
                  >
                     <div className="absolute top-0 right-0 bottom-0 w-10 bg-white/20 blur-sm translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                  </div>
                </div>
             </TooltipTrigger>
             <TooltipContent className="bg-card text-foreground border-border text-xs font-bold">
               {progressPercent}% concluído — {completedModules} módulos de {totalModules} entregues
             </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </header>
  );
}