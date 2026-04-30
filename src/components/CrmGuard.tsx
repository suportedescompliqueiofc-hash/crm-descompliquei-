import { Navigate, Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlataforma } from '@/contexts/PlataformaContext';
import { SemAcessoCRM } from './SemAcessoCRM';

export function CrmGuard({ children }: { children?: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { acesso, isContextLoading } = usePlataforma();

  // Enquanto auth carrega, mostra spinner mínimo
  if (authLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  // Renderiza imediatamente sem esperar isContextLoading.
  // O estado inicial (ACESSO_TOTAL) permite CRM, então a página aparece instantaneamente.
  // Se depois do carregamento o acesso for negado, bloqueia nesse momento.
  if (!isContextLoading && acesso.acesso_crm === false) return <SemAcessoCRM />;

  return children ? <>{children}</> : <Outlet />;
}
