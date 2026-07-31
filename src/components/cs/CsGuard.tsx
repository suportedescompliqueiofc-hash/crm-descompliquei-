// Guard de acesso do app de CS (cs.descompliqueiofc.com).
//
// A checagem de "é interno?" é feita por `useIsInternalUser` (ver
// src/hooks/cs/useIsInternalUser.ts) e é DELIBERADAMENTE independente de
// `perfis.organization_id` — o dono da plataforma pode estar com uma
// organização de cliente aberta (impersonação via "Acessar CRM" no CRM,
// numa aba diferente) e isso não pode barrar o acesso ao CS. A checagem usa
// as funções SECURITY DEFINER `is_super_admin()`/`is_admin()`, que leem
// `auth.uid()` direto, sem depender de qual org está ativa no perfil.
//
// Diferença deliberada em relação ao AdminGuard: aqui, quando o usuário está
// autenticado mas não é interno, NÃO fazemos navigate() para nenhuma rota —
// o app de CS não tem `/plataforma` nem `/crm` neste bundle (são do outro
// ponto de entrada, noutro domínio). Em vez disso mostramos um estado de
// "acesso restrito" com opção de sair.
//
// "Não sei" ≠ "não autorizado": se a verificação falhar (rede, permissão),
// mostramos uma tela de erro com "Tentar novamente" — nunca tratamos erro
// como acesso negado silenciosamente (foi isso que escondeu o bug original).
//
// Sem sessão: NUNCA usar `window.location.href` — é navegação dura, sai do
// bundle do CS e pede a rota ao servidor. Em dev o Vite responde com o
// `index.html` padrão (app do cliente), então o usuário cairia na
// plataforma do cliente em vez do login do CS. `<Navigate>` do próprio
// router resolve para `/login` (rota real deste bundle, ver App-cs.tsx)
// sem nunca sair do React/SPA.
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsInternalUser } from '@/hooks/cs/useIsInternalUser';
import { Loader2, ShieldAlert, TriangleAlert } from 'lucide-react';

export default function CsGuard() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { status, errorMessage, retry } = useIsInternalUser();

  if (authLoading || (user && status === 'checking')) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#E85D24] animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-sm w-full text-center">
          <div className="p-3 rounded-xl bg-muted/40 mb-4 inline-flex">
            <TriangleAlert className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-foreground font-display">
            Não foi possível verificar seu acesso
          </p>
          <p className="text-[11px] text-muted-foreground/50 mt-1">
            {errorMessage || 'Ocorreu um erro de rede ou permissão ao checar seu acesso.'}
          </p>
          <div className="mt-5 flex items-center justify-center gap-2">
            <button
              onClick={retry}
              className="h-9 rounded-lg text-xs font-semibold bg-foreground text-background hover:bg-foreground/90 px-5"
            >
              Tentar novamente
            </button>
            <button
              onClick={() => signOut()}
              className="h-9 rounded-lg text-xs font-semibold border border-border/60 text-foreground hover:bg-muted/40 px-5"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'denied') {
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
