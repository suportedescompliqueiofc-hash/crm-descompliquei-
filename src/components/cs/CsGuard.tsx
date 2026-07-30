// Guard de acesso do app de CS (cs.descompliqueiofc.com).
// Réplica da lógica de src/pages/admin-os/AdminGuard.tsx: só passa quem é
// `superadmin` (via useProfile) OU tem linha em `platform_admins`.
//
// Diferença deliberada em relação ao AdminGuard: aqui, quando o usuário está
// autenticado mas não é interno, NÃO fazemos navigate() para nenhuma rota —
// o app de CS não tem `/plataforma` nem `/crm` neste bundle (são do outro
// ponto de entrada, noutro domínio). Em vez disso mostramos um estado de
// "acesso restrito" com opção de sair. Ver decisão completa sobre o
// forceUpdate de organização no relatório do agente / comentário em CsLayout.tsx.
import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ShieldAlert } from 'lucide-react';

export default function CsGuard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { role, isLoading: profileLoading } = useProfile();
  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (authLoading || profileLoading) return;

    if (!user) {
      setChecking(false);
      setIsAuthorized(false);
      return;
    }

    if (role === 'superadmin') {
      setIsAuthorized(true);
      setChecking(false);
      return;
    }

    supabase
      .from('platform_admins')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        setIsAuthorized(!error && !!data);
        setChecking(false);
      });
  }, [user, authLoading, profileLoading, role]);

  if (authLoading || profileLoading || checking) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E85D24] animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = '/login';
    return null;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="p-3 rounded-xl bg-muted/40 mb-4 inline-flex">
            <ShieldAlert className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-foreground font-display">Acesso restrito</p>
          <p className="text-[11px] text-muted-foreground/50 mt-1">
            Esta área é exclusiva da equipe interna da Descompliquei.
          </p>
          <button
            onClick={() => signOut()}
            className="mt-5 h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 px-5"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  return <Outlet />;
}
