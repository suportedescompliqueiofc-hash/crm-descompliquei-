import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { BrandingProvider } from "@/contexts/BrandingContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Leads from "./pages/Leads";
import Pipeline from "./pages/Pipeline";
import Marketing from "./pages/Marketing";
import Settings from "./pages/Settings";
import AiSettings from "./pages/AiSettings";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Conversations from "./pages/Conversas";
import Notifications from "./pages/Notifications";
import Vendas from "./pages/Vendas";
import QuickMessagesPage from "./pages/QuickMessagesPage";
import Cadences from "./pages/Cadences";
import SuperAdmin from "./pages/SuperAdmin";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/layout/SidebarContent";
import { useLocalStorage } from "./hooks/use-local-storage";
import { useProfile } from "./hooks/useProfile";
import { cn } from "./lib/utils";

// OTIMIZAÇÃO: Cache global de 5 minutos e desativação de recarregamento em background
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutos de cache em memória
      refetchOnWindowFocus: false, // Previne lentidão ao alternar abas do navegador
      retry: 1, // Limita tentativas falhas para não travar a UI
    },
  },
});

const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('sidebar-collapsed', false);
  const location = useLocation();
  const isConversationsPage = location.pathname.startsWith('/conversas');
  
  // Usar hook para verificar se é superadmin
  const { role, profile } = useProfile();
  const [isReturning, setIsReturning] = useState(false);
  const isSuperAdmin = role === 'superadmin';
  
  // O super admin só está impersonando se a organização atual dele for diferente da master salva
  const originalMasterOrgId = typeof window !== 'undefined' ? localStorage.getItem('original_master_org_id') : null;
  const isImpersonating = !!originalMasterOrgId && originalMasterOrgId !== profile?.organization_id;
  const showBanner = isSuperAdmin && isImpersonating;

  const handleReturnToMaster = async () => {
    try {
      setIsReturning(true);
      
      let originalOrgId = localStorage.getItem('original_master_org_id');
      
      // Fallback: caso a sessão tenha sido iniciada sem passar pelo botão (não salvou no localstorage),
      // localiza a organização master do super admin no banco de dados.
      if (!originalOrgId) {
        const { data: masterOrg } = await supabase
          .from('organizations')
          .select('id')
          .ilike('name', '%Super Admin%')
          .limit(1)
          .maybeSingle();
          
        if (masterOrg?.id) {
          originalOrgId = masterOrg.id;
        }
      }

      if (!originalOrgId || !profile?.id) {
        throw new Error('Não foi possível identificar a organização master. Entre novamente na sua conta.');
      }
      
      const { error } = await supabase
        .from('perfis')
        .update({ organization_id: originalOrgId as any })
        .eq('id', profile.id);
        
      if (error) throw error;
      
      // Limpa a memória para sinalizar que o impersonate acabou
      localStorage.removeItem('original_master_org_id');
      
      toast.success('Sessão restaurada. Retornando ao painel master...');
      setTimeout(() => {
        window.location.href = '/super-admin';
      }, 1000);
      
    } catch (err: any) {
      toast.error('Erro ao retornar: ' + err.message);
      setIsReturning(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden flex flex-col">
      {showBanner && (
        <div className="bg-primary/95 text-primary-foreground text-xs sm:text-sm font-medium py-1.5 px-4 text-center shadow-md z-[60] relative flex items-center justify-center gap-4">
          <span>🛡️ <strong>Acesso Master Ativo</strong> — Atuando na conta do cliente neste CRM.</span>
          <Button 
            variant="secondary" 
            size="sm" 
            className="h-6 text-[10px] px-2 py-0 font-bold uppercase tracking-wider"
            onClick={handleReturnToMaster}
            disabled={isReturning}
          >
            {isReturning ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : 'Voltar para Master'}
          </Button>
        </div>
      )}
      <div className="hidden lg:block relative">
        <Sidebar 
          isCollapsed={isSidebarCollapsed} 
          toggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)} 
        />
      </div>
      
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-[280px] bg-sidebar border-r-0">
          <SidebarContent />
        </SheetContent>
      </Sheet>

      <Header 
        onMenuClick={() => setMobileMenuOpen(true)} 
        isSidebarCollapsed={isSidebarCollapsed}
      />
      <main className={cn(
        "pt-16 transition-all duration-300 flex-1 flex flex-col",
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      )}>
        <div className={cn(
          "w-full max-w-full overflow-x-hidden flex-1",
          !isConversationsPage && "p-4 sm:p-6"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BrandingProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
            <Route path="/leads" element={<ProtectedRoute><AppLayout><Leads /></AppLayout></ProtectedRoute>} />
            <Route path="/pipeline" element={<ProtectedRoute><AppLayout><Pipeline /></AppLayout></ProtectedRoute>} />
            <Route path="/marketing" element={<ProtectedRoute><AppLayout><Marketing /></AppLayout></ProtectedRoute>} />
            <Route path="/quick-messages" element={<ProtectedRoute><AppLayout><QuickMessagesPage /></AppLayout></ProtectedRoute>} />
            <Route path="/cadences" element={<ProtectedRoute><AppLayout><Cadences /></AppLayout></ProtectedRoute>} />
            <Route path="/ia" element={<ProtectedRoute><AppLayout><AiSettings /></AppLayout></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
            <Route path="/conversas" element={<ProtectedRoute><AppLayout><Conversations /></AppLayout></ProtectedRoute>} />
            <Route path="/conversas/:leadId" element={<ProtectedRoute><AppLayout><Conversations /></AppLayout></ProtectedRoute>} />
            <Route path="/notificacoes" element={<ProtectedRoute><AppLayout><Notifications /></AppLayout></ProtectedRoute>} />
            <Route path="/vendas" element={<ProtectedRoute><AppLayout><Vendas /></AppLayout></ProtectedRoute>} />
            <Route path="/super-admin" element={<ProtectedRoute><AppLayout><SuperAdmin /></AppLayout></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </BrandingProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;