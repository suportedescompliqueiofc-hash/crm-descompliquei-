// Layout do app de CS — replica o padrão da plataforma do cliente
// (src/App.tsx → AppLayoutInner), NUNCA o padrão do admin-os
// (src/pages/admin-os/AdminLayout.tsx).
//
// Sidebar escura fixa (`bg-sidebar`), header, `main` com `pt-16` e margem
// conforme colapso (`lg:ml-64` / `lg:ml-20`), conteúdo com `p-4 sm:p-6`.
//
// DECISÃO — NÃO replicamos o UPDATE forçado de organização que o
// AdminLayout.tsx faz ao entrar em `/admin/*`:
//
//   supabase.from('perfis').update({ organization_id: MASTER_ORG_ID }).eq('id', user.id)
//
// Motivo: `perfis.organization_id` é uma coluna compartilhada pela MESMA
// conta (jghf5554@gmail.com) em TODOS os pontos de entrada — app do
// cliente, admin-os e agora o CS —, mesmo a sessão sendo "por origem"
// (cookies/localStorage isolados por subdomínio). Se o app de CS forçasse
// esse UPDATE toda vez que fosse aberto, ele mutaria silenciosamente a
// mesma linha de `perfis` usada pelo app principal em outra aba — inclusive
// no meio de uma impersonação de cliente ("Acessar CRM"), derrubando essa
// sessão sem aviso. Além disso, as funções SECURITY DEFINER de CS
// (`get_cs_clients`, `get_cs_crm_metrics` etc. — ver CLAUDE.md de
// 05-operacoes-e-cs) já decidem o acesso multi-clínica checando o PAPEL do
// usuário (superadmin / platform_admins), não o `organization_id` da sessão.
// Portanto o app de CS não precisa e não deve depender de estar "preso" na
// org master para funcionar — ele nunca consulta `leads`/`vendas`/
// `agendamentos` diretamente, só via essas funções.
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { CsSidebarContent } from './CsSidebar';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { cn } from '@/lib/utils';

const PAGE_TITLES: Record<string, string> = {
  '/': 'Carteira',
  '/semana': 'Semana',
  '/agenda': 'Agenda',
};

export default function CsLayout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('cs-sidebar-collapsed', false);
  const location = useLocation();

  const currentTitle =
    PAGE_TITLES[location.pathname] ??
    (location.pathname.startsWith('/cliente/') ? 'Cliente' : location.pathname.startsWith('/plano/') ? 'Plano do mês' : 'CS');

  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
      {/* SIDEBAR — desktop fixa */}
      <div className="hidden lg:block relative">
        <div className={`fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}>
          <CsSidebarContent
            isCollapsed={isSidebarCollapsed}
            toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          />
        </div>
      </div>

      {/* SIDEBAR — mobile (Sheet) */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-r-0">
          <CsSidebarContent />
        </SheetContent>
      </Sheet>

      {/* HEADER */}
      <header
        className={cn(
          'fixed right-0 top-0 h-16 bg-background z-40 transition-all duration-300 border-b border-border/60',
          isSidebarCollapsed ? 'left-0 lg:left-20' : 'left-0 lg:left-64',
        )}
      >
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {currentTitle}
            </span>
          </div>
        </div>
      </header>

      <main
        className={cn(
          'flex-1 flex flex-col transition-all duration-300 pt-16',
          isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64',
        )}
      >
        <div className="w-full max-w-full overflow-x-hidden flex-1 p-4 sm:p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
