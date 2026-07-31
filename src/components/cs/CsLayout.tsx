// Layout do app de CS — barra de topo (CsTopNav) + conteúdo em coluna de
// leitura, nunca a casca de painel administrativo (sidebar fixa escura,
// header separado, margem que cresce/encolhe com o colapso).
//
// Redesign completo (2026-07-30) — ver comentário em CsSidebar.tsx para o
// porquê da mudança de sidebar lateral para barra de topo. Sem estado de
// colapso, sem Sheet mobile: a navegação é três links de texto, não precisa
// de gaveta.
//
// Mantida a mesma decisão de não forçar `perfis.organization_id` para a org
// master (ver comentário original no histórico do arquivo) — só o aviso de
// impersonação mudou de lugar, de badge âmbar num header fixo para uma linha
// de texto discreta no topo do conteúdo.
import { Outlet } from 'react-router-dom';
import { CsTopNav } from './CsSidebar';
import { useProfile } from '@/hooks/useProfile';
import { MASTER_ORG_ID } from '@/lib/constants';

export default function CsLayout() {
  const { profile, isLoading: profileLoading } = useProfile();

  // Aviso não-bloqueante: o perfil está com uma organização de CLIENTE
  // aberta na plataforma (impersonação via "Acessar CRM" numa outra aba), em
  // vez da organização master. Não é erro e não impede o uso do CS — nunca
  // fazemos aqui o UPDATE forçado de organização que o AdminLayout.tsx faz.
  const showImpersonationNotice =
    !profileLoading && !!profile?.organization_id && profile.organization_id !== MASTER_ORG_ID;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <CsTopNav />

      {showImpersonationNotice && (
        <div className="border-b border-border/40 bg-muted/20">
          <div className="max-w-[1100px] mx-auto px-4 sm:px-6 py-1.5">
            <p className="text-[11px] text-muted-foreground/70">
              Há uma organização de cliente aberta na plataforma (impersonação ativa noutra aba).
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 px-4 sm:px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
